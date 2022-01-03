import * as d3 from 'd3';
import Decimal from 'decimal.js';

import {NamedConstant, Num} from './num';
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
  readonly price: Num;
  readonly homeValue: Num;
  readonly hoa: Num;
  readonly downPayment: Num;
  readonly downPaymentPct: Num;
  readonly interestRate: Num;
  readonly pointsPurchased: Num;
  readonly pointValue: Num;
  readonly pmi: Num;
  readonly pmiEquityPct: Num;
  readonly propertyTax: Num;
  readonly residentialExemptionPerMonth: Num;
  readonly homeownersInsurance: Num;
  readonly closingCost: Num;
  readonly mortgageTerm: Num;
  readonly annualIncome: Num;
  readonly monthlyDebt: Num;
  readonly totalAssets: Num;
  readonly alreadyClosed: boolean;
  readonly paymentsAlreadyMade: number;
  readonly closingDate?: Date;
  readonly prepayment: Num;
  readonly stocksReturnRate: Num;

  readonly n: Num;

  readonly showMonthlySchedule: boolean;
  readonly m: Num;
  readonly monthlyLoanPayment: Num;
  readonly monthlyNonLoanPayment: Num;

  constructor(input: ContextInput) {
    this.price = new NamedConstant(Decimal.max(0, input.price), 'price');
    this.homeValue = new NamedConstant(
        utils.chooseNonzero(Num.max(0, input.homeValue), this.price),
        'homeValue');
    this.hoa = new NamedConstant(Num.max(0, new Num(input.hoa)), 'HOA');
    this.downPayment = new NamedConstant(
        utils.chooseNonzero(
            new Num(input.downPaymentPercent.clamp(0, 100))
                .div(100)
                .mul(this.price),
            new Num(input.downPaymentAbsolute.clamp(0, this.price.value()))),
        'downPayment');
    this.downPaymentPct = new NamedConstant(
        this.downPayment.div(this.price), 'downPaymentPercentage');
    this.interestRate =
        new NamedConstant(input.interestRate.clamp(0, 100), 'interestRate')
            .div(100);
    this.pointValue = new NamedConstant(
        utils.chooseNonzero(
            Num.max(0, new Num(input.pointValue).div(100)), new Num(0.0025)),
        'pointsValue');
    this.pointsPurchased = new NamedConstant(
        Math.max(0, input.pointsPurchased), 'pointsPurchased');
    if (!this.interestRate.eq(0) && !this.pointsPurchased.eq(0)) {
      this.interestRate = Num.max(
          0, this.interestRate.sub(this.pointsPurchased.mul(this.pointValue)));
    }
    this.pmi = new NamedConstant(
        this.downPaymentPct.gte(0.2) ? new Num(0) :
                                       new Num(Decimal.max(0, input.pmi)),
        'PMI');
    this.pmiEquityPct = new NamedConstant(
        utils.chooseNonzero(
            new Num(input.pmiEquityPercent.clamp(0, 100)).div(100),
            new Num(0.22)),
        'PMIEquityCutoff');
    {
      const rawMonthlyAbsolute =
          new Num(Decimal.max(0, input.propertyTaxAbsolute));
      const rawAnnualRate =
          new Num(input.propertyTaxPercent.clamp(0, 100)).div(100);

      const rawExemptionAnnualSavings = new NamedConstant(
          Decimal.max(0, input.residentialExemptionAnnualSavings),
          'residentialExemptionAnnualSavings');
      const rawAnnualDeduction = new NamedConstant(
          input.residentialExemptionDeduction.clamp(0, this.price.value()),
          'residentialExemptionDeduction');

      if (rawExemptionAnnualSavings) {
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
    this.homeownersInsurance = new NamedConstant(
        Decimal.max(0, input.homeownersInsurance), 'homeownersInsurance');
    this.closingCost =
        new NamedConstant(Decimal.max(0, input.closingCost), 'closingCost');
    // Assume a 30 year fixed loan.
    this.mortgageTerm = new NamedConstant(
        Math.max(0, input.mortgageTerm) || 30, 'mortgageTerm');
    this.n = this.mortgageTerm.mul(12);
    this.annualIncome =
        new NamedConstant(Decimal.max(0, input.annualIncome), 'annualIncome');
    this.monthlyDebt =
        new NamedConstant(Decimal.max(0, input.monthlyDebt), 'monthlyDebt');
    this.totalAssets =
        new NamedConstant(Decimal.max(0, input.totalAssets), 'totalAssets');

    this.alreadyClosed = input.alreadyClosed ||
        (input.closingDate ?
             input.closingDate.valueOf() <= input.now.valueOf() :
             false);

    this.paymentsAlreadyMade = clamp(
                                   input.paymentsAlreadyMade,
                                   {min: 0, max: this.n.value().toNumber()}) ||
        (input.closingDate ?
             utils.computeMonthDiff(input.closingDate, new Date()) :
             0);
    this.closingDate =
        input.closingDate ? d3.timeMonth.floor(input.closingDate) : undefined;
    this.prepayment = new NamedConstant(
        input.prepayment.clamp(0, this.price.value()), 'prepayment');
    this.stocksReturnRate = new NamedConstant(
        input.stocksReturnRate ? input.stocksReturnRate.div(100) :
                                 new Decimal(0.07),
        'stocksReturnRate');

    this.showMonthlySchedule =
        !this.interestRate.eq(0) || this.downPayment.eq(this.price);
    if (this.showMonthlySchedule) {
      this.m = this.downPayment.eq(this.price) ?
          new Num(0) :
          utils.computeAmortizedPaymentAmount(
              this.price.sub(this.downPayment),
              this.interestRate.div(12),
              this.n,
          );
      this.monthlyLoanPayment = this.m.add(this.prepayment);
    } else {
      this.m = new Num(0);
      this.monthlyLoanPayment = new Num(0);
    }
    this.monthlyNonLoanPayment =
        Num.sum(this.hoa, this.propertyTax, this.homeownersInsurance);
  }
}
