/**
 * @jest-environment jsdom
 */

import * as d3 from 'd3';
import Decimal from 'decimal.js';

// import {NamedConstant, NamedOutput, Num} from './num';
import {Context} from './context';
import {ContextInput} from './types';

function defaultInput(): ContextInput {
  return {
    price: new Decimal(0),
    homeValue: new Decimal(0),
    hoa: new Decimal(0),
    downPaymentPercent: new Decimal(0),
    downPaymentAbsolute: new Decimal(0),
    interestRate: new Decimal(0),
    pointValue: new Decimal(0),
    pointsPurchased: 0,
    pmi: new Decimal(0),
    pmiEquityPercent: new Decimal(0),
    propertyTaxAbsolute: new Decimal(0),
    propertyTaxPercent: new Decimal(0),
    residentialExemptionAnnualSavings: new Decimal(0),
    residentialExemptionDeduction: new Decimal(0),
    homeownersInsurance: new Decimal(0),
    closingCost: new Decimal(0),
    mortgageTerm: 0,
    annualIncome: new Decimal(0),
    monthlyDebt: new Decimal(0),
    totalAssets: new Decimal(0),
    alreadyClosed: false,
    paymentsAlreadyMade: 0,
    closingDate: undefined,
    prepayment: new Decimal(0),
    stocksReturnRate: undefined,
    now: new Date(0),
    showDerivations: false,
    simplifyDerivations: false,
  };
}

test('price', () => {
  const input = defaultInput();
  // Unspecified:
  expect(new Context(input).price.toNumber()).toEqual(0);

  input.price = new Decimal(100);
  expect(new Context(input).price.toNumber()).toEqual(100);

  input.price = new Decimal(-100);
  expect(new Context(input).price.toNumber()).toEqual(0);
});

test('homeValue', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).homeValue.toNumber()).toEqual(0);

  input.homeValue = new Decimal(123);
  expect(new Context(input).homeValue.toNumber()).toEqual(123);

  input.homeValue = new Decimal(-100);
  expect(new Context(input).homeValue.toNumber()).toEqual(0);

  // Price is used by default.
  input.homeValue = new Decimal(0);
  input.price = new Decimal(125);

  expect(new Context(input).homeValue.toNumber()).toEqual(125);
});

test('hoa', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).hoa.toNumber()).toEqual(0);

  input.hoa = new Decimal(123);
  expect(new Context(input).hoa.toNumber()).toEqual(123);

  input.hoa = new Decimal(-123);
  expect(new Context(input).hoa.toNumber()).toEqual(0);
});

test('downPayment', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).downPayment.toNumber()).toEqual(0);

  // Via downPaymentAbsolute:
  input.downPaymentAbsolute = new Decimal(123);
  // Price is required, since down payment must be less.
  input.price = new Decimal(246);
  expect(new Context(input).downPayment.toNumber()).toEqual(123);

  input.downPaymentAbsolute = new Decimal(-123);
  expect(new Context(input).downPayment.toNumber()).toEqual(0);

  // Via downPaymentPercent:
  input.downPaymentPercent = new Decimal(50);
  input.downPaymentAbsolute = new Decimal(0);
  input.price = new Decimal(246);
  expect(new Context(input).downPayment.toNumber()).toEqual(123);

  input.downPaymentPercent = new Decimal(-123);
  expect(new Context(input).downPayment.toNumber()).toEqual(0);
});

test('loanAmount', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).loanAmount.toNumber()).toEqual(0);

  input.price = new Decimal(123);
  input.downPaymentAbsolute = new Decimal(100);
  expect(new Context(input).loanAmount.toNumber()).toEqual(23);
});

