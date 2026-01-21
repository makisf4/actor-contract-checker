# Actor Contract Checker

**Privacy-first contract analysis tool for actors & performers**

---

## Description

Actor Contract Checker is a mobile application built with Expo and React Native that helps actors and performers understand and analyze their contracts, focused on film, TV series, and TV commercial agreements.

The app provides human-readable insights into contract terms, highlighting potential risks and areas that may require negotiation. It focuses on actor-specific concerns such as:

- Image and voice rights
- AI usage, digital replicas, and voice cloning
- Exclusivity clauses
- Buyout clauses and reuse without additional compensation
- Cut versions and edits in TV commercials

**Important:** This tool provides informational support and does not replace legal advice from a qualified lawyer or agent.

---

## Core Principles

- **Privacy-first:** All sensitive data is processed locally on the device. Only redacted text with the neutral placeholder `XXXXXX` is sent for analysis.
- **Local redaction:** Entity detection and redaction happen entirely on-device before any network request.
- **Human-readable insights:** Analysis results are presented in clear, professional Greek, avoiding legal jargon.
- **Negotiation tool:** The app helps identify points worth discussing with your lawyer or agent—it does not provide legal advice.

---

## User Flow

1. **Select contract type** from a dropdown menu (film, TV series, TV commercial)
2. **Paste or upload** contract text (supports .txt files; PDF/DOCX with graceful fallback)
3. **Automatic redaction** of sensitive information (names, companies, amounts, etc.) with the neutral placeholder `XXXXXX`
4. **Redaction Preview** showing what will be sent for analysis
5. **Analysis** using AI to generate structured insights
6. **Report** with summary, risk flags, missing clauses, questions to ask, and negotiation suggestions

---

## Supported Contract Types

- Film (Ταινία)
- TV Series (Σειρά)
- TV Commercial (Διαφήμιση)

The app can auto-detect the contract type from keywords, or you can manually select it for improved accuracy (recommended).

---

## Privacy & Security

### Local Processing

All entity detection and redaction happens **locally on your device**. The original contract text never leaves your device.

### Redaction Process

Before any analysis, the app automatically detects and replaces sensitive information with a single neutral placeholder: `XXXXXX`.

This includes names, companies, addresses, amounts, phone numbers, emails, tax IDs, and IBANs.

### Privacy Guarantees

- **Redaction Preview:** You can review exactly what will be sent before proceeding
- **Warning system:** The app warns if it detects potential unredacted company names
- **No storage:** Original contract text is not persisted to disk
- **Audit transparency:** Built-in audit log shows the exact payload sent to the analysis API

### What Gets Sent

Only the redacted text with the neutral placeholder `XXXXXX` is sent to the AI analysis service. Raw entity values (names, emails, amounts, etc.) are **never** transmitted over the network.

---

## Contract Analysis

The analysis report includes:

### Summary of Key Terms

- Contract type
- Parties involved
- Duration and obligations
- Payment terms
- For advertising contracts: deliverables, shooting details, usage rights (media/territory/duration), exclusivity, cutdowns/edits

### Risk Flags

Each risk includes:
- **Severity indicator** (color-only badge: critical, high, medium, low)
- **Category** (e.g., "Image Rights", "AI & Digital Replica", "Exclusivity")
- **Description** in natural Greek
- **"Why it matters"** - One-sentence explanation of practical impact
- **Relevant clause** reference (if applicable)

### Missing Clauses

Suggested protections that are commonly expected for actors, with:
- Importance level
- Reason for inclusion
- "Why it matters" explanation

### Questions to Ask

Questions phrased as the actor can ask the producer, focusing on clarification and negotiation points.

### Negotiation Suggestions

Sample wording for contract modifications, not commands, with rationale for each suggestion.

### Special Focus Areas

The analysis prioritizes:
- **AI & Digital Replicas:** Permission for AI usage, voice cloning, digital doubles
- **Cut Versions / Edits:** Multiple versions, edits, and reuse without separate payment
- **Exclusivity:** Scope (category, brands, geography, time)
- **Buyout Clauses:** Reuse without additional compensation

---

## UX & Mobile Design

### Mobile-First Approach

- **Compact layout:** Optimized for small screens with responsive margins and padding
- **Scrollable dropdowns:** Contract type menu with max height and internal scrolling
- **Fixed-size text input:** Contract text area has fixed height (220-240px) with internal scrolling
- **Keyboard handling:** KeyboardAvoidingView ensures buttons remain visible when keyboard is open
- **Home button:** Consistent navigation to home screen from all pages

### Visual Design

- Clean, minimal UI using React Native Paper
- Color-only severity indicators (no text, accessible labels)
- Scroll indicators and visual cues for scrollable content
- Professional Greek typography throughout

---

## Tech Stack

- **Expo** (~51.0.0) - Development platform
- **React Native** (0.74.5) - Mobile framework
- **TypeScript** - Type safety
- **React Navigation** - Screen navigation
- **React Native Paper** - UI components
- **Zod** - Schema validation for API responses
- **expo-document-picker** - File selection
- **expo-file-system** - Local file reading

### Local Processing

- Custom redaction engine with Greek-specific entity detection
- Contract type detection via keyword scoring
- Privacy validation utilities

---

## What This App Is NOT

- ❌ **Not legal advice:** The app provides informational support only
- ❌ **Not a contract signer:** It does not sign or approve contracts
- ❌ **Not a lawyer replacement:** Always consult with a qualified lawyer or agent
- ❌ **Not a guarantee:** Analysis is based on AI interpretation and may have limitations

---

## Roadmap

### Completed ✅

- Contract type selection (manual + auto-detection)
- Local redaction with a single neutral placeholder (`XXXXXX`)
- Redaction preview with entity details
- AI-powered contract analysis
- Structured report with risk flags and suggestions
- Advertising-specific summary schema
- Privacy audit log (dev mode)
- FAQ section
- App Store privacy statement
- Mobile-optimized UI

### In Progress / Planned

- Enhanced entity detection (more patterns, better accuracy)
- Additional contract type schemas beyond v1 (film/TV series/TV commercial)
- Export analysis report (PDF/text)
- Offline mode improvements
- Performance optimizations

---

## Legal Disclaimer

**This tool provides informational support and does not constitute legal advice.**

The analysis generated by this application is intended to help actors identify points worth attention and discussion with their lawyer or agent. It should not be used as a substitute for professional legal counsel.

Always consult with a qualified lawyer or agent before making decisions about contract terms.

---

## Development

### Setup

```bash
npm install
npm start
```

### Environment Variables

Create a `.env` file (optional, for production):

```
EXPO_PUBLIC_LLM_API_URL=https://YOUR_DOMAIN/api/analyze
```

Notes:
- Το endpoint πρέπει να είναι **δικός σου proxy server**. Τα provider keys κρατιούνται αποκλειστικά server-side.
- Αν το `EXPO_PUBLIC_LLM_API_URL` λείπει/είναι κενό, το app χρησιμοποιεί local mock και δεν κάνει network call.
- Direct provider endpoints (π.χ. `openai.com`) μπλοκάρονται από το client.

### Running

- **iOS:** `npm run ios`
- **Android:** `npm run android`
- **Web:** `npm run web`

---

## License

[Specify license if applicable]

---

## Contact

[Add contact information if applicable]
