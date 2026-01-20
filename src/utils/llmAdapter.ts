import { ContractTypeId, getContractTypeLabel } from '../domain/contractType/contractTypes';
import { CONTRACT_PROFILES } from '../domain/profiles/contractProfiles';
import { AnalysisResponseV1, validateAnalysisResponse } from '../domain/analysis/analysisSchema';
import { buildStrictSummary } from '../domain/summary/strictSummary';

const API_KEY = process.env.EXPO_PUBLIC_LLM_API_KEY || '';
const API_URL = process.env.EXPO_PUBLIC_LLM_API_URL || 'https://api.openai.com/v1/chat/completions';

/**
 * PRIVACY GUARANTEE:
 * This function receives ONLY redacted text (with placeholders like XXXXXX).
 * Original text with raw sensitive values is NEVER passed to this function.
 * The redactedText parameter contains ONLY placeholders - no raw entity values.
 * 
 * @param redactedText - Text with placeholders ONLY (e.g., "XXXXXX at XXXXXX")
 * @param onPayloadReady - Optional callback to expose the API payload for DEV mode verification
 * @param onAuditInfo - Optional callback to store audit information
 * @returns Structured analysis of the contract
 */
export async function analyzeContract(
  redactedText: string,
  contractType: ContractTypeId = 'film',
  onPayloadReady?: (payload: string) => void,
  onAuditInfo?: (info: { timestamp: string; endpoint: string; model: string; payload: string }) => void
): Promise<AnalysisResponseV1> {
  if (!API_KEY) {
    // Return mock data for development
    const mock = getMockResponse(contractType);
    const validated = validateAnalysisResponse(mock, contractType);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    return {
      ...validated.value,
      summary: buildStrictSummary(contractType, validated.value.summary, redactedText),
    };
  }

  const prompt = buildProfiledPrompt(redactedText, contractType);

  const systemMessage = 'Είσαι επαγγελματικός σύμβουλος που βοηθάει ηθοποιούς να αναλύουν συμβόλαια. Πάντα απαντάς ΣΤΑ ΕΛΛΗΝΙΚΑ με συμβουλευτικό τόνο. Χρησιμοποίησε φράσεις όπως "Αξίζει να διευκρινιστεί", "Θα μπορούσε να εξεταστεί", "Ίσως είναι σκόπιμο". Ποτέ μην λες "θα πρέπει να υπογράψεις" ή "αυτό είναι παράνομο". Πάντα απαντάς με έγκυρο JSON μόνο, χωρίς markdown formatting.';

  try {
    // PRIVACY: This payload contains ONLY redacted text with placeholders
    // Raw entity values (names, emails, addresses, etc.) are NEVER in this payload
    const payload = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: prompt, // Contains ONLY redacted text with XXXXXX placeholders
        },
      ],
      temperature: 0.3,
    };
    
    const bodyCompact = JSON.stringify(payload); // Compact for API request
    const bodyPretty = JSON.stringify(payload, null, 2); // Pretty-printed for audit log
    
    // Store audit information
    const auditInfo = {
      timestamp: new Date().toISOString(),
      endpoint: API_URL.includes('openai') ? 'OpenAI' : 'LLM Provider',
      model: payload.model,
      payload: bodyPretty, // Pretty-printed for readability
    };
    
    if (onAuditInfo) {
      onAuditInfo(auditInfo);
    }
    
    // Expose payload for DEV mode verification (proves only placeholders are sent)
    if (onPayloadReady) {
      onPayloadReady(bodyPretty);
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: bodyCompact, // Send compact version
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const validated = validateAnalysisResponse(parsed, contractType);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    return {
      ...validated.value,
      summary: buildStrictSummary(contractType, validated.value.summary, redactedText),
    };
  } catch (error) {
    console.error('LLM API error:', error);
    throw error;
  }
}

