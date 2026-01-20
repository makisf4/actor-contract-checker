import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import { getContractTypeLabel } from '../domain/contractType/contractTypes';
import { shouldWarnUnredactedCompany } from '../utils/privacyValidation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RedactionPreview'>;

export default function RedactionPreviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { redactedText, detectedEntities, originalText, selectedContractCategory } = useAppContext();

  const entityCounts = detectedEntities.reduce((acc, entity) => {
    acc[entity.type] = (acc[entity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleAnalyze = () => {
    // Use proper privacy validation based on entity comparison
    if (shouldWarnUnredactedCompany(originalText, redactedText, detectedEntities)) {
      Alert.alert(
        'Προσοχή',
        'Εντοπίστηκε πιθανή επωνυμία εταιρείας που δεν ανωνυμοποιήθηκε. Ελέγξτε το preview πριν συνεχίσετε.',
        [
          { text: 'Ακύρωση', style: 'cancel' },
          { text: 'Συνέχεια', onPress: () => navigation.navigate('Analyze') },
        ]
      );
    } else {
      navigation.navigate('Analyze');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {selectedContractCategory && (
        <Card style={styles.card}>
          <Card.Content>
            <Chip icon="file-document" style={styles.categoryChip}>
              Τύπος: {getContractTypeLabel(selectedContractCategory)}
            </Chip>
          </Card.Content>
        </Card>
      )}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Εντοπισμένα Στοιχεία ({detectedEntities.length})
          </Text>
          <View style={styles.chipContainer}>
            {Object.entries(entityCounts).map(([type, count]) => {
              const typeLabels: Record<string, string> = {
                PERSON: 'ΠΡΟΣΩΠΟ',
                COMPANY: 'ΕΤΑΙΡΕΙΑ',
                TAX_ID: 'ΑΦΜ',
                ADDRESS: 'ΔΙΕΥΘΥΝΣΗ',
                ADDRESS_NUMBER: 'ΑΡΙΘΜΟΣ_ΔΙΕΥΘΥΝΣΗΣ',
                EMAIL: 'EMAIL',
                PHONE: 'ΤΗΛΕΦΩΝΟ',
                AMOUNT: 'ΠΟΣΟ',
                IBAN: 'IBAN',
              };
              return (
                <Chip key={type} style={styles.chip}>
                  {typeLabels[type] || type}: {count}
                </Chip>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Προεπισκόπηση Ανωνυμοποιημένου Κειμένου
          </Text>
          <Text variant="bodySmall" style={styles.helperText}>
            Τα στοιχεία έχουν αντικατασταθεί με placeholders για λόγους απορρήτου.
          </Text>
          <Text variant="bodyMedium" style={styles.redactedText}>
            {redactedText}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Λεπτομέρειες Στοιχείων
          </Text>
          {Object.entries(entityCounts).map(([type, count]) => {
            // Find first entity of this type for masked example (if needed)
            const firstEntity = detectedEntities.find(e => e.type === type);
            let maskedExample: string | null = null;
            
            // Only show masked example for certain types where it's helpful
            if (firstEntity && (type === 'EMAIL' || type === 'PHONE' || type === 'IBAN' || type === 'TAX_ID' || type === 'COMPANY' || type === 'ADDRESS_NUMBER')) {
              const value = firstEntity.value;
              if (type === 'EMAIL') {
                const [local, domain] = value.split('@');
                maskedExample = `${local.substring(0, 2)}***@${domain ? domain.substring(0, 2) + '***' : '***'}`;
              } else if (type === 'PHONE') {
                maskedExample = `***-***-${value.slice(-4)}`;
              } else if (type === 'IBAN') {
                maskedExample = `****${value.slice(-4)}`;
              } else if (type === 'TAX_ID') {
                maskedExample = `****${value.slice(-3)}`;
              } else if (type === 'COMPANY') {
                // Show first 2-3 characters + XXXXXX placeholder
                const firstChars = value.substring(0, Math.min(3, value.length)).replace(/[«»"']/g, '');
                maskedExample = `${firstChars}***XXXXXX`;
              } else if (type === 'ADDRESS_NUMBER') {
                maskedExample = `XXXXXX`;
              }
            }
            
            const typeLabels: Record<string, string> = {
              PERSON: 'ΠΡΟΣΩΠΟ',
              COMPANY: 'ΕΤΑΙΡΕΙΑ',
              TAX_ID: 'ΑΦΜ',
              ADDRESS: 'ΔΙΕΥΘΥΝΣΗ',
              ADDRESS_NUMBER: 'ΑΡΙΘΜΟΣ_ΔΙΕΥΘΥΝΣΗΣ',
              EMAIL: 'EMAIL',
              PHONE: 'ΤΗΛΕΦΩΝΟ',
              AMOUNT: 'ΠΟΣΟ',
              IBAN: 'IBAN',
            };
            
            return (
              <View key={type} style={styles.entityItem}>
                <Chip style={styles.entityChip}>{typeLabels[type] || type}</Chip>
                <Text variant="bodySmall" style={styles.entityCount}>
                  Αριθμός: {count}
                </Text>
                {maskedExample && (
                  <Text variant="bodySmall" style={styles.maskedExample}>
                    Παράδειγμα: {maskedExample}
                  </Text>
                )}
              </View>
            );
          })}
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleAnalyze}
          style={styles.button}
        >
          Ανάλυση Συμβολαίου
        </Button>
      </View>
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
    marginBottom: 12,
  },
  helperText: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  redactedText: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  entityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  entityChip: {
    minWidth: 100,
  },
  entityCount: {
    flex: 1,
    color: '#666',
    marginLeft: 8,
  },
  maskedExample: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: 10,
    marginLeft: 8,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
});