test('downPaymentPct', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).downPaymentPct.toNumber()).toEqual(0);

  // Via downPaymentPercent:
  input.downPaymentPercent = new Decimal(50);
  input.price = new Decimal(246);
  expect(new Context(input).downPaymentPct.toNumber()).toEqual(0.5);

  // Via downPaymentAbsolute:
  input.downPaymentAbsolute = new Decimal(123);
  input.downPaymentPercent = new Decimal(0);
  expect(new Context(input).downPaymentPct.toNumber()).toEqual(0.5);
});

test('interestRate', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).interestRate.toNumber()).toEqual(0);

  input.interestRate = new Decimal(2.75);
  expect(new Context(input).interestRate.toNumber()).toEqual(0.0275);

  input.interestRate = new Decimal(102.75);
  expect(new Context(input).interestRate.toNumber()).toEqual(1);
  input.interestRate = new Decimal(-2.75);
  expect(new Context(input).interestRate.toNumber()).toEqual(0);
});

test('pointValue', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).pointValue.toNumber()).toEqual(0.0025);

  input.pointValue = new Decimal(0.30);
  expect(new Context(input).pointValue.toNumber()).toEqual(0.003);
});

test('pointsPurchased', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).pointsPurchased.toNumber()).toEqual(0);

  input.pointsPurchased = 3;
  expect(new Context(input).pointsPurchased.toNumber()).toEqual(3);

  // Affects interest rate (with poinValue):
  input.interestRate = new Decimal(3);
  input.pointValue = new Decimal(0.3);
  expect(new Context(input).interestRate.toNumber()).toEqual(0.021);
});

test('pmi', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).pmi.toNumber()).toEqual(0);

  input.pmi = new Decimal(30);
  expect(new Context(input).pmi.toNumber()).toEqual(30);
});

test('pmiEquityPct', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).pmiEquityPct.toNumber()).toEqual(0.22);

  input.pmiEquityPercent = new Decimal(30);
  expect(new Context(input).pmiEquityPct.toNumber()).toEqual(0.3);
});

test('property taxes', () => {
  let input = defaultInput();
  // Unspecified:
  expect(new Context(input).hoa.toNumber()).toEqual(0);

  // 2 factors, each of which can be specified in 2 ways:
  // * property tax: monthly amount or annual % rate.
  // * residential exemption: raw savings amount /yr, or amount deducted from
  //   home value.

  // Monthly amount, raw savings /yr.
  input = defaultInput();
  input.propertyTaxAbsolute = new Decimal(100);
  input.residentialExemptionAnnualSavings = new Decimal(36);
  // tax = (12 * 100 - 36) / 12
  expect(new Context(input).propertyTax.toNumber()).toEqual(97);
  // monthly exemption = 36 / 12
  expect(new Context(input).residentialExemptionPerMonth.toNumber()).toEqual(3);

  // Monthly amount, amount deducted from home value.
  input = defaultInput();
  input.price = new Decimal(4000);
  input.propertyTaxAbsolute = new Decimal(100);
  input.residentialExemptionDeduction = new Decimal(400);
  // tax = (100 * 12 / 4000) * (4000 - 400) / 12
  expect(new Context(input).propertyTax.toNumber()).toEqual(90);
  // monthly exemption = (100 * 12 / 4000) * 400 / 12
  expect(new Context(input).residentialExemptionPerMonth.toNumber())
      .toEqual(10);

  // annual % rate, raw savings /yr.
  input = defaultInput();
  input.price = new Decimal(4000);
  input.propertyTaxPercent = new Decimal(15);
  input.residentialExemptionAnnualSavings = new Decimal(36);
  // tax = (0.15 * 4000 / 12) - (36 / 12)
  expect(new Context(input).propertyTax.toNumber()).toEqual(47);
  // monthly exemption = 36 / 12
  expect(new Context(input).residentialExemptionPerMonth.toNumber()).toEqual(3);

  // annual % rate, amount deducted from home value.
  input = defaultInput();
  input.price = new Decimal(4000);
  input.propertyTaxPercent = new Decimal(15);
  input.residentialExemptionDeduction = new Decimal(400);
  // tax = 0.15 * (4000 - 400) / 12
  expect(new Context(input).propertyTax.toNumber()).toEqual(45);
  // monthly exemption = 0.15 * 400 / 12
  expect(new Context(input).residentialExemptionPerMonth.toNumber()).toEqual(5);
});

