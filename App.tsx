import React, { useEffect, useState } from 'react';
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
import { addCredits, consumeCredit, getCredits } from './src/domain/credits/creditsStore';
import { clearLastReport, getLastReport, setLastReport } from './src/domain/report/lastReportStore';

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
  const [isLastReport, setIsLastReport] = useState<boolean>(false);
  const [credits, setCredits] = useState<number>(0);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [lastApiPayload, setLastApiPayload] = useState<string>('');
  const [auditInfo, setAuditInfo] = useState<any>(null);
  const [selectedContractCategory, setSelectedContractCategory] = useState<ContractTypeId | null>(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const [storedCredits, storedReport] = await Promise.all([
        getCredits(),
        getLastReport(),
      ]);
      if (!isMounted) {
        return;
      }
      setCredits(storedCredits);
      if (storedReport) {
        setAnalysisResult(storedReport);
        setIsLastReport(true);
      }
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshCredits = async (): Promise<number> => {
    const storedCredits = await getCredits();
    setCredits(storedCredits);
    return storedCredits;
  };

  const addCreditsLocal = async (n: number): Promise<number> => {
    const updated = await addCredits(n);
    setCredits(updated);
    return updated;
  };

  const consumeCreditLocal = async (): Promise<boolean> => {
    const ok = await consumeCredit();
    await refreshCredits();
    return ok;
  };

  const clearLastReportLocal = async (): Promise<void> => {
    await clearLastReport();
    setIsLastReport(false);
    setAnalysisResult(null);
  };

  const setAnalysisResultWithPersist = (result: AnalysisResponseV1 | null) => {
    setAnalysisResult(result);
    if (result) {
      void setLastReport(result);
      setIsLastReport(false);
    } else {
      void clearLastReport();
      setIsLastReport(false);
    }
  };

  const clearAll = () => {
    setOriginalText('');
    setRedactedText('');
    setDetectedEntities([]);
    setAnalysisResult(null);
    setLastApiPayload('');
    setAuditInfo(null);
    setSelectedContractCategory(null);
    void clearLastReportLocal();
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
          setAnalysisResult: setAnalysisResultWithPersist,
          isLastReport,
          clearLastReport: clearLastReportLocal,
          credits,
          refreshCredits,
          addCredits: addCreditsLocal,
          consumeCredit: consumeCreditLocal,
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