function buildProfiledPrompt(redactedText: string, contractType: ContractTypeId): string {
  const profile = CONTRACT_PROFILES[contractType];
  const summaryFields = profile.summaryFields.filter(field => field.showFor.includes(contractType));
  const summaryList = summaryFields
    .map(field => `- ${field.id}: ${field.label} — ${field.extractorHint}`)
    .join('\n');
  const allowedRiskIds = profile.allowedRiskIds.join(', ');
  const contractTypeLabel = getContractTypeLabel(contractType);

  return `Είσαι επαγγελματικός σύμβουλος που βοηθάει έναν ηθοποιό να αναλύσει συμβόλαιο.

Τύπος συμβολαίου (contractTypeId): ${contractType}
Ετικέτα τύπου: ${contractTypeLabel}

ΚΑΝΟΝΑΣ: ΜΗΝ κάνεις εικασίες. Αν κάτι δεν προκύπτει από το κείμενο, βάλε null.

Περίληψη (summary) — χρησιμοποίησε ακριβώς τα παρακάτω ids:
${summaryList}

Allowed risk ids (μόνο από αυτά): ${allowedRiskIds}

Σημεία Προσοχής (riskFlags):
- Μόνο ids από τη λίστα allowed risk ids.
- severity: critical | important | moderate
- why: σύντομη αιτιολόγηση (1–2 προτάσεις)
- clauseRef (προαιρετικό): αναφορά σε ρήτρα αν υπάρχει

Ρήτρες που Απουσιάζουν (missingClauses):
- Μόνο ids από τη λίστα allowed risk ids.

ΕΠΙΣΤΡΟΦΗ:
- ΜΟΝΟ έγκυρο JSON (ΧΩΡΙΣ markdown, χωρίς κείμενο εκτός JSON)
- version: "v1"
- contractTypeId: ΠΡΕΠΕΙ να είναι ακριβώς "${contractType}"
- Αν δεν είσαι σίγουρος για id, ΜΗΝ το συμπεριλάβεις

Παράδωσε έγκυρο JSON (ΧΩΡΙΣ markdown):
{
  "version": "v1",
  "contractTypeId": "${contractType}",
  "summary": { "<fieldId>": "string | null", ... },
  "riskFlags": [
    { "id": "riskId", "severity": "critical|important|moderate", "why": "string (optional)", "clauseRef": "string (optional)" }
  ],
  "missingClauses": [
    { "id": "riskId" }
  ],
  "questions": ["string"],
  "negotiation": [
    { "title": "string", "current": "string (optional)", "proposed": "string", "why": "string" }
  ]
}

Κείμενο συμβολαίου (με αφαιρεμένη ευαίσθητη πληροφορία):
${redactedText}`;
}

function buildEmptySummary(contractType: ContractTypeId): Record<string, string | null> {
  const profile = CONTRACT_PROFILES[contractType];
  const summary: Record<string, string | null> = {};
  profile.summaryFields.forEach(field => {
    if (field.showFor.includes(contractType)) {
      summary[field.id] = null;
    }
  });
  return summary;
}

function getMockResponse(contractType: ContractTypeId = 'film'): AnalysisResponseV1 {
  const summary = buildEmptySummary(contractType);

  if (contractType === 'ad') {
    return {
      version: 'v1',
      contractTypeId: contractType,
      summary,
      riskFlags: [
        {
          id: 'cut_versions_reuse',
          severity: 'important',
          why: 'Δεν υπάρχει σαφής πρόβλεψη για πρόσθετη αμοιβή σε cutdowns ή edits.',
          clauseRef: 'Ρήτρα 4.2',
        },
        {
          id: 'ai_digital_double',
          severity: 'moderate',
          why: 'Η χρήση AI/ψηφιακού αντιγράφου δεν ορίζεται ξεκάθαρα.',
        },
      ],
      missingClauses: [
        { id: 'buyout' },
      ],
      questions: [],
      negotiation: [],
    };
  }

  if (contractType === 'series') {
    return {
      version: 'v1',
      contractTypeId: contractType,
      summary,
      riskFlags: [
        {
          id: 'image_rights',
          severity: 'important',
          why: 'Η διάρκεια χρήσης εικόνας/φωνής δεν ορίζεται με σαφήνεια.',
        },
      ],
      missingClauses: [
        { id: 'ai_digital_double' },
      ],
      questions: [],
      negotiation: [],
    };
  }

  return {
    version: 'v1',
    contractTypeId: contractType,
    summary,
    riskFlags: [
      {
        id: 'image_rights',
        severity: 'critical',
        why: 'Δεν αποσαφηνίζεται η διάρκεια χρήσης εικόνας/φωνής.',
        clauseRef: 'Ρήτρα 3.1',
      },
    ],
    missingClauses: [
      { id: 'reputation_moral' },
    ],
    questions: [],
    negotiation: [],
  };
}
