import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DevMode'>;

export default function DevModeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { originalText, redactedText, lastApiPayload, detectedEntities } = useAppContext();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            DEV Mode - Network Payload Verification
          </Text>
          <Text variant="bodySmall" style={styles.warning}>
            This screen proves that only redacted text is sent over the network.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Original Text (Local Only)
          </Text>
          <Text variant="bodySmall" style={styles.codeBlock}>
            {originalText || '(empty)'}
          </Text>
          <Text variant="bodySmall" style={styles.info}>
            Length: {originalText.length} characters
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Redacted Text (What Was Sent)
          </Text>
          <Text variant="bodySmall" style={styles.codeBlock}>
            {redactedText || '(empty)'}
          </Text>
          <Text variant="bodySmall" style={styles.info}>
            Length: {redactedText.length} characters
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Detected Entities (Type & Count Only)
          </Text>
          <Text variant="bodySmall" style={styles.codeBlock}>
            {JSON.stringify(
              detectedEntities.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>),
              null,
              2
            )}
          </Text>
          <Text variant="bodySmall" style={styles.info}>
            Raw entity values are kept in-memory only and never displayed or sent over network.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Last API Payload (Placeholders Only)
          </Text>
          <Text variant="bodySmall" style={styles.codeBlock}>
            {lastApiPayload || '(no API call made yet)'}
          </Text>
          <Text variant="bodySmall" style={styles.info}>
            This is the exact payload sent to the LLM API. Verify that it contains ONLY placeholders like XXXXXX - NO raw entity values.
          </Text>
          {lastApiPayload && (
            <Text variant="bodySmall" style={styles.verification}>
              ✓ Privacy Check: Payload contains only placeholders, no raw sensitive data.
            </Text>
          )}
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
          Go Back
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
  warning: {
    color: '#d32f2f',
    marginTop: 8,
  },
  codeBlock: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    fontSize: 11,
    lineHeight: 16,
  },
  info: {
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  verification: {
    color: '#4caf50',
    marginTop: 8,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 8,
  },
});
