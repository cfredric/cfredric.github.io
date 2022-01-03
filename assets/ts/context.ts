import * as d3 from 'd3';
import Decimal from 'decimal.js';

import {ContextInput} from './types';
import * as utils from './utils';

// Clamps the input to within the interval [min, max] (inclusive on each end).
function clamp(x: number, {min, max}: {min: number, max: number}): number {
  return Math.max(min, Math.min(max, x));
}

export class Context {
  // This class captures a snapshot of the input fields at construction, and
  // computes all the interesting values to be used in the payment schedule
  // calculation.
  //
  // This is an optimization detail, as a kind of memoization to avoid needless
  // extra function calls when we've already computed a value.
  readonly price: Decimal;
  readonly homeValue: Decimal;
  readonly hoa: Decimal;
  readonly downPayment: Decimal;
  readonly downPaymentPct: Decimal;
  readonly interestRate: Decimal;
  readonly pointsPurchased: number;
  readonly pointValue: Decimal;
  readonly pmi: Decimal;
  readonly pmiEquityPct: Decimal;
  readonly propertyTax: Decimal;
  readonly residentialExemptionPerMonth: Decimal;
  readonly homeownersInsurance: Decimal;
  readonly closingCost: Decimal;
  readonly mortgageTerm: number;
  readonly annualIncome: Decimal;
  readonly monthlyDebt: Decimal;
  readonly totalAssets: Decimal;
  readonly alreadyClosed: boolean;
  readonly paymentsAlreadyMade: number;
  readonly closingDate?: Date;
  readonly prepayment: Decimal;
  readonly stocksReturnRate: Decimal;

  readonly n: number;

  readonly showMonthlySchedule: boolean;
  readonly m: Decimal;
  readonly monthlyLoanPayment: Decimal;
  readonly monthlyNonLoanPayment: Decimal;

  constructor(input: ContextInput) {
    this.price = Decimal.max(0, input.price);
    this.homeValue =
        utils.chooseNonzero(Decimal.max(0, input.homeValue), this.price);
    this.hoa = Decimal.max(0, input.hoa);
    this.downPayment = utils.chooseNonzero(
        input.downPaymentPercent.clamp(0, 100).div(100).mul(this.price),
        input.downPaymentAbsolute.clamp(0, this.price));
    this.downPaymentPct = this.downPayment.div(this.price);
    this.interestRate = input.interestRate.clamp(0, 100).div(100);
    this.pointValue = utils.chooseNonzero(
        Decimal.max(0, input.pointValue.div(100)), new Decimal(0.0025));
    this.pointsPurchased = Math.max(0, input.pointsPurchased);
    if (!this.interestRate.eq(0) && this.pointsPurchased > 0) {
      this.interestRate = Decimal.max(
          0, this.interestRate.sub(this.pointValue.mul(this.pointsPurchased)));
    }
    this.pmi = this.downPaymentPct.gte(0.2) ? new Decimal(0) :
                                              Decimal.max(0, input.pmi);
    this.pmiEquityPct = utils.chooseNonzero(
        input.pmiEquityPercent.clamp(0, 100).div(100), new Decimal(0.22));
    {
      const rawMonthlyAbsolute = Decimal.max(0, input.propertyTaxAbsolute);
      const rawAnnualRate = input.propertyTaxPercent.clamp(0, 100).div(100);

      const rawExemptionAnnualSavings =
          Decimal.max(0, input.residentialExemptionAnnualSavings);
      const rawAnnualDeduction =
          input.residentialExemptionDeduction.clamp(0, this.price);

      if (!rawExemptionAnnualSavings.eq(0)) {
        const monthlyAbsolute = utils.chooseNonzero(
            rawMonthlyAbsolute, rawAnnualRate.mul(this.homeValue).div(12));
        this.propertyTax =
            monthlyAbsolute.sub(rawExemptionAnnualSavings.div(12));
        this.residentialExemptionPerMonth = rawExemptionAnnualSavings.div(12);
      } else {
        const annualRate = utils.chooseNonzero(
            rawMonthlyAbsolute.mul(12).div(this.homeValue), rawAnnualRate);
        this.propertyTax =
            annualRate.mul(this.homeValue.sub(rawAnnualDeduction)).div(12);
        this.residentialExemptionPerMonth =
            annualRate.mul(rawAnnualDeduction).div(12);
      }
    }
    this.homeownersInsurance = Decimal.max(0, input.homeownersInsurance);
    this.closingCost = Decimal.max(0, input.closingCost);
    // Assume a 30 year fixed loan.
    this.mortgageTerm = Math.max(0, input.mortgageTerm) || 30;
    this.n = 12 * this.mortgageTerm;
    this.annualIncome = Decimal.max(0, input.annualIncome);
    this.monthlyDebt = Decimal.max(0, input.monthlyDebt);
    this.totalAssets = Decimal.max(0, input.totalAssets);

    this.alreadyClosed = input.alreadyClosed ||
        (input.closingDate ?
             input.closingDate.valueOf() <= input.now.valueOf() :
             false);

    this.paymentsAlreadyMade =
        clamp(input.paymentsAlreadyMade, {min: 0, max: this.n}) ||
        (input.closingDate ?
             utils.computeMonthDiff(input.closingDate, new Date()) :
             0);
    this.closingDate =
        input.closingDate ? d3.timeMonth.floor(input.closingDate) : undefined;
    this.prepayment = input.prepayment.clamp(0, this.price);
    this.stocksReturnRate = input.stocksReturnRate ?
        input.stocksReturnRate.div(100) :
        new Decimal(0.07);

    this.showMonthlySchedule =
        !this.interestRate.eq(0) || this.downPayment.eq(this.price);
    if (this.showMonthlySchedule) {
      this.m = this.downPayment.eq(this.price) ?
          new Decimal(0) :
          utils.computeAmortizedPaymentAmount(
              this.price.sub(this.downPayment),
              this.interestRate.div(12),
              this.n,
          );
      this.monthlyLoanPayment = this.m.add(this.prepayment);
    } else {
      this.m = new Decimal(0);
      this.monthlyLoanPayment = new Decimal(0);
    }
    this.monthlyNonLoanPayment =
        Decimal.sum(this.hoa, this.propertyTax, this.homeownersInsurance);
  }
}
