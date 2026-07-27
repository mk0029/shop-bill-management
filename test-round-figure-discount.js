//!/usr/bin/env node

// Test round figure discount logic
const BILL_EPSILON = 0.01;

function calculateRoundFigureDiscount({originalRemaining, paymentAmount}) {
  const roundedDownAmount = Math.floor(originalRemaining);
  const difference = roundedDownAmount - paymentAmount;
  
  const result = {
    shouldApply: false,
    discountAmount: 0,
    originalRemaining,
    paymentAmount,
    finalPaidAmount: paymentAmount,
    finalRemaining: originalRemaining,
    isFullyPaid: false,
  };
  
  if (difference > 0 && difference <= 5) {
    result.shouldApply = true;
    result.discountAmount = difference;
    result.finalPaidAmount = roundedDownAmount;
    result.finalRemaining = 0;
    result.isFullyPaid = true;
  } else if (difference <= 0) {
    result.finalPaidAmount = Math.min(paymentAmount, originalRemaining);
    result.finalRemaining = Math.max(0, originalRemaining - result.finalPaidAmount);
    result.isFullyPaid = result.finalRemaining <= BILL_EPSILON;
  } else {
    result.finalPaidAmount = paymentAmount;
    result.finalRemaining = originalRemaining - paymentAmount;
    result.isFullyPaid = result.finalRemaining <= BILL_EPSILON;
  }
  
  return result;
}

function calculatePaymentValidation({grandTotal, alreadyPaid, discountAmount, paymentAmount}) {
  const originalRemaining = Math.max(0, grandTotal - alreadyPaid);
  const payableAfterDiscount = Math.max(0, originalRemaining - discountAmount);
  const totalSettlement = paymentAmount + discountAmount;
  const remainingAfterPayment = Math.max(0, originalRemaining - totalSettlement);

  const discountTooHigh = discountAmount > originalRemaining + BILL_EPSILON;
  const paymentTooHigh = paymentAmount > payableAfterDiscount + BILL_EPSILON;
  const invalidAmount = paymentAmount < 0 || discountAmount < 0;
  const hasValidationError = invalidAmount || discountTooHigh || paymentTooHigh;
  const billStatus = remainingAfterPayment <= BILL_EPSILON ? 'paid' : 'partial';

  return {
    originalRemaining,
    payableAfterDiscount,
    totalSettlement,
    remainingAfterPayment,
    discountTooHigh,
    paymentTooHigh,
    invalidAmount,
    hasValidationError,
    billStatus,
  };
}

function calculatePaymentWithRoundFigureDiscount({grandTotal, alreadyPaid, discountAmount, paymentAmount}) {
  const validation = calculatePaymentValidation({
    grandTotal,
    alreadyPaid,
    discountAmount,
    paymentAmount,
  });
  
  const roundFigureDiscount = calculateRoundFigureDiscount({
    originalRemaining: validation.originalRemaining,
    paymentAmount,
  });
  
  return { validation, roundFigureDiscount };
}

console.log('=== Round Figure Discount Logic Tests ===\n');

// Test 1: Bill amount ₹74, user pays ₹70 (difference = 4, should apply)
console.log('Test 1: Bill amount ₹74, user pays ₹70');
const result1 = calculatePaymentWithRoundFigureDiscount({
  grandTotal: 74,
  alreadyPaid: 0,
  discountAmount: 0,
  paymentAmount: 70,
});
console.log('  Round figure discount should apply:', result1.roundFigureDiscount.shouldApply);
console.log('  Discount amount:', result1.roundFigureDiscount.discountAmount);
console.log('  Final paid amount:', result1.roundFigureDiscount.finalPaidAmount);
console.log('  Final remaining:', result1.roundFigureDiscount.finalRemaining);
console.log('  Is fully paid:', result1.roundFigureDiscount.isFullyPaid);
const test1Pass = result1.roundFigureDiscount.shouldApply && result1.roundFigureDiscount.discountAmount === 4 && 
  result1.roundFigureDiscount.finalPaidAmount === 74 && result1.roundFigureDiscount.finalRemaining === 0 && 
  result1.roundFigureDiscount.isFullyPaid;
console.log('  ', test1Pass ? '✓ PASS' : '✗ FAIL');

console.log();

// Test 2: Bill amount ₹71, user pays ₹70 (difference = 1, should apply)
console.log('Test 2: Bill amount ₹71, user pays ₹70');
const result2 = calculatePaymentWithRoundFigureDiscount({
  grandTotal: 71,
  alreadyPaid: 0,
  discountAmount: 0,
  paymentAmount: 70,
});
console.log('  Round figure discount should apply:', result2.roundFigureDiscount.shouldApply);
console.log('  Discount amount:', result2.roundFigureDiscount.discountAmount);
console.log('  Final paid amount:', result2.roundFigureDiscount.finalPaidAmount);
console.log('  Final remaining:', result2.roundFigureDiscount.finalRemaining);
console.log('  Is fully paid:', result2.roundFigureDiscount.isFullyPaid);
const test2Pass = result2.roundFigureDiscount.shouldApply && result2.roundFigureDiscount.discountAmount === 1 && 
  result2.roundFigureDiscount.finalPaidAmount === 71 && result2.roundFigureDiscount.finalRemaining === 0 && 
  result2.roundFigureDiscount.isFullyPaid;
console.log('  ', test2Pass ? '✓ PASS' : '✗ FAIL');

console.log();

