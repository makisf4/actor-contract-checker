import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import { analyzeContract } from '../utils/llmAdapter';
import { getFinalContractType } from '../domain/contractType/getFinalContractType';
import { schemaForContractType } from '../domain/summary/summarySchemas';
import { ContractTypeId } from '../domain/contractType/contractTypes';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Analyze'>;

export default function AnalyzeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { redactedText, setAnalysisResult, setLastApiPayload, setAuditInfo, selectedContractCategory } = useAppContext();
  const [status, setStatus] = useState<string>('Initializing analysis...');

  useEffect(() => {
    const performAnalysis = async () => {
      try {
        setStatus('Redacting sensitive information...');
        // Redaction already done, but we confirm here
        
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
        setAnalysisResult(result);
        
        setStatus('Complete!');
        setTimeout(() => {
          navigation.navigate('Report');
        }, 500);
      } catch (error) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[Analysis] Validation or API error', error);
        }
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    performAnalysis();
  }, [redactedText, navigation, setAnalysisResult, setLastApiPayload, setAuditInfo]);

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
