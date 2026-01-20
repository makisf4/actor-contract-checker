import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import { CONTRACT_PROFILES } from '../domain/profiles/contractProfiles';
import { exportReportText } from '../domain/report/exportReportText';
import { getRiskTitle } from '../domain/risks/riskMetadata';
import { postProcessRisks } from '../domain/risks/riskPostProcess';
import { ContractTypeId, coerceContractTypeId, getContractTypeLabel } from '../domain/contractType/contractTypes';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Report'>;

const severityColors: Record<string, string> = {
  moderate: '#fbc02d',
  important: '#ff9800',
  critical: '#d32f2f',
};

const severityLabels: Record<string, string> = {
  moderate: 'Μέτριο',
  important: 'Σημαντικό',
  critical: 'Κρίσιμο',
};

// Helper function to get severity label in Greek
const getSeverityLabel = (severity: string): string => {
  return severityLabels[severity] || severity;
};

// Color-only severity badge component
const SeverityBadge = ({ severity }: { severity: string }) => {
  const color = severityColors[severity] || '#666';
  const label = getSeverityLabel(severity);
  
  const handlePress = () => {
    Alert.alert('Επικινδυνότητα', label);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessible={true}
      accessibilityLabel={`Επικινδυνότητα: ${label}`}
      accessibilityHint="Δείκτης επικινδυνότητας"
      accessibilityRole="image"
    >
      <View
        style={[
          styles.severityBadge,
          { backgroundColor: color },
        ]}
      />
    </Pressable>
  );
};

