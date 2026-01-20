/**
 * Sanity check tests for smartSkipPreamble
 * 
 * These are minimal tests to verify the basic functionality.
 * Run manually or with a test runner.
 */

import { smartSkipPreamble } from '../smartSkipPreamble';

// Declare __DEV__ for TypeScript
declare const __DEV__: boolean | undefined;

// Test case 1: Contract with preamble then terms heading
export function testCase1(): boolean {
  const contract = `ΣΥΜΒΑΛΛΟΜΕΝΑ ΜΕΡΗ
Εταιρεία: XXXXXXXXXX
Διεύθυνση: XXXXXXXXXX
Κρήτης, Ηλιούπολη

Άρθρο 1 – ΑΝΤΙΚΕΙΜΕΝΟ
Το αντικείμενο της παρούσας συμβάσεως είναι...

Άρθρο 2 – ΔΙΑΡΚΕΙΑ
Η διάρκεια είναι 12 μήνες.`;

  const result = smartSkipPreamble(contract);
  
  // Should skip preamble and start from "Άρθρο 1 – ΑΝΤΙΚΕΙΜΕΝΟ"
  const expected = result.skipped === true && 
                   result.startReason?.includes('ΑΝΤΙΚΕΙΜΕΝΟ') &&
                   result.text.includes('Άρθρο 1 – ΑΝΤΙΚΕΙΜΕΝΟ') &&
                   !result.text.includes('ΣΥΜΒΑΛΛΟΜΕΝΑ ΜΕΡΗ') &&
                   !result.text.includes('Κρήτης');
  
  if (__DEV__) {
    console.log('[Test 1]', {
      passed: expected,
      skipped: result.skipped,
      reason: result.startReason,
      firstLine: result.text.split('\n')[0],
    });
  }
  
  return expected;
}

// Test case 2: Contract without headings but with semantic anchor
export function testCase2(): boolean {
  const contract = `ΙΔΙΩΤΙΚΟ ΣΥΜΦΩΝΗΤΙΚΟ

Οι συμβαλλόμενοι συμφωνούν και συνομολογούν:

Η αμοιβή είναι XXXXXXXXXX
Η διάρκεια είναι 6 μήνες.`;

  const result = smartSkipPreamble(contract);
  
  // Should skip preamble and start from semantic anchor or "Η αμοιβή"
  const expected = result.skipped === true && 
                   (result.text.includes('Η αμοιβή') || result.text.includes('συμφωνούν')) &&
                   !result.text.includes('ΙΔΙΩΤΙΚΟ ΣΥΜΦΩΝΗΤΙΚΟ');
  
  if (__DEV__) {
    console.log('[Test 2]', {
      passed: expected,
      skipped: result.skipped,
      reason: result.startReason,
      firstLine: result.text.split('\n')[0],
    });
  }
  
  return expected;
}

// Test case 3: Contract without reliable anchor (should not skip)
export function testCase3(): boolean {
  const contract = `Some text without headings or anchors.
This should not be skipped.`;

  const result = smartSkipPreamble(contract);
  
  // Should NOT skip (no reliable anchor found)
  const expected = result.skipped === false && 
                   result.text === contract;
  
  if (__DEV__) {
    console.log('[Test 3]', {
      passed: expected,
      skipped: result.skipped,
    });
  }
  
  return expected;
}

// Run all tests if in dev mode
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('=== Smart Preamble Skip Tests ===');
  testCase1();
  testCase2();
  testCase3();
}
