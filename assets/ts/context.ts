import * as d3 from 'd3';
import Decimal from 'decimal.js';

import {AnyNumber, NamedConstant, NamedOutput, Num} from './num';
import {ConstantName, ContextInput} from './types';
import * as utils from './utils';

// Clamps the input to within the interval [min, max] (inclusive on each end).
function clamp(x: number, {min, max}: {min: number, max: number}): number {
  return Math.max(min, Math.min(max, x));
}

function constant(name: ConstantName, value: AnyNumber):
    NamedConstant{return new NamedConstant(name, value)}

function output(name: ConstantName, value: Num):
    NamedOutput {
      return new NamedOutput(name, value)
    }

/**
 * This class captures a snapshot of the input fields at construction, and
 * computes all the interesting values to be used in the payment schedule
 * calculation.
 *
 * This is an optimization detail, as a kind of memoization to avoid needless
 * extra function calls when we've already computed a value.
 */
export class Context {
  readonly price: Num;
  readonly homeValue: Num;
  readonly hoa: Num;
  readonly downPayment: Num;
  readonly downPaymentPct: Num;
  readonly loanAmount: Num;
  readonly interestRate: Num;
  readonly pointsPurchased: Num;
  readonly pointValue: Num;
  readonly pmi: Num;
  readonly pmiEquityPct: Num;
  readonly propertyTaxAnnual: Num;
  readonly residentialExemptionQuarterly: Num;
  readonly taxCollectionStartMonthOffset: number;
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
  readonly purchasePayment: Num;

  readonly n: Num;

  readonly showMonthlySchedule: boolean;
  readonly m: Num;
  readonly monthlyLoanPayment: Num;
  readonly monthlyNonLoanPayment: Num;

  readonly showDerivations: boolean;
  readonly simplifyDerivations: boolean;