test('homeownersInsurace', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).homeownersInsurance.toNumber()).toEqual(0);

  input.homeownersInsurance = new Decimal(30);
  expect(new Context(input).homeownersInsurance.toNumber()).toEqual(30);
  input.homeownersInsurance = new Decimal(-30);
  expect(new Context(input).homeownersInsurance.toNumber()).toEqual(0);
});

test('closingCost', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).closingCost.toNumber()).toEqual(0);

  input.closingCost = new Decimal(30);
  expect(new Context(input).closingCost.toNumber()).toEqual(30);
  input.closingCost = new Decimal(-30);
  expect(new Context(input).closingCost.toNumber()).toEqual(0);
});

test('mortgageTerm', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).mortgageTerm.toNumber()).toEqual(30);
  expect(new Context(input).n.toNumber()).toEqual(360);

  input.mortgageTerm = 15;
  expect(new Context(input).mortgageTerm.toNumber()).toEqual(15);
  expect(new Context(input).n.toNumber()).toEqual(180);
  input.mortgageTerm = -15;
  expect(new Context(input).mortgageTerm.toNumber()).toEqual(30);
  expect(new Context(input).n.toNumber()).toEqual(360);
});

test('annualIncome', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).annualIncome.toNumber()).toEqual(0);

  input.annualIncome = new Decimal(50000);
  expect(new Context(input).annualIncome.toNumber()).toEqual(50000);
  input.annualIncome = new Decimal(-15);
  expect(new Context(input).annualIncome.toNumber()).toEqual(0);
});

test('monthlyDebt', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).monthlyDebt.toNumber()).toEqual(0);

  input.monthlyDebt = new Decimal(500);
  expect(new Context(input).monthlyDebt.toNumber()).toEqual(500);
  input.monthlyDebt = new Decimal(-15);
  expect(new Context(input).monthlyDebt.toNumber()).toEqual(0);
});

test('totalAsserts', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).totalAssets.toNumber()).toEqual(0);

  input.totalAssets = new Decimal(500);
  expect(new Context(input).totalAssets.toNumber()).toEqual(500);
  input.totalAssets = new Decimal(-15);
  expect(new Context(input).totalAssets.toNumber()).toEqual(0);
});

test('alreadyClosed', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).alreadyClosed).toEqual(false);

  // Closing date is in the future.
  input.closingDate = d3.timeMonth.offset(input.now, 2);
  expect(new Context(input).alreadyClosed).toEqual(false);

  // Closing date is in the past.
  input.now = d3.timeMonth.offset(input.closingDate, 1);
  expect(new Context(input).alreadyClosed).toEqual(true);
});

test('paymentsAlreadyMade', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).paymentsAlreadyMade).toEqual(0);

  // Explicit:
  input.paymentsAlreadyMade = 3;
  expect(new Context(input).paymentsAlreadyMade).toEqual(3);

  // Explicit, and clamped to mortgage term:
  input.paymentsAlreadyMade = 7000;
  expect(new Context(input).paymentsAlreadyMade).toEqual(360);

  // Closing date is in the future.
  input.paymentsAlreadyMade = 0;
  input.closingDate = d3.timeMonth.offset(input.now, 2);
  expect(new Context(input).paymentsAlreadyMade).toEqual(0);

  // // Closing date is in the past.
  input.now = d3.timeMonth.offset(input.closingDate, 5);
  expect(new Context(input).paymentsAlreadyMade).toEqual(5);
});

test('closingDate', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).closingDate).toEqual(undefined);

  // Explicit:
  // This might screw with timezones, might have to tweak it.
  input.closingDate = new Date(0);
  expect(new Context(input).closingDate?.getTime()).toEqual(-2660400000);
});