// Test 3: Bill amount ₹80, user pays ₹70 (difference = 10 > 5, should NOT apply)
console.log('Test 3: Bill amount ₹80, user pays ₹70');
const result3 = calculatePaymentWithRoundFigureDiscount({
  grandTotal: 80,
  alreadyPaid: 0,
  discountAmount: 0,
  paymentAmount: 70,
});
console.log('  Round figure discount should apply:', result3.roundFigureDiscount.shouldApply);
console.log('  Discount amount:', result3.roundFigureDiscount.discountAmount);
console.log('  Final paid amount:', result3.roundFigureDiscount.finalPaidAmount);
console.log('  Final remaining:', result3.roundFigureDiscount.finalRemaining);
console.log('  Is fully paid:', result3.roundFigureDiscount.isFullyPaid);
const test3Pass = !result3.roundFigureDiscount.shouldApply && result3.roundFigureDiscount.discountAmount === 0 && 
  result3.roundFigureDiscount.finalPaidAmount === 70 && result3.roundFigureDiscount.finalRemaining === 10 && 
  !result3.roundFigureDiscount.isFullyPaid;
console.log('  ', test3Pass ? '✓ PASS' : '✗ FAIL');

console.log();

// Test 4: Bill amount ₹70, user pays ₹70 (difference = 0, should NOT apply)
console.log('Test 4: Bill amount ₹70, user pays ₹70');
const result4 = calculatePaymentWithRoundFigureDiscount({
  grandTotal: 70,
  alreadyPaid: 0,
  discountAmount: 0,
  paymentAmount: 70,
});
console.log('  Round figure discount should apply:', result4.roundFigureDiscount.shouldApply);
console.log('  Discount amount:', result4.roundFigureDiscount.discountAmount);
console.log('  Final paid amount:', result4.roundFigureDiscount.finalPaidAmount);
console.log('  Final remaining:', result4.roundFigureDiscount.finalRemaining);
console.log('  Is fully paid:', result4.roundFigureDiscount.isFullyPaid);
const test4Pass = !result4.roundFigureDiscount.shouldApply && result4.roundFigureDiscount.discountAmount === 0 && 
  result4.roundFigureDiscount.finalPaidAmount === 70 && result4.roundFigureDiscount.finalRemaining === 0 && 
  result4.roundFigureDiscount.isFullyPaid;
console.log('  ', test4Pass ? '✓ PASS' : '✗ FAIL');

console.log();

// Test 5: Bill amount ₹72, user pays ₹70 (difference = 2, should apply)
console.log('Test 5: Bill amount ₹72, user pays ₹70');
const result5 = calculatePaymentWithRoundFigureDiscount({
  grandTotal: 72,
  alreadyPaid: 0,
  discountAmount: 0,
  paymentAmount: 70,
});
console.log('  Round figure discount should apply:', result5.roundFigureDiscount.shouldApply);
console.log('  Discount amount:', result5.roundFigureDiscount.discountAmount);
console.log('  Final paid amount:', result5.roundFigureDiscount.finalPaidAmount);
console.log('  Final remaining:', result5.roundFigureDiscount.finalRemaining);
console.log('  Is fully paid:', result5.roundFigureDiscount.isFullyPaid);
const test5Pass = result5.roundFigureDiscount.shouldApply && result5.roundFigureDiscount.discountAmount === 2 && 
  result5.roundFigureDiscount.finalPaidAmount === 72 && result5.roundFigureDiscount.finalRemaining === 0 && 
  result5.roundFigureDiscount.isFullyPaid;
console.log('  ', test5Pass ? '✓ PASS' : '✗ FAIL');

console.log();

// Test 6: Bill amount ₹75, user pays ₹70 (difference = 5, should apply)
console.log('Test 6: Bill amount ₹75, user pays ₹70');
const result6 = calculatePaymentWithRoundFigureDiscount({
  grandTotal: 75,
  alreadyPaid: 0,
  discountAmount: 0,
  paymentAmount: 70,
});
console.log('  Round figure discount should apply:', result6.roundFigureDiscount.shouldApply);
console.log('  Discount amount:', result6.roundFigureDiscount.discountAmount);
console.log('  Final paid amount:', result6.roundFigureDiscount.finalPaidAmount);
console.log('  Final remaining:', result6.roundFigureDiscount.finalRemaining);
console.log('  Is fully paid:', result6.roundFigureDiscount.isFullyPaid);
const test6Pass = result6.roundFigureDiscount.shouldApply && result6.roundFigureDiscount.discountAmount === 5 && 
  result6.roundFigureDiscount.finalPaidAmount === 75 && result6.roundFigureDiscount.finalRemaining === 0 && 
  result6.roundFigureDiscount.isFullyPaid;
console.log('  ', test6Pass ? '✓ PASS' : '✗ FAIL');

console.log('\n=== Test Summary ===');
console.log('Test 1:', test1Pass ? 'PASS' : 'FAIL');
console.log('Test 2:', test2Pass ? 'PASS' : 'FAIL');
console.log('Test 3:', test3Pass ? 'PASS' : 'FAIL');
console.log('Test 4:', test4Pass ? 'PASS' : 'FAIL');
console.log('Test 5:', test5Pass ? 'PASS' : 'FAIL');
console.log('Test 6:', test6Pass ? 'PASS' : 'FAIL');

const allTestsPass = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass;
console.log('\nOverall:', allTestsPass ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED!');
