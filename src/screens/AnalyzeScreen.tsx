import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, InteractionManager } from 'react-native';
import { Text, ActivityIndicator, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import { analyzeContract } from '../utils/llmAdapter';
import { hasAnyUnredactedEntities, detectSuspiciousUnredactedPatterns, hasUnredactedResiduals } from '../utils/privacyValidation';
import { getFinalContractType } from '../domain/contractType/getFinalContractType';
import { schemaForContractType } from '../domain/summary/summarySchemas';
import { ContractTypeId } from '../domain/contractType/contractTypes';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Analyze'>;

export default function AnalyzeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    redactedText,
    originalText,
    detectedEntities,
    setAnalysisResult,
    setLastApiPayload,
    setAuditInfo,
    selectedContractCategory,
  } = useAppContext();
  const [status, setStatus] = useState<string>('Initializing analysis...');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const performAnalysis = async () => {
      if (inFlightRef.current) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[ANALYZE] Skipped duplicate run');
        }
        return;
      }
      inFlightRef.current = true;
      setIsAnalyzing(true);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[ANALYZE] start', {
          textLength: redactedText.length,
          hasSelection: !!selectedContractCategory,
        });
      }
      try {
        setStatus('Redacting sensitive information...');
        // Redaction already done, but we confirm here
        
        // PRIVACY GUARDRAIL: Never send text if redaction is not 100% safe
        const entitiesGate = hasAnyUnredactedEntities(originalText, redactedText, detectedEntities);
        const suspiciousGate = detectSuspiciousUnredactedPatterns(redactedText);
        const residualsGate = hasUnredactedResiduals(originalText, redactedText);
        const shouldBlock = !entitiesGate.ok || !suspiciousGate.ok || !residualsGate.ok;
        if (shouldBlock) {
          const reasonLabels = new Set<string>();
          const typeToReason = (type: string) => {
            switch (type) {
              case 'PERSON':
                return 'ΠΙΘΑΝΟ ΟΝΟΜΑ';
              case 'COMPANY':
                return 'ΠΙΘΑΝΗ ΕΤΑΙΡΕΙΑ';
              case 'EMAIL':
              case 'PHONE':
              case 'IBAN':
                return 'ΠΙΘΑΝΟ EMAIL/IBAN/ΤΗΛΕΦΩΝΟ';
              case 'TAX_ID':
                return 'ΠΙΘΑΝΟ ΑΦΜ';
              case 'ADDRESS':
              case 'ADDRESS_NUMBER':
                return 'ΠΙΘΑΝΗ ΔΙΕΥΘΥΝΣΗ';
              default:
                return 'ΛΟΙΠΑ ΣΤΟΙΧΕΙΑ';
            }
          };

          entitiesGate.offendingTypes.forEach(type => reasonLabels.add(typeToReason(type)));
          suspiciousGate.reasons.forEach(reason => reasonLabels.add(reason));
          residualsGate.reasons.forEach(reason => reasonLabels.add(reason));

          const reasonList = Array.from(reasonLabels).slice(0, 2);
          const reasonText = reasonList.length
            ? `\n\nΤΥΠΟΙ: ${reasonList.join(', ')}`
            : '';

          setLastApiPayload('');
          setAuditInfo(null);
          setStatus('Η ανάλυση μπλοκαρίστηκε για λόγους απορρήτου.');
          Alert.alert(
            'ΠΡΟΣΟΧΗ',
            `ΕΝΤΟΠΙΣΤΗΚΑΝ ΠΙΘΑΝΑ ΣΤΟΙΧΕΙΑ ΠΟΥ ΔΕΝ ΕΧΟΥΝ ΑΝΩΝΥΜΟΠΟΙΗΘΕΙ ΠΛΗΡΩΣ. ΕΛΕΓΞΤΕ ΤΟ ΚΕΙΜΕΝΟ ΚΑΙ ΑΝΤΙΚΑΤΑΣΤΗΣΤΕ ΜΕ XXXXXX ΠΡΙΝ ΣΥΝΕΧΙΣΕΤΕ.${reasonText}`
          );
          return;
        }

        setStatus('Sending redacted text to analysis API...');
        
        // PRIVACY: Payload will be set by analyzeContract callback
        // This ensures we capture the exact payload sent to API

        setStatus('Analyzing contract structure...');
        // Determine contract type from user selection or auto-detection
        const typeInfo = getFinalContractType(
          selectedContractCategory as ContractTypeId | null,
          redactedText
        );
        
        const summarySchema = schemaForContractType(typeInfo.finalType);
        
        // Dev logging
        if (__DEV__) {
          console.log('[Contract Type Detection]', {
            userSelected: selectedContractCategory,
            detected: typeInfo.detectedType,
            final: typeInfo.finalType,
            confidence: typeInfo.confidence.toFixed(2),
            schema: summarySchema,
            shouldSuggestSwitch: typeInfo.shouldSuggestSwitch,
            evidence: typeInfo.evidence.matchedSignals,
          });
        }
        
        const result = await analyzeContract(
          redactedText,
          typeInfo.finalType,
          (payload) => {
            // DEV mode: Store the exact API payload for verification
            setLastApiPayload(payload);
          },
          (auditInfo) => {
            // Store audit information for transparency
            setAuditInfo(auditInfo);
          }
        );
        
        setStatus('Processing results...');
        if (!isMounted) {
          return;
        }
        setAnalysisResult(result);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[ANALYZE] success (result ready)', {
            hasResult: !!result,
          });
        }
        
        setStatus('Complete!');
        InteractionManager.runAfterInteractions(() => {
          if (!isMounted) {
            return;
          }
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.log('[ANALYZE] navigate to Report');
          }
          navigation.replace('Report');
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[Analysis] Validation or API error', error);
        }
        setStatus('Δεν ήταν δυνατή η ολοκλήρωση της ανάλυσης.');
        Alert.alert('Σφάλμα ανάλυσης', 'Η ανάλυση δεν ολοκληρώθηκε. Παρακαλώ δοκιμάστε ξανά.');
      } finally {
        if (!isMounted) {
          return;
        }
        setIsAnalyzing(false);
        inFlightRef.current = false;
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.log('[ANALYZE] finally (loading false)', { isAnalyzing: false });
        }
      }
    };

    performAnalysis();
    return () => {
      isMounted = false;
    };
  }, [
    redactedText,
    originalText,
    detectedEntities,
    navigation,
    selectedContractCategory,
    setAnalysisResult,
    setLastApiPayload,
    setAuditInfo,
  ]);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <ActivityIndicator size="large" style={styles.spinner} />
          <Text variant="titleMedium" style={styles.statusText}>
            {status}
          </Text>
          <Text variant="bodySmall" style={styles.infoText}>
            Only redacted text is being sent. Original document remains on your device.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  card: {
    padding: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  statusText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  infoText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});
