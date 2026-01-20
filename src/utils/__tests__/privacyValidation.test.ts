import { shouldWarnUnredactedCompany } from '../privacyValidation';
import { DetectedEntity } from '../redaction';

describe('shouldWarnUnredactedCompany', () => {
  // Case 1: Should NOT warn - company properly redacted
  it('should NOT warn when company is replaced with placeholder', () => {
    const original = 'CORAL Α.Ε.';
    const redacted = 'XXXXXX Α.Ε.';
    const detectedEntities: DetectedEntity[] = [
      {
        type: 'COMPANY',
        value: 'CORAL',
        startIndex: 0,
        endIndex: 5,
      },
    ];
    
    const result = shouldWarnUnredactedCompany(original, redacted, detectedEntities);
    expect(result).toBe(false);
  });

  // Case 2: Should warn - company not redacted
  it('should warn when company name still exists in redacted text', () => {
    const original = 'CORAL Α.Ε.';
    const redacted = 'CORAL Α.Ε.';
    const detectedEntities: DetectedEntity[] = [
      {
        type: 'COMPANY',
        value: 'CORAL',
        startIndex: 0,
        endIndex: 5,
      },
    ];
    
    const result = shouldWarnUnredactedCompany(original, redacted, detectedEntities);
    expect(result).toBe(true);
  });

  // Case 3: Should NOT warn if only placeholder present
  it('should NOT warn when only placeholder exists and no companies detected', () => {
    const original = 'Some text with XXXXXX';
    const redacted = 'Some text with XXXXXX';
    const detectedEntities: DetectedEntity[] = [];
    
    const result = shouldWarnUnredactedCompany(original, redacted, detectedEntities);
    expect(result).toBe(false);
  });

  // Case 4: Should NOT warn when company is partially redacted but marker remains
  it('should NOT warn when company name is redacted but corporate marker remains', () => {
    const original = '«CORAL ΑΝΩΝΥΜΟΣ ΕΤΑΙΡΕΙΑ» Α.Ε.';
    const redacted = 'XXXXXX Α.Ε.';
    const detectedEntities: DetectedEntity[] = [
      {
        type: 'COMPANY',
        value: '«CORAL ΑΝΩΝΥΜΟΣ ΕΤΑΙΡΕΙΑ»',
        startIndex: 0,
        endIndex: 25,
      },
    ];
    
    const result = shouldWarnUnredactedCompany(original, redacted, detectedEntities);
    expect(result).toBe(false);
  });

  // Case 5: Should warn when company name appears multiple times and one is not redacted
  it('should warn when detected company name still appears in redacted text', () => {
    const original = 'CORAL Α.Ε. and CORAL Productions';
    const redacted = 'XXXXXX Α.Ε. and CORAL Productions';
    const detectedEntities: DetectedEntity[] = [
      {
        type: 'COMPANY',
        value: 'CORAL',
        startIndex: 0,
        endIndex: 5,
      },
      {
        type: 'COMPANY',
        value: 'CORAL',
        startIndex: 18,
        endIndex: 23,
      },
    ];
    
    const result = shouldWarnUnredactedCompany(original, redacted, detectedEntities);
    expect(result).toBe(true);
  });
});