test('prepayment', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).prepayment.toNumber()).toEqual(0);

  // Explicit:
  input.price = new Decimal(3000);
  input.interestRate = new Decimal(1.5);
  input.prepayment = new Decimal(100);
  expect(new Context(input).prepayment.toNumber()).toEqual(100);
});

test('stocksReturnRate', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).stocksReturnRate.toNumber()).toEqual(0.07);

  // Explicit:
  input.stocksReturnRate = new Decimal(15);
  expect(new Context(input).stocksReturnRate.toNumber()).toEqual(0.15);
});

test('showMonthlySchedule', () => {
  let input = defaultInput();

  // Unspecified:
  expect(new Context(input).showMonthlySchedule).toEqual(false);

  // Show monthly payments if there's a loan involved (i.e. if we have an
  // interest rate to work with).
  input.interestRate = new Decimal(1.5);
  expect(new Context(input).showMonthlySchedule).toEqual(true);

  // Show monthly payments if the price is nonzero, and we're paying the whole
  // price in down payment. (So we want to see non-loan costs anyway.)
  input = defaultInput();
  input.price = new Decimal(200);
  input.downPaymentPercent = new Decimal(100);
  expect(new Context(input).showMonthlySchedule).toEqual(true);
});

test('amortized amount', () => {
  let input = defaultInput();

  // Unspecified:
  expect(new Context(input).m.toNumber()).toEqual(0);
  expect(new Context(input).monthlyLoanPayment.toNumber()).toEqual(0);

  // No loan involved:
  input.price = new Decimal(200);
  input.downPaymentPercent = new Decimal(100);
  expect(new Context(input).m.toNumber()).toEqual(0);
  expect(new Context(input).monthlyLoanPayment.toNumber()).toEqual(0);
  // Takes mortgage prepayments into account, but can't have prepayments if
  // there's no loan.
  input.prepayment = new Decimal(15);
  expect(new Context(input).monthlyLoanPayment.toNumber()).toEqual(0);

  // Loan involved:
  input = defaultInput();
  input.price = new Decimal(200);
  input.interestRate = new Decimal(2);
  expect(new Context(input).m.toNumber()).toBeGreaterThan(0);
  expect(new Context(input).monthlyLoanPayment.toNumber())
      .toEqual(new Context(input).m.toNumber());
  // Takes prepayments into account:
  input.prepayment = new Decimal(5);
  expect(new Context(input).monthlyLoanPayment.toNumber())
      .toEqual(new Context(input).m.toNumber() + 5);
});

test('monthylNonLoanPayment', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).propertyTax.toNumber()).toEqual(0);
  expect(new Context(input).propertyTax.value().isNaN()).toEqual(false);
  expect(new Context(input).monthlyNonLoanPayment.toNumber()).toEqual(0);

  input.hoa = new Decimal(1);
  input.propertyTaxAbsolute = new Decimal(2);
  input.price = new Decimal(3000);
  input.homeownersInsurance = new Decimal(4);
  expect(new Context(input).monthlyNonLoanPayment.toNumber()).toEqual(7);
});

test('showDerivations', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).showDerivations).toEqual(false);

  input.showDerivations = true;
  expect(new Context(input).showDerivations).toEqual(true);

  input.showDerivations = false;
  expect(new Context(input).showDerivations).toEqual(false);
});

test('simplifyDerivations', () => {
  const input = defaultInput();

  // Unspecified:
  expect(new Context(input).simplifyDerivations).toEqual(false);

  // Can't simplify derivations if we're not showing them in the first place.
  input.simplifyDerivations = true;
  expect(new Context(input).simplifyDerivations).toEqual(false);

  input.showDerivations = true;
  expect(new Context(input).simplifyDerivations).toEqual(true);

  input.simplifyDerivations = false;
  expect(new Context(input).simplifyDerivations).toEqual(false);
});