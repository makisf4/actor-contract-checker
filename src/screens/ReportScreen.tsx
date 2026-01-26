import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import type { Severity } from '../domain/analysis/analysisSchema';
import { CONTRACT_PROFILES } from '../domain/profiles/contractProfiles';
import { getRiskTitle } from '../domain/risks/riskMetadata';
import type { RiskId } from '../domain/risks/riskMetadata';
import { postProcessRisks } from '../domain/risks/riskPostProcess';
import { ContractTypeId, coerceContractTypeId, getContractTypeLabel } from '../domain/contractType/contractTypes';
import { toGreekAllCaps } from '../utils/greekText';
import { saveReportPdf } from '../utils/reportPdf';

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

const toSentenceCase = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  let formatted = trimmed.toLocaleLowerCase('el-GR');
  formatted = formatted.replace(/\bai\b/gi, 'AI');
  formatted = formatted.replace(/\btvc\b/gi, 'TVC');
  formatted = formatted.replace(/\btv\b/gi, 'TV');
  formatted = formatted.replace(/\bvod\b/gi, 'VOD');
  return formatted.charAt(0).toLocaleUpperCase('el-GR') + formatted.slice(1);
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

type RiskFlag = {
  id: RiskId;
  severity: Severity;
  why?: string;
  clauseRef?: string;
};