  constructor(input: ContextInput) {
    this.price = constant('price', Decimal.max(0, input.price));
    this.homeValue = utils.chooseNonzero(
        constant('homeValue', Num.max(0, input.homeValue)), this.price);
    this.hoa = constant('HOA', Num.max(0, input.hoa));
    const rawDownPaymentPercent =
        constant('downPaymentPercent', input.downPaymentPercent.clamp(0, 100));
    this.downPayment = utils.chooseNonzero(
        output('downPayment', rawDownPaymentPercent.div(100).mul(this.price)),
        constant(
            'downPaymentAbsolute',
            input.downPaymentAbsolute.clamp(0, this.price.value())));
    this.loanAmount = output('loanAmount', this.price.sub(this.downPayment));
    this.downPaymentPct = utils.chooseNonzero(
        rawDownPaymentPercent.div(100), this.downPayment.div(this.price));
    this.interestRate =
        constant('interestRate', input.interestRate.clamp(0, 100)).div(100);
    this.pointValue = constant(
                          'pointsValue',
                          utils.chooseNonzero(
                              Num.max(0, input.pointValue), Num.literal(0.25)))
                          .div(100);
    this.pointsPurchased =
        constant('pointsPurchased', Math.max(0, input.pointsPurchased));
    if (!this.interestRate.eq(0) && !this.pointsPurchased.eq(0)) {
      this.interestRate = output(
          'interestRate',
          Num.max(
              0,
              this.interestRate.sub(
                  this.pointsPurchased.mul(this.pointValue))));
    }
    this.pmi = constant(
        'PMI', this.downPaymentPct.gte(0.2) ? 0 : Decimal.max(0, input.pmi));
    this.pmiEquityPct = utils.chooseNonzero(
        constant('pmiEquityCutoff', input.pmiEquityPercent.clamp(0, 100))
            .div(100),
        output('pmiEquityCutoff', Num.div(22, 100)));
    {
      const rawQuarterlyAbsolute = constant(
          'propertyTaxAbsolute', Decimal.max(0, input.propertyTaxAbsolute));
      const rawAnnualRate =
          constant('propertyTaxPercent', input.propertyTaxPercent.clamp(0, 100))
              .div(100);
      const annualPropertyTaxAbsolute = utils.chooseNonzero(
          rawQuarterlyAbsolute.mul(4), rawAnnualRate.mul(this.homeValue));
      const annualPropertyTaxRate = utils.chooseNonzero(
          rawQuarterlyAbsolute.mul(4).div(this.homeValue), rawAnnualRate);

      const rawExemptionAnnualSavings = constant(
          'residentialExemptionAnnualSavings',
          Decimal.max(0, input.residentialExemptionAnnualSavings));
      const rawAnnualDeduction = constant(
          'residentialExemptionDeduction',
          input.residentialExemptionDeduction.clamp(0, this.price.value()));

      if (!rawExemptionAnnualSavings.eq(0)) {
        this.propertyTaxAnnual = output(
            'annualPropertyTax',
            annualPropertyTaxAbsolute.sub(rawExemptionAnnualSavings));
        this.residentialExemptionQuarterly = rawExemptionAnnualSavings.div(4);
      } else {
        this.propertyTaxAnnual = output(
            'annualPropertyTax',
            annualPropertyTaxRate.mul(this.homeValue.sub(rawAnnualDeduction)));
        this.residentialExemptionQuarterly =
            annualPropertyTaxRate.mul(rawAnnualDeduction).div(4);
      }
    }

    // The first payment will be one month after the closing date (if provided).
    const firstPaymentMonth = (input.closingDate?.getMonth() ?? 0) + 1;
    // JavaScript's % operator is remainder, not modulus, so we have to handle
    // negatives carefully.
    this.taxCollectionStartMonthOffset =
        mod(input.taxCollectionStartMonth - firstPaymentMonth, 3);

    this.homeownersInsurance = constant(
        'homeownersInsurance', Decimal.max(0, input.homeownersInsurance));
    this.closingCost =
        constant('closingCost', Decimal.max(0, input.closingCost));
    // Assume a 30 year fixed loan.
    this.mortgageTerm =
        constant('mortgageTerm', Math.max(0, input.mortgageTerm) || 30);
    this.n = this.mortgageTerm.mul(12);
    this.annualIncome =
        constant('annualIncome', Decimal.max(0, input.annualIncome));
    this.monthlyDebt =
        constant('monthlyDebt', Decimal.max(0, input.monthlyDebt));
    this.totalAssets =
        constant('totalAssets', Decimal.max(0, input.totalAssets));

    this.alreadyClosed = input.alreadyClosed ||
        (!!input.closingDate &&
         input.closingDate.valueOf() <= input.now.valueOf());

    this.paymentsAlreadyMade =
        clamp(input.paymentsAlreadyMade, {min: 0, max: this.n.toNumber()}) ||
        (input.closingDate ?
             utils.computeMonthDiff(input.closingDate, input.now) :
             0);
    this.closingDate =
        input.closingDate ? d3.timeMonth.floor(input.closingDate) : undefined;
    this.stocksReturnRate =
        constant('stocksReturnRate', input.stocksReturnRate ?? new Decimal(7))
            .div(100);

    this.showMonthlySchedule = !this.interestRate.eq(0) ||
        (!this.price.eq(0) && this.downPayment.eq(this.price));
    if (this.showMonthlySchedule && !this.downPayment.eq(this.price)) {
      this.m = output(
          'principalAndInterest',
          utils.computeAmortizedPaymentAmount(
              this.loanAmount,
              this.interestRate.div(12),
              this.n,
              ));
      this.prepayment =
          constant('prepayment', input.prepayment.clamp(0, this.price.value()));
    } else {
      this.m = output('principalAndInterest', Num.literal(0));
      this.prepayment = constant('prepayment', Num.literal(0));
    }
    this.monthlyLoanPayment = this.m.add(this.prepayment);
    this.monthlyNonLoanPayment = Num.sum(
        this.hoa, this.propertyTaxAnnual.div(12), this.homeownersInsurance);

    this.purchasePayment = Num.sum(
        this.downPayment,
        this.closingCost,
        this.loanAmount.div(100).mul(this.pointsPurchased),
    );

    this.showDerivations = input.showDerivations;
    this.simplifyDerivations =
        this.showDerivations && input.simplifyDerivations;
  }
}

function mod(n: number, modulus: number): number {
  while (n < 0) {
    n += modulus;
  }
  return n % modulus;
}
