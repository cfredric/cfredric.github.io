import {Decimal} from 'decimal.js';

import {ConditionalOutput} from './conditional_output';

export const paymentTypes = [
  'principal',
  'interest',
  'hoa',
  'property_tax',
  'homeowners_insurance',
  'pmi',
] as const;

export const nonLoanPaymentTypes =
    ['hoa', 'property_tax', 'homeowners_insurance'] as const;

export const loanPaymentTypes = ['principal', 'interest'] as const;

export type PaymentType = typeof paymentTypes[number];

export type PaymentRecord = Record<PaymentType, Decimal>;

export interface PaymentRecordWithMonth {
  month: number;
  data: PaymentRecord;
}

export interface InputEntry {
  name: string;
  deprecated?: boolean;
}

export interface ContextInput {
  price: Decimal,                                  //
      homeValue: Decimal,                          //
      hoa: Decimal,                                //
      downPaymentPercent: Decimal,                 //
      downPaymentAbsolute: Decimal,                //
      interestRate: Decimal,                       //
      pointValue: Decimal,                         //
      pointsPurchased: number,                     //
      pmi: Decimal,                                //
      pmiEquityPercent: Decimal,                   //
      propertyTaxAbsolute: Decimal,                //
      propertyTaxPercent: Decimal,                 //
      residentialExemptionAnnualSavings: Decimal,  //
      residentialExemptionDeduction: Decimal,      //
      homeownersInsurance: Decimal,                //
      closingCost: Decimal,                        //
      mortgageTerm: number,                        //
      annualIncome: Decimal,                       //
      monthlyDebt: Decimal,                        //
      totalAssets: Decimal,                        //
      alreadyClosed: boolean,                      //
      paymentsAlreadyMade: number,                 //
      closingDate?: Date,                          //
      prepayment: Decimal,                         //
      stocksReturnRate?: Decimal,                  //
      now: Date,                                   //
}

export interface Inputs {
  price: HTMLInputElement,                              //
      homeValue: HTMLInputElement,                      //
      hoa: HTMLInputElement,                            //
      downPaymentPercentage: HTMLInputElement,          //
      downPaymentAbsolute: HTMLInputElement,            //
      interestRate: HTMLInputElement,                   //
      pointsPurchased: HTMLInputElement,                //
      pointValue: HTMLInputElement,                     //
      mortgageInsurance: HTMLInputElement,              //
      pmiEquityPercentage: HTMLInputElement,            //
      propertyTaxAbsolute: HTMLInputElement,            //
      propertyTaxPercentage: HTMLInputElement,          //
      residentialExemptionSavings: HTMLInputElement,    //
      residentialExemptionDeduction: HTMLInputElement,  //
      homeownersInsurance: HTMLInputElement,            //
      closingCost: HTMLInputElement,                    //
      mortgageTerm: HTMLInputElement,                   //
      annualIncome: HTMLInputElement,                   //
      monthlyDebt: HTMLInputElement,                    //
      totalAssets: HTMLInputElement,                    //
      alreadyClosed: HTMLInputElement,                  //
      paymentsAlreadyMade: HTMLInputElement,            //
      closingDate: HTMLInputElement,                    //
      prepayment: HTMLInputElement,                     //
      stocksReturnRate: HTMLInputElement,               //
}

export const hintTypes = [
  'homeValue',
  'interestRate',
  'pointValue',
  'pmiEquityPercentage',
  'propertyTax',
  'residentialExemption',
  'mortgageTerm',
  'downPayment',
  'paymentsAlreadyMade',
  'stocksReturnRate',
] as const;

export type HintType = typeof hintTypes[number];

export const outputTypes = [
  'loanAmount',
  'principalAndInterest',
  'monthlyPaymentAmount',
  'monthlyPaymentPmi',
  'pmiPaymentTimeline',
  'lifetimeOfLoan',
  'lifetimePayment',
  'purchasePayment',
  'totalPaidSoFar',
  'equityOwnedSoFar',
  'totalLoanOwed',
  'remainingEquity',
  'debtToIncome',
  'firedTomorrowCountdown',
  'prepayComparison',
  'stocksComparison',
] as const;

export type OutputType = typeof outputTypes[number];

export const conditionalContainers = [
  'monthly-payment-pmi-div',
  'months-of-pmi-div',
  'fired-tomorrow-countdown-div',
  'total-paid-so-far-div',
  'equity-owned-so-far-div',
  'total-loan-owed-div',
  'remaining-equity-to-pay-for-div',
  'debt-to-income-ratio-div',
] as const;

export type ConditionalContainer = typeof conditionalContainers[number];

export const conditionalContainerMap:
    Record<ConditionalContainer, OutputType> = {
      'monthly-payment-pmi-div': 'monthlyPaymentPmi',
      'months-of-pmi-div': 'pmiPaymentTimeline',
      'fired-tomorrow-countdown-div': 'firedTomorrowCountdown',
      'total-paid-so-far-div': 'totalPaidSoFar',
      'equity-owned-so-far-div': 'equityOwnedSoFar',
      'total-loan-owed-div': 'totalLoanOwed',
      'remaining-equity-to-pay-for-div': 'remainingEquity',
      'debt-to-income-ratio-div': 'debtToIncome',
    };

export const templateTypes = [
  'mortgage-term',
  'prepay-amount',
] as const;

export type TemplateType = typeof templateTypes[number];

export interface Elements {
  inputs: Inputs,                                //
      outputs: Record<OutputType, HTMLElement>,  //
      hints: Record<HintType, HTMLElement>,      //
      clearInputsButton: HTMLElement,            //
}

export interface Outputs {
  outputs: Record<OutputType, string|ConditionalOutput>,  //
      hints: Record<HintType, string>,                    //
      templates: Record<TemplateType, string>,            //
}

export interface Margin {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Conditional {
  container: ConditionalContainer;
  generateOutput(): string;
}