function addFallbackCoreRisks(risks: RiskFlag[], processedText: string): RiskFlag[] {
  const textUpper = processedText.toUpperCase();
  if (!textUpper) {
    return risks;
  }

  const hasExclusivityEvidence = /ΑΠΟΚΛΕΙΣΤ/.test(textUpper)
    || /ΑΝΤΑΓΩΝΙΣΤ/.test(textUpper)
    || /ΜΗ\s+ΣΥΜΜΕΤΑΣΧ/.test(textUpper);

  const hasTerminationEvidence = /ΛΥΣΗ\s+ΤΗΣ\s+ΣΥΜΒΑΣΗΣ/.test(textUpper)
    || /ΚΑΤΑΓΓΕΛ/.test(textUpper)
    || /ΑΝΩΤΕΡΑ\s+ΒΙΑ/.test(textUpper)
    || /ΧΩΡΙΣ\s+ΠΕΡΑΙΤΕΡΩ\s+ΑΞΙΩΣ/.test(textUpper);

  const existingIds = new Set(risks.map(risk => risk.id));
  const next = [...risks];

  if (hasExclusivityEvidence && !existingIds.has('exclusivity')) {
    next.push({
      id: 'exclusivity',
      severity: 'moderate',
      why: 'Υπάρχει ρητή αναφορά σε περιορισμό συμμετοχής σε ανταγωνιστική κατηγορία.',
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Risk Fallback] Added', { id: 'exclusivity' });
    }
  }

  if (hasTerminationEvidence && !existingIds.has('termination')) {
    next.push({
      id: 'termination',
      severity: 'moderate',
      why: 'Υπάρχει αναφορά σε λύση/ανωτέρα βία χωρίς περαιτέρω αξιώσεις.',
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[Risk Fallback] Added', { id: 'termination' });
    }
  }

  return next;
}

export default function ReportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { analysisResult, clearAll, auditInfo, selectedContractCategory, redactedText, isLastReport } = useAppContext();
  
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  
  const contractTypeId = coerceContractTypeId(
    analysisResult?.contractTypeId || selectedContractCategory
  );
  const profile = CONTRACT_PROFILES[contractTypeId];
  const contractTypeLabel = getContractTypeLabel(contractTypeId);
  const allowedRiskIds = new Set(profile.allowedRiskIds);

  const summaryRecord = (analysisResult?.summary || {}) as Record<string, string | null>;
  const summaryFields = profile.summaryFields.filter(field => field.showFor.includes(contractTypeId));

  const filteredRiskFlags = (analysisResult?.riskFlags || []).filter((flag: RiskFlag) =>
    allowedRiskIds.has(flag.id)
  );

  const riskFlagsWithFallback = addFallbackCoreRisks(filteredRiskFlags, redactedText || '');

  const processedRiskFlags = postProcessRisks({
    contractTypeId,
    processedText: redactedText,
    risks: riskFlagsWithFallback.map((flag: RiskFlag) => ({
      id: flag.id,
      severity: flag.severity,
      title: getRiskTitle(flag.id),
      why: flag.why,
      clauseRef: flag.clauseRef,
    })),
  });

  const MISSING_TEXT_VALUE = 'Δεν προκύπτει από το κείμενο';
  const MISSING_TEXT_DISPLAY = 'Δεν εντοπίστηκε σαφής αναφορά στο κείμενο';
  const missingSummaryFieldIds = summaryFields
    .map(field => field.id)
    .filter((fieldId) => {
      const value = summaryRecord[fieldId];
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length === 0 || trimmed === MISSING_TEXT_VALUE;
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
    .filter((item): item is { id: string; title: string; why: string; ask: string; riskId?: RiskId } => item !== null)
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
  const hasRiskFlags = processedRiskFlags.length > 0;
  const hasMissingClauses = missingClausesFromSummary.length > 0;

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

  const onSaveReport = async () => {
    if (!analysisResult) {
      Alert.alert('Δεν υπάρχει αναφορά', 'Δεν υπάρχει διαθέσιμη ανάλυση για αποθήκευση.');
      return;
    }

    if (isSavingPdf) {
      return;
    }

    setIsSavingPdf(true);
    try {
      await saveReportPdf({
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
      Alert.alert('Έτοιμο', 'Η αναφορά αποθηκεύτηκε.');
    } catch (error) {
      Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η αποθήκευση της αναφοράς.');
    } finally {
      setIsSavingPdf(false);
    }
  };

  const renderSummary = () => {
    const getSummaryValue = (fieldId: string): string => {
      const value = summaryRecord[fieldId];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
      return MISSING_TEXT_DISPLAY;
    };

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            {toGreekAllCaps('Περίληψη Βασικών Όρων')}
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
      {isLastReport && (
        <Text variant="bodySmall" style={styles.lastReportNote}>
          Τελευταία Ανάλυση (προσωρινή)
        </Text>
      )}
      {renderSummary()}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            {toGreekAllCaps('Σημεία Προσοχής')}
          </Text>
          {hasRiskFlags ? (
            processedRiskFlags.map((flag, idx) => (
              <View key={idx} style={styles.riskItem}>
                <View style={styles.riskHeader}>
                  <SeverityBadge severity={flag.severity} />
                  <Text variant="titleMedium" style={styles.riskCategoryTitle}>
                    {toSentenceCase(flag.title || getRiskTitle(flag.id))}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.riskDescription}>
                  {flag.why || MISSING_TEXT_DISPLAY}
                </Text>
                {flag.clauseRef && (
                  <Text variant="bodyMedium" style={styles.clauseText}>
                    Ρήτρα: {flag.clauseRef}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text variant="bodySmall" style={styles.emptyStateText}>
              Δεν εντοπίστηκαν σημεία που να απαιτούν προσοχή με βάση το παρόν κείμενο.
            </Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            {toGreekAllCaps('Σημεία προς διευκρίνιση')}
          </Text>
          <Text variant="bodySmall" style={styles.sectionHelper}>
            Όροι που δεν εντοπίστηκαν στο κείμενο και ενδέχεται να χρειάζονται διευκρίνιση.
          </Text>
          {hasMissingClauses ? (
            missingClausesFromSummary.map((missing, idx) => (
              <View key={idx} style={styles.missingItem}>
                <Text variant="titleMedium" style={styles.missingClauseTitle}>
                  {toSentenceCase(missing.title)}
                </Text>
                <Text variant="bodySmall" style={styles.whyItMatters}>
                  {missing.why}
                </Text>
                <Text variant="bodySmall" style={styles.clauseText}>
                  Τι να ζητήσεις: {missing.ask}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="bodySmall" style={styles.emptyStateText}>
              Δεν προέκυψαν σημεία προς διευκρίνιση με βάση το παρόν κείμενο.
            </Text>
          )}
        </Card.Content>
      </Card>

      {analysisResult.questions.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {toGreekAllCaps('Ερωτήσεις προς Υποβολή')}
            </Text>
            {analysisResult.questions.map((question, idx) => (
              <Text key={idx} variant="bodyMedium" style={styles.questionItem}>
                • Τι να ζητήσεις: {question}
              </Text>
            ))}
          </Card.Content>
        </Card>
      )}

      {analysisResult.negotiation.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {toGreekAllCaps('Προτάσεις προς Διαπραγμάτευση')}
            </Text>
            {analysisResult.negotiation.map((suggestion, idx) => (
              <View key={idx} style={styles.suggestionItem}>
                <Text variant="titleMedium" style={styles.suggestionIssue}>
                  {toSentenceCase(suggestion.title)}
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
                  <Text variant="labelSmall">Πρόταση:</Text>
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
        <View style={styles.copyActionContainer}>
          <Button
            mode="contained"
            onPress={onSaveReport}
            loading={isSavingPdf}
            disabled={isSavingPdf}
          >
            Αποθήκευση Αναφοράς (PDF)
          </Button>
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
    marginTop: 10,
    marginBottom: 14,
    fontSize: 23,
  },
  sectionHelper: {
    color: '#444',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  lastReportNote: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  emptyStateText: {
    color: '#444',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
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
    marginBottom: 6,
  },
  riskCategoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  severityBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  riskDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#444',
    marginTop: 4,
    marginBottom: 8,
  },
  whyItMatters: {
    color: '#444',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 6,
    marginBottom: 6,
    lineHeight: 18,
  },
  clauseText: {
    color: '#444',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 6,
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
    fontWeight: '700',
    marginBottom: 4,
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
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
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
    marginTop: 4,
    marginBottom: 16,
  },
  copyActionContainer: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
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
