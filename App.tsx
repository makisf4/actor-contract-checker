import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, Button } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import RedactionPreviewScreen from './src/screens/RedactionPreviewScreen';
import AnalyzeScreen from './src/screens/AnalyzeScreen';
import ReportScreen from './src/screens/ReportScreen';
import DevModeScreen from './src/screens/DevModeScreen';
import { AppContext } from './src/context/AppContext';
import { DetectedEntity } from './src/utils/redaction';
import { ContractTypeId } from './src/domain/contractType/contractTypes';
import { AnalysisResponseV1 } from './src/domain/analysis/analysisSchema';

export type RootStackParamList = {
  Home: undefined;
  RedactionPreview: undefined;
  Analyze: undefined;
  Report: undefined;
  DevMode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [originalText, setOriginalText] = useState<string>('');
  const [redactedText, setRedactedText] = useState<string>('');
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntity[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponseV1 | null>(null);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [lastApiPayload, setLastApiPayload] = useState<string>('');
  const [auditInfo, setAuditInfo] = useState<any>(null);
  const [selectedContractCategory, setSelectedContractCategory] = useState<ContractTypeId | null>(null);

  const clearAll = () => {
    setOriginalText('');
    setRedactedText('');
    setDetectedEntities([]);
    setAnalysisResult(null);
    setLastApiPayload('');
    setAuditInfo(null);
    setSelectedContractCategory(null);
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AppContext.Provider
        value={{
          originalText,
          setOriginalText,
          redactedText,
          setRedactedText,
          detectedEntities,
          setDetectedEntities,
          analysisResult,
          setAnalysisResult,
          devMode,
          setDevMode,
          lastApiPayload,
          setLastApiPayload,
          auditInfo,
          setAuditInfo,
          selectedContractCategory,
          setSelectedContractCategory,
          clearAll,
        }}
        >
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={({ navigation }) => ({
                headerStyle: {
                  backgroundColor: '#6200ee',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerRight: () => (
                  <Button
                    mode="text"
                    textColor="#fff"
                    onPress={() => navigation.navigate('Home')}
                    style={{ marginRight: 8 }}
                  >
                    Αρχική
                  </Button>
                ),
              })}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ 
                  title: 'Contract Checker',
                  headerRight: undefined,
                }}
              />
              <Stack.Screen
                name="RedactionPreview"
                component={RedactionPreviewScreen}
                options={{ title: 'Redaction Preview' }}
              />
              <Stack.Screen
                name="Analyze"
                component={AnalyzeScreen}
                options={{ title: 'Analyzing...' }}
              />
              <Stack.Screen
                name="Report"
                component={ReportScreen}
                options={{ title: 'Analysis Report' }}
              />
              <Stack.Screen
                name="DevMode"
                component={DevModeScreen}
                options={{ title: 'DEV Mode' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </AppContext.Provider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