export default function ReportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { analysisResult, clearAll, auditInfo, selectedContractCategory, redactedText } = useAppContext();
  
  const [auditExpanded, setAuditExpanded] = useState(false);
  
  const contractTypeId = coerceContractTypeId(
    analysisResult?.contractTypeId || selectedContractCategory
  );
  const profile = CONTRACT_PROFILES[contractTypeId];
  const contractTypeLabel = getContractTypeLabel(contractTypeId);
  const allowedRiskIds = new Set(profile.allowedRiskIds);

  const summaryRecord = (analysisResult?.summary || {}) as Record<string, string | null>;
  const summaryFields = profile.summaryFields.filter(field => field.showFor.includes(contractTypeId));

  const filteredRiskFlags = (analysisResult?.riskFlags || []).filter((flag: any) =>
    allowedRiskIds.has(flag.id)
  );

  const processedRiskFlags = postProcessRisks({
    contractTypeId,
    processedText: redactedText,
    risks: filteredRiskFlags.map((flag: any) => ({
      id: flag.id,
      severity: flag.severity,
      title: getRiskTitle(flag.id),
      why: flag.why,
      clauseRef: flag.clauseRef,
    })),
  });

  const MISSING_TEXT = 'Δεν προκύπτει από το κείμενο';
  const missingSummaryFieldIds = summaryFields
    .map(field => field.id)
    .filter((fieldId) => {
      const value = summaryRecord[fieldId];
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length === 0 || trimmed === MISSING_TEXT;
      }
      return true;
    });

  const normalizeTitle = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u0370-\u03FF\u1F00-\u1FFF]+/g, ' ')
      .trim();

  const riskSeverityById = new Map<string, string>();
  const riskSeverityByTitle = new Map<string, string>();

  processedRiskFlags.forEach((flag: any) => {
    if (flag?.id) {
      riskSeverityById.set(flag.id, flag.severity);
    }
    const titleKey = normalizeTitle(flag.title || getRiskTitle(flag.id));
    if (titleKey) {
      const existing = riskSeverityByTitle.get(titleKey);
      if (!existing) {
        riskSeverityByTitle.set(titleKey, flag.severity);
      } else if (existing !== 'critical' && flag.severity === 'critical') {
        riskSeverityByTitle.set(titleKey, flag.severity);
      } else if (existing === 'moderate' && flag.severity === 'important') {
        riskSeverityByTitle.set(titleKey, flag.severity);
      }
    }
  });

  const missingClausesFromSummary = missingSummaryFieldIds
    .map((fieldId) => {
      const entry = profile.missingClausesMap[fieldId];
      if (!entry) {
        return null;
      }
      return { id: fieldId, ...entry };
    })
    .filter((item): item is { id: string; title: string; why: string; ask: string; riskId?: string } => !!item)
    .filter((item) => {
      if (item.riskId && riskSeverityById.has(item.riskId)) {
        return false;
      }
      const titleKey = normalizeTitle(item.title);
      if (!titleKey) {
        return true;
      }
      const severity = riskSeverityByTitle.get(titleKey);
      if (severity) {
        // Prefer keeping the risk flag for important/critical overlaps
        return false;
      }
      return true;
    })
    .filter((item, index, arr) => {
      const titleKey = normalizeTitle(item.title);
      return arr.findIndex(other => normalizeTitle(other.title) === titleKey) === index;
    });

  if (!analysisResult) {
    return (
      <View style={styles.container}>
        <Text>Δεν υπάρχει διαθέσιμο αποτέλεσμα ανάλυσης</Text>
      </View>
    );
  }

  const handleStartOver = () => {
    clearAll();
    navigation.navigate('Home');
  };

  const onCopyReport = async () => {
    if (!analysisResult) {
      Alert.alert('Δεν υπάρχει αναφορά', 'Δεν υπάρχει διαθέσιμη ανάλυση για αντιγραφή.');
      return;
    }

    const text = exportReportText({
      contractTypeLabel,
      summary: summaryRecord,
      summaryFieldOrder: summaryFields.map(field => ({ id: field.id, label: field.label })),
      riskFlags: processedRiskFlags.map((flag: any) => ({
        title: flag.title || getRiskTitle(flag.id),
        severity: flag.severity,
        why: flag.why,
        clauseRef: flag.clauseRef,
      })),
      missingClauses: missingClausesFromSummary.map(missing => ({
        title: missing.title,
        why: missing.why,
        ask: missing.ask,
      })),
      questions: analysisResult.questions || [],
      negotiation: (analysisResult.negotiation || []).map(item => ({
        title: item.title,
        why: item.why,
        proposed: item.proposed,
      })),
    });

    await Clipboard.setStringAsync(text);
    Alert.alert('Έτοιμο', 'Η αναφορά αντιγράφηκε στο πρόχειρο.');
  };

  const renderSummary = () => {
    const getSummaryValue = (fieldId: string): string => {
      const value = summaryRecord[fieldId];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
      return MISSING_TEXT;
    };

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Περίληψη Βασικών Όρων
          </Text>
          <Chip icon="file-document" style={styles.categoryChip}>
            Τύπος: {getContractTypeLabel(contractTypeId)}
          </Chip>
          {summaryFields.map((field) => (
            <View key={field.id} style={styles.summaryItem}>
              <Text variant="labelMedium">{field.label}:</Text>
              <Text variant="bodyMedium">{getSummaryValue(field.id)}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {renderSummary()}

      {processedRiskFlags.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Σημεία Προσοχής
            </Text>
            {processedRiskFlags.map((flag, idx) => (
              <View key={idx} style={styles.riskItem}>
                <View style={styles.riskHeader}>
                  <SeverityBadge severity={flag.severity} />
                  <Text variant="titleMedium" style={styles.riskCategoryTitle}>{flag.title || getRiskTitle(flag.id)}</Text>
                </View>
                <Text variant="bodyMedium" style={styles.riskDescription}>
                  {flag.why || 'Δεν προκύπτει από το κείμενο'}
                </Text>
                {flag.clauseRef && (
                  <Text variant="bodyMedium" style={styles.clauseText}>
                    Ρήτρα: {flag.clauseRef}
                  </Text>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {missingClausesFromSummary.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Ρήτρες που Απουσιάζουν
            </Text>
            {missingClausesFromSummary.map((missing, idx) => (
              <View key={idx} style={styles.missingItem}>
                <Text variant="titleMedium" style={styles.missingClauseTitle}>{missing.title}</Text>
                <Text variant="bodySmall" style={styles.whyItMatters}>
                  {missing.why}
                </Text>
                <Text variant="bodySmall" style={styles.clauseText}>
                  Πρόταση: {missing.ask}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {analysisResult.questions.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Ερωτήσεις προς Υποβολή
            </Text>
            {analysisResult.questions.map((question, idx) => (
              <Text key={idx} variant="bodyMedium" style={styles.questionItem}>
                • {question}
              </Text>
            ))}
          </Card.Content>
        </Card>
      )}

      {analysisResult.negotiation.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Προτάσεις προς Διαπραγμάτευση
            </Text>
            {analysisResult.negotiation.map((suggestion, idx) => (
              <View key={idx} style={styles.suggestionItem}>
                <Text variant="titleMedium" style={styles.suggestionIssue}>
                  {suggestion.title}
                </Text>
                {suggestion.current && (
                  <View style={styles.wordingBox}>
                    <Text variant="labelSmall">Τρέχουσα:</Text>
                    <Text variant="bodySmall" style={styles.wordingText}>
                      {suggestion.current}
                    </Text>
                  </View>
                )}
                <View style={styles.wordingBox}>
                  <Text variant="labelSmall">Γιατί:</Text>
                  <Text variant="bodySmall" style={styles.wordingText}>
                    {suggestion.why}
                  </Text>
                </View>
                <View style={[styles.wordingBox, styles.suggestedBox]}>
                  <Text variant="labelSmall">Προτεινόμενη:</Text>
                  <Text variant="bodySmall" style={styles.wordingText}>
                    {suggestion.proposed}
                  </Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {analysisResult ? (
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Pressable
            onPress={onCopyReport}
            style={{
              paddingVertical: 12,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              Αντιγραφή Αναφοράς
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={handleStartOver} style={styles.button}>
          Νέη Ανάλυση
        </Button>
      </View>

      {auditInfo && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.auditHeader}>
              <Text variant="titleSmall" style={styles.auditTitle}>
                Έλεγχος Αποστολής (Audit Log)
              </Text>
              <Button
                mode="text"
                compact
                onPress={() => setAuditExpanded(!auditExpanded)}
                style={styles.auditToggle}
              >
                {auditExpanded ? 'Απόκρυψη' : 'Προβολή'}
              </Button>
            </View>
            {auditExpanded && (
              <View style={styles.auditContent}>
                <Text variant="bodySmall" style={styles.auditInfo}>
                  Ημερομηνία: {new Date(auditInfo.timestamp).toLocaleString('el-GR')}
                </Text>
                <Text variant="bodySmall" style={styles.auditInfo}>
                  Πάροχος: {auditInfo.endpoint}
                </Text>
                <Text variant="bodySmall" style={styles.auditInfo}>
                  Μοντέλο: {auditInfo.model}
                </Text>
                <Text variant="bodySmall" style={styles.auditNote}>
                  Περιλαμβάνει μόνο ανωνυμοποιημένο/αποπροσωποποιημένο κείμενο (redacted).
                </Text>
                <View style={styles.jsonContainer}>
                  <Text variant="bodySmall" style={styles.jsonText}>
                    {auditInfo.payload}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.aboutTitle}>
            Σχετικά με αυτή την ανάλυση
          </Text>
          <Text variant="bodySmall" style={styles.aboutText}>
            Το εργαλείο παρέχει ενημερωτική υποστήριξη. Δεν αποτελεί νομική συμβουλή.
          </Text>
          <Text variant="bodySmall" style={styles.aboutText}>
            Στόχος είναι ο εντοπισμός σημείων που αξίζει να εξεταστούν και να συζητηθούν 
            με τον δικηγόρο ή τον ατζέντη σας.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  summaryItem: {
    marginBottom: 12,
  },
  bulletPoint: {
    marginLeft: 8,
    marginTop: 4,
  },
  riskItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  riskCategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  severityBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  riskDescription: {
    marginBottom: 8,
  },
  whyItMatters: {
    color: '#555',
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 18,
  },
  clauseText: {
    color: '#555',
    fontStyle: 'italic',
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  missingItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  missingClauseTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  questionItem: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  suggestionItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  suggestionIssue: {
    marginBottom: 12,
    color: '#6200ee',
  },
  wordingBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  suggestedBox: {
    backgroundColor: '#e8f5e9',
  },
  wordingText: {
    fontFamily: 'monospace',
    marginTop: 4,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 8,
  },
  aboutTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  aboutText: {
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  auditTitle: {
    fontWeight: '600',
  },
  auditToggle: {
    marginLeft: 'auto',
  },
  auditContent: {
    marginTop: 12,
  },
  auditInfo: {
    color: '#666',
    marginBottom: 4,
  },
  auditNote: {
    color: '#d32f2f',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 12,
  },
  jsonContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    maxHeight: 300,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#333',
  },
});
