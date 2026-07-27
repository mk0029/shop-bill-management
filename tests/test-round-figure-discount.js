"use strict";

// Test for round figure discount logic

const path = require('path');
const { calculatePaymentWithRoundFigureDiscount, toMoney, BILL_EPSILON } = require('./src/lib/bill-utils');

function testRoundFigureDiscount() {
  console.log('Testing round figure discount logic...\n');
  
  // Test case 1: Bill amount ₹74, user pays ₹70
  console.log('Test 1: Bill amount ₹74, user pays ₹70');
  const billTotal = 74;
  const alreadyPaid = 0;
  const paymentAmount = 70;
  
  const result = calculatePaymentWithRoundFigureDiscount({
    grandTotal: billTotal,
    alreadyPaid,
    discountAmount: 0,
    paymentAmount,
  });
  
  console.log(`  Original remaining: ${result.validation.originalRemaining}`);
  console.log(`  Round figure discount should apply: ${result.roundFigureDiscount.shouldApply}`);
  console.log(`  Discount amount: ${result.roundFigureDiscount.discountAmount}`);
  console.log(`  Final paid amount: ${result.roundFigureDiscount.finalPaidAmount}`);
  console.log(`  Final remaining: ${result.roundFigureDiscount.finalRemaining}`);
  console.log(`  Is fully paid: ${result.roundFigureDiscount.isFullyPaid}`);
  console.log('  Expected: Should apply with discount ₹4, final paid ₹70, remaining ₹0, fully paid true');
  console.log();
  
  // Test case 2: Bill amount ₹71, user pays ₹70
  console.log('Test 2: Bill amount ₹71, user pays ₹70');
  const result2 = calculatePaymentWithRoundFigureDiscount({
    grandTotal: 71,
    alreadyPaid: 0,
    discountAmount: 0,
    paymentAmount: 70,
  });
  
  console.log(`  Original remaining: ${result2.validation.originalRemaining}`);
  console.log(`  Round figure discount should apply: ${result2.roundFigureDiscount.shouldApply}`);
  console.log(`  Discount amount: ${result2.roundFigureDiscount.discountAmount}`);
  console.log(`  Final paid amount: ${result2.roundFigureDiscount.finalPaidAmount}`);
  console.log(`  Final remaining: ${result2.roundFigureDiscount.finalRemaining}`);
  console.log(`  Is fully paid: ${result2.roundFigureDiscount.isFullyPaid}`);
  console.log('  Expected: Should apply with discount ₹1, final paid ₹71, remaining ₹0, fully paid true');
  console.log();
  
  // Test case 3: Bill amount ₹70, user pays ₹70 (no difference)
  console.log('Test 3: Bill amount ₹70, user pays ₹70');
  const result3 = calculatePaymentWithRoundFigureDiscount({
    grandTotal: 70,
    alreadyPaid: 0,
    discountAmount: 0,
    paymentAmount: 70,
  });
  
  console.log(`  Original remaining: ${result3.validation.originalRemaining}`);
  console.log(`  Round figure discount should apply: ${result3.roundFigureDiscount.shouldApply}`);
  console.log(`  Discount amount: ${result3.roundFigureDiscount.discountAmount}`);
  console.log(`  Final paid amount: ${result3.roundFigureDiscount.finalPaidAmount}`);
  console.log(`  Final remaining: ${result3.roundFigureDiscount.finalRemaining}`);
  console.log(`  Is fully paid: ${result3.roundFigureDiscount.isFullyPaid}`);
  console.log('  Expected: Should not apply (difference = 0), final paid ₹70, remaining ₹0, fully paid true');
  console.log();
  
  // Test case 4: Bill amount ₹80, user pays ₹70 (difference > 5)
  console.log('Test 4: Bill amount ₹80, user pays ₹70');
  const result4 = calculatePaymentWithRoundFigureDiscount({
    grandTotal: 80,
    alreadyPaid: 0,
    discountAmount: 0,
    paymentAmount: 70,
  });
  
  console.log(`  Original remaining: ${result4.validation.originalRemaining}`);
  console.log(`  Round figure discount should apply: ${result4.roundFigureDiscount.shouldApply}`);
  console.log(`  Discount amount: ${result4.roundFigureDiscount.discountAmount}`);
  console.log(`  Final paid amount: ${result4.roundFigureDiscount.finalPaidAmount}`);
  console.log(`  Final remaining: ${result4.roundFigureDiscount.finalRemaining}`);
  console.log(`  Is fully paid: ${result4.roundFigureDiscount.isFullyPaid}`);
  console.log('  Expected: Should not apply (difference > 5), final paid ₹70, remaining ₹10, not fully paid');
  console.log();
  
  // Test case 5: Bill amount ₹75, user pays ₹70 (difference = 5)
  console.log('Test 5: Bill amount ₹75, user pays ₹70');
  const result5 = calculatePaymentWithRoundFigureDiscount({
    grandTotal: 75,
    alreadyPaid: 0,
    discountAmount: 0,
    paymentAmount: 70,
  });
  
  console.log(`  Original remaining: ${result5.validation.originalRemaining}`);
  console.log(`  Round figure discount should apply: ${result5.roundFigureDiscount.shouldApply}`);
  console.log(`  Discount amount: ${result5.roundFigureDiscount.discountAmount}`);
  console.log(`  Final paid amount: ${result5.roundFigureDiscount.finalPaidAmount}`);
  console.log(`  Final remaining: ${result5.roundFigureDiscount.finalRemaining}`);
  console.log(`  Is fully paid: ${result5.roundFigureDiscount.isFullyPaid}`);
  console.log('  Expected: Should apply with discount ₹5, final paid ₹75, remaining ₹0, fully paid true');
  console.log();
  
  console.log('All tests completed!');
}

testRoundFigureDiscount();