import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { TextInput, Button, Card, Switch, Text, IconButton, Menu, Chip, TouchableRipple } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import { detectEntities, redactText } from '../utils/redaction';
import { smartSkipPreamble } from '../domain/redaction/smartSkipPreamble';
import { PRIVACY_STATEMENT_GR, FAQ_ITEMS } from '../content/privacy';
import { ALL_CONTRACT_TYPES, getContractTypeLabel } from '../domain/contractType/contractTypes';

// File picker imports with fallback
let DocumentPicker: any;
let FileSystem: any;
try {
  DocumentPicker = require('expo-document-picker');
  FileSystem = require('expo-file-system');
} catch (e) {
  // Graceful fallback if packages not installed
  DocumentPicker = null;
  FileSystem = null;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    originalText,
    setOriginalText,
    setRedactedText,
    setDetectedEntities,
    setDevMode,
    devMode,
    clearAll,
    selectedContractCategory,
    setSelectedContractCategory,
    credits,
    addCredits,
  } = useAppContext();
  const [localText, setLocalText] = useState(originalText);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [faqExpanded, setFaqExpanded] = useState<Record<number, boolean>>({});
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const { width } = useWindowDimensions();
  const isSmall = width < 420;

  const handleContinue = () => {
    setOriginalText(localText);
    const entities = detectEntities(localText);
    setDetectedEntities(entities);
    let redacted = redactText(localText, entities);
    
    // Apply smart preamble skipping (removes identity-heavy preamble)
    const skipResult = smartSkipPreamble(redacted);
    redacted = skipResult.text;
    
    setRedactedText(redacted);
    navigation.navigate('RedactionPreview');
  };

  const handleClear = () => {
    setLocalText('');
    setSelectedFileName(null);
    clearAll();
  };

  const handleFilePick = async () => {
    if (!DocumentPicker || !FileSystem) {
      Alert.alert('Προσοχή', 'Η λειτουργία επιλογής αρχείου δεν είναι διαθέσιμη. Χρησιμοποιήστε αντιγραφή/επικόλληση.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setSelectedFileName(file.name);

      if (file.name.endsWith('.txt')) {
        try {
          const content = await FileSystem.readAsStringAsync(file.uri);
          setLocalText(content);
        } catch (error) {
          Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η ανάγνωση του αρχείου.');
        }
      } else {
        Alert.alert(
          'Προσοχή',
          'Προς το παρόν υποστηρίζεται πλήρως μόνο .txt. Για PDF/DOCX κάντε αντιγραφή/επικόλληση του περιεχομένου.'
        );
      }
    } catch (error) {
      Alert.alert('Σφάλμα', 'Δεν ήταν δυνατή η επιλογή αρχείου.');
    }
  };

  const handleCopyPrivacy = async () => {
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(PRIVACY_STATEMENT_GR);
        Alert.alert('Αντιγράφηκε', 'Το κείμενο αντιγράφηκε στο clipboard.');
      } else {
        // For native, show the text in an alert that can be copied
        Alert.alert('Δήλωση Απορρήτου', PRIVACY_STATEMENT_GR);
      }
    } catch (error) {
      Alert.alert('Πληροφορία', PRIVACY_STATEMENT_GR);
    }
  };

  const toggleFaq = (index: number) => {
    setFaqExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddCredits = (amount: number) => {
    void addCredits(amount);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, isSmall && styles.scrollContentSmall]}
        keyboardShouldPersistTaps="handled"
      >
      <Card style={[styles.card, isSmall && styles.cardSmall]}>
        <Card.Content style={isSmall && styles.cardContentSmall}>
          <Text variant="titleMedium" style={[styles.warning, isSmall && styles.warningSmall]}>
            ⚠️ Σημείωση Απορρήτου: Το κείμενο επεξεργάζεται τοπικά στη συσκευή σας. Μόνο ανωνυμοποιημένο (redacted) κείμενο αποστέλλεται για ανάλυση.
          </Text>
          <Text variant="bodySmall" style={[styles.disclaimer, isSmall && styles.disclaimerSmall]}>
            Αυτό το εργαλείο παρέχει ενημερωτική υποστήριξη. Δεν αντικαθιστά τη συμβουλή δικηγόρου ή ατζέντη.
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.card, isSmall && styles.cardSmall]}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.label}>Τύπος Συμφωνητικού</Text>
          <View style={styles.categorySection}>
            <Menu
              visible={categoryMenuVisible}
              onDismiss={() => setCategoryMenuVisible(false)}
              anchor={
                <Button
                  mode={selectedContractCategory ? "contained" : "outlined"}
                  onPress={() => setCategoryMenuVisible(true)}
                  style={styles.categoryButton}
                  icon={selectedContractCategory ? "check" : "chevron-down"}
                >
                  {selectedContractCategory
                    ? getContractTypeLabel(selectedContractCategory)
                    : "Επιλέξτε τύπο συμφωνητικού"}
                </Button>
              }
              contentStyle={styles.menuContent}
            >
              <View style={styles.menuContainer}>
                {ALL_CONTRACT_TYPES.map((categoryId, index) => {
                  const label = getContractTypeLabel(categoryId);
                  const isSelected = selectedContractCategory === categoryId;
                  return (
                    <TouchableRipple
                      key={categoryId}
                      onPress={() => {
                        setSelectedContractCategory(categoryId);
                        setCategoryMenuVisible(false);
                      }}
                      style={[
                        styles.menuItem,
                        isSelected && styles.menuItemSelected,
                        index === ALL_CONTRACT_TYPES.length - 1 && styles.menuItemLast,
                      ]}
                    >
                      <View style={styles.menuItemRow}>
                        <Text style={styles.menuItemText}>{label}</Text>
                        {isSelected && <Text style={styles.menuItemCheck}>✓</Text>}
                      </View>
                    </TouchableRipple>
                  );
                })}
              </View>
            </Menu>
            {selectedContractCategory && (
              <Chip
                icon="close"
                onClose={() => setSelectedContractCategory(null)}
                style={styles.categoryChip}
              >
                {getContractTypeLabel(selectedContractCategory)}
              </Chip>
            )}
          </View>
          <Text variant="bodySmall" style={styles.creditsText}>
            Διαθέσιμα credits: {credits}
          </Text>
        </Card.Content>
      </Card>

      <Card style={[styles.card, isSmall && styles.cardSmall]}>
        <Card.Content style={isSmall && styles.cardContentSmall}>
          <Text variant="titleLarge" style={[styles.label, isSmall && styles.labelSmall]}>Κείμενο Συμβολαίου</Text>
          <View style={styles.fileSection}>
            <Button
              mode="outlined"
              icon="file-document"
              onPress={handleFilePick}
              style={styles.fileButton}
            >
              Επιλογή Αρχείου
            </Button>
            {selectedFileName && (
              <Text variant="bodySmall" style={styles.fileName}>
                {selectedFileName}
              </Text>
            )}
          </View>
          <View style={styles.textInputWrapper}>
            <TextInput
              mode="outlined"
              multiline={true}
              placeholder="Επικολλήστε το κείμενο συμβολαίου εδώ..."
              value={localText}
              onChangeText={setLocalText}
              style={[styles.textInput, isSmall && styles.textInputSmall]}
              contentStyle={styles.textInputContent}
              scrollEnabled={true}
              textAlignVertical="top"
              underlineColorAndroid="transparent"
              autoCorrect={false}
              {...(Platform.OS === 'android' && { includeFontPadding: false })}
            />
          </View>
        </Card.Content>
      </Card>

      <View style={[styles.buttonContainer, isSmall && styles.buttonContainerSmall]}>
        <Button
          mode="contained"
          onPress={handleContinue}
          disabled={!localText.trim() || !selectedContractCategory}
          style={[styles.button, isSmall && styles.buttonSmall]}
          contentStyle={isSmall && styles.buttonContentSmall}
        >
          Συνέχεια στην Προεπισκόπηση
        </Button>
        <Button
          mode="outlined"
          onPress={handleClear}
          style={[styles.button, isSmall && styles.buttonSmall]}
          contentStyle={isSmall && styles.buttonContentSmall}
        >
          Καθαρισμός
        </Button>
      </View>

      <Card style={[styles.card, isSmall && styles.cardSmall]}>
        <Card.Content style={isSmall && styles.cardContentSmall}>
          <View style={styles.faqHeader}>
            <Text variant="titleMedium">Συχνές Ερωτήσεις (FAQ)</Text>
            <Button
              mode="text"
              compact
              onPress={() => setPrivacyExpanded(!privacyExpanded)}
            >
              {privacyExpanded ? 'Απόκρυψη' : 'Προβολή'}
            </Button>
          </View>
          {privacyExpanded && (
            <View style={styles.faqContent}>
              {FAQ_ITEMS.map((item, index) => (
                <View key={index} style={styles.faqItem}>
                  <Button
                    mode="text"
                    onPress={() => toggleFaq(index)}
                    style={styles.faqQuestion}
                    contentStyle={styles.faqQuestionContent}
                  >
                    <Text style={styles.faqQuestionText}>
                      {faqExpanded[index] ? '▼' : '▶'} {item.question}
                    </Text>
                  </Button>
                  {faqExpanded[index] && (
                    <Text variant="bodySmall" style={styles.faqAnswer}>
                      {item.answer}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.privacyHeader}>
            <Text variant="titleSmall">Δήλωση Απορρήτου (App Store)</Text>
            <IconButton
              icon="content-copy"
              size={20}
              onPress={handleCopyPrivacy}
            />
          </View>
          <Text variant="bodySmall" style={styles.privacyText}>
            {PRIVACY_STATEMENT_GR}
          </Text>
        </Card.Content>
      </Card>

      {__DEV__ && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.devToggle}>
              <Text>DEV Mode</Text>
              <Switch value={devMode} onValueChange={setDevMode} />
            </View>
            {devMode && (
              <>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('DevMode')}
                  style={styles.devButton}
                >
                  View DEV Mode Screen
                </Button>
                <View style={styles.mockCreditsContainer}>
                  <Text variant="bodySmall" style={styles.mockCreditsLabel}>
                    Mock credits (DEV)
                  </Text>
                  <View style={styles.mockCreditsRow}>
                    <Button mode="outlined" onPress={() => handleAddCredits(1)} style={styles.mockCreditButton}>
                      +1 credit (mock)
                    </Button>
                    <Button mode="outlined" onPress={() => handleAddCredits(3)} style={styles.mockCreditButton}>
                      +3 credits (mock)
                    </Button>
                    <Button mode="outlined" onPress={() => handleAddCredits(5)} style={styles.mockCreditButton}>
                      +5 credits (mock)
                    </Button>
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </Card>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scrollContentSmall: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
  },
  cardSmall: {
    marginBottom: 12,
  },
  cardContentSmall: {
    padding: 12,
  },
  warning: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  warningSmall: {
    fontSize: 13,
    marginBottom: 6,
  },
  disclaimer: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  disclaimerSmall: {
    fontSize: 11,
    marginTop: 6,
  },
  label: {
    marginBottom: 12,
  },
  labelSmall: {
    marginBottom: 10,
    fontSize: 18,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryButton: {
    marginBottom: 8,
  },
  categoryChip: {
    marginTop: 8,
  },
  creditsText: {
    color: '#666',
    marginTop: 4,
  },
  menuContent: {
    minHeight: 180,
    padding: 0,
    overflow: 'visible',
  },
  menuContainer: {
    position: 'relative',
    borderRadius: 6,
    paddingVertical: 4,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemSelected: {
    backgroundColor: '#ede7f6',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
    flexWrap: 'wrap',
    color: '#222',
  },
  menuItemCheck: {
    fontSize: 16,
    color: '#6200ee',
    marginLeft: 6,
  },
  fileSection: {
    marginBottom: 12,
  },
  fileButton: {
    marginBottom: 8,
  },
  fileName: {
    color: '#666',
    fontStyle: 'italic',
  },
  textInputWrapper: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  textInput: {
    height: 240,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    textAlignVertical: 'top',
  },
  textInputSmall: {
    height: 220,
    fontSize: 15,
    lineHeight: 21,
  },
  textInputContent: {
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    minHeight: 0,
  },
  buttonContainer: {
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  buttonContainerSmall: {
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  button: {
    marginBottom: 4,
  },
  buttonSmall: {
    marginBottom: 2,
  },
  buttonContentSmall: {
    paddingVertical: 6,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  faqContent: {
    marginTop: 8,
  },
  faqItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  faqQuestion: {
    justifyContent: 'flex-start',
    paddingLeft: 0,
  },
  faqQuestionContent: {
    justifyContent: 'flex-start',
  },
  faqQuestionText: {
    textAlign: 'left',
    color: '#6200ee',
  },
  faqAnswer: {
    paddingLeft: 20,
    paddingTop: 8,
    color: '#666',
    lineHeight: 20,
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  privacyText: {
    color: '#666',
    lineHeight: 20,
  },
  devToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  devButton: {
    marginTop: 8,
  },
  mockCreditsContainer: {
    marginTop: 12,
  },
  mockCreditsLabel: {
    color: '#666',
    marginBottom: 6,
  },
  mockCreditsRow: {
    gap: 8,
  },
  mockCreditButton: {
    alignSelf: 'flex-start',
  },
});
