# Actor Contract Checker – Cursor Rules

Project: Expo / React Native (TypeScript)

CRITICAL:
- No direct OpenAI / LLM calls from client code
- Use ONLY EXPO_PUBLIC_LLM_API_URL proxy for analysis
- Privacy > UX polish

ARCHITECTURE:
- Keep App.tsx + React Navigation stack
- Keep AppContext shape unless necessary
- Redaction is local and happens before analysis

QUALITY:
- Small targeted fixes
- 1 problem = 1 commit
- Avoid unrelated refactors

SAFETY:
- Do not log secrets or raw PII
- Do not weaken privacy gates or heuristics
