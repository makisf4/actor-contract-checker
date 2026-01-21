import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Chip, Portal, Dialog } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import { getContractTypeLabel } from '../domain/contractType/contractTypes';
import { detectMultiContractLikelihood } from '../domain/analysis/multiContractHeuristics';
import { shouldWarnUnredactedCompany } from '../utils/privacyValidation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RedactionPreview'>;

export default function RedactionPreviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    redactedText,
    detectedEntities,
    originalText,
    selectedContractCategory,
    credits,
    consumeCredit,
    clearLastReport,
  } = useAppContext();

  const [showPaywall, setShowPaywall] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMultiWarning, setShowMultiWarning] = useState(false);
  const [multiReasons, setMultiReasons] = useState<string[]>([]);

  const MAX_CHARACTERS = 25000;
  const MULTI_CONTRACT_THRESHOLD = 0.7;

  const entityCounts = detectedEntities.reduce((acc, entity) => {
    acc[entity.type] = (acc[entity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const startConfirmationFlow = () => {
    const multiCheck = detectMultiContractLikelihood(redactedText || originalText);
    if (multiCheck.score >= MULTI_CONTRACT_THRESHOLD) {
      setMultiReasons(multiCheck.reasons);
      setShowMultiWarning(true);
      return;
    }
    setShowConfirm(true);
  };

  const handleAnalyze = () => {
    if (originalText.length > MAX_CHARACTERS) {
      Alert.alert(
        'Όριο χαρακτήρων',
        'Το κείμενο υπερβαίνει το όριο των 25.000 χαρακτήρων. Παρακαλώ ελέγξτε ένα συμβόλαιο τη φορά.'
      );
      return;
    }

    if (credits <= 0) {
      setShowPaywall(true);
      return;
    }

    if (shouldWarnUnredactedCompany(originalText, redactedText, detectedEntities)) {
      Alert.alert(
        'Προσοχή',
        'Εντοπίστηκε πιθανή επωνυμία εταιρείας που δεν ανωνυμοποιήθηκε. Ελέγξτε το preview πριν συνεχίσετε.',
        [
          { text: 'Ακύρωση', style: 'cancel' },
          { text: 'Συνέχεια', onPress: startConfirmationFlow },
        ]
      );
      return;
    }

    startConfirmationFlow();
  };

  const handleConfirm = async () => {
    const ok = await consumeCredit();
    if (!ok) {
      setShowConfirm(false);
      setShowPaywall(true);
      return;
    }
    setShowConfirm(false);
    await clearLastReport();
    navigation.navigate('Analyze');
  };

  const handleWarningContinue = () => {
    setShowMultiWarning(false);
    setShowConfirm(true);
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
        <Text variant="bodySmall" style={styles.creditsText}>
          Διαθέσιμα credits: {credits}
        </Text>
        <Button
          mode="contained"
          onPress={handleAnalyze}
          style={styles.button}
        >
          Ανάλυση Συμβολαίου
        </Button>
      </View>

      <Portal>
        <Dialog visible={showPaywall} onDismiss={() => setShowPaywall(false)}>
          <Dialog.Title>Credits</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall">
              Δεν υπάρχουν διαθέσιμα credits αυτή τη στιγμή.
            </Text>
            <Text variant="bodySmall" style={styles.modalHelper}>
              Η αγορά credits δεν υποστηρίζεται σε αυτή την έκδοση.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaywall(false)}>Κλείσιμο</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showMultiWarning} onDismiss={() => setShowMultiWarning(false)}>
          <Dialog.Title>Πιθανή πολλαπλή σύμβαση</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall">
              Φαίνεται ότι το κείμενο περιέχει περισσότερες από μία συμβάσεις. Η ανάλυση μπορεί να είναι λιγότερο σαφής.
            </Text>
            {multiReasons.length > 0 && (
              <Text variant="bodySmall" style={styles.modalHelper}>
                Ενδείξεις: {multiReasons.join(' • ')}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowMultiWarning(false)}>Επιστροφή</Button>
            <Button onPress={handleWarningContinue}>Συνέχεια όπως είναι</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showConfirm} onDismiss={() => setShowConfirm(false)}>
          <Dialog.Title>Επιβεβαίωση</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall">Η ανάλυση θα καταναλώσει 1 credit.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirm(false)}>Άκυρο</Button>
            <Button onPress={handleConfirm}>Συνέχεια</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  creditsText: {
    color: '#666',
    marginBottom: 8,
  },
  modalHelper: {
    color: '#666',
    marginTop: 8,
  },
  button: {
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
});
