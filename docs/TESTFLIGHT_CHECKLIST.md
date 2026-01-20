# TestFlight / App Store Readiness Checklist (v1)

## 1) App Info (App Store Connect)
- **App Name (EN):** Actor Contract Checker
- **App Name (EL):** Contract Checker
- **Subtitle (EL):** Υποστήριξη κατανόησης συμβολαίων για ηθοποιούς
- **Primary Category:** Productivity (or Utilities)
- **Age Rating:** 4+

### Keywords (EL) (comma-separated)
συμβόλαιο, συμφωνητικό, ηθοποιός, διαπραγμάτευση, δικαιώματα εικόνας, διαφήμιση, ταινία, σειρά

## 2) App Description Copy
- Short/Full description lives in: `docs/APP_STORE_DESCRIPTION.md`
- Privacy/Disclaimer lives in: `docs/PRIVACY_AND_DISCLAIMER.md`
- FAQ lives in: `docs/FAQ.md`

## 3) Privacy (App Store “Nutrition Labels”)
**Data Collection:** None  
**Tracking:** No  
**Third-Party Advertising:** No  
**Analytics:** No  
**User Accounts:** No  
**User-Generated Content:** No  
**Payments:** No  
**Location:** Not used  
**Contacts:** Not used  
**Identifiers:** Not used  

Notes:
- The app is designed to avoid storing contract text or personal data.
- No trackers/analytics are used.

## 4) Compliance
### Encryption Export Compliance
- **Likely answer:** No (the app does not implement custom encryption)
- If later adding backend/auth or custom crypto, revisit.

### Legal / Not Legal Advice
- The app provides informational support only and does not replace a lawyer.
- Ensure in-app wording matches `docs/PRIVACY_AND_DISCLAIMER.md`.

## 5) Support / Contact
- **Support URL:** [PLACEHOLDER — e.g. GitHub repo URL or a simple landing page]
- **Contact email:** [PLACEHOLDER]

## 6) Assets (later steps)
- App icon (iOS)
- Splash screen
- 3–5 screenshots for App Store listing (later)

## 7) TestFlight (later steps)
- Bundle identifier set
- Version/build number strategy
- EAS build configured (if using EAS)
