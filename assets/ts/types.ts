import {Decimal} from 'decimal.js';

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

export interface Hints {
  homeValue: HTMLElement,                 //
      interestRate: HTMLElement,          //
      pointValue: HTMLElement,            //
      pmiEquityPercentage: HTMLElement,   //
      propertyTax: HTMLElement,           //
      residentialExemption: HTMLElement,  //
      mortgageTerm: HTMLElement,          //
      downPayment: HTMLElement,           //
      paymentsAlreadyMade: HTMLElement,   //
      stocksReturnRate: HTMLElement,      //
}

export enum OutputType {
  loanAmount,
  principalAndInterest,
  monthlyPaymentAmount,
  monthlyPaymentPmi,
  pmiPaymentTimeline,
  lifetimeOfLoan,
  lifetimePayment,
  purchasePayment,
  totalPaidSoFar,
  equityOwnedSoFar,
  totalLoanOwed,
  remainingEquity,
  debtToIncome,
  firedTomorrowCountdown,
  prepayComparison,
  stocksComparison,
}

export interface Elements {
  inputs: Inputs, outputs: Record<OutputType, HTMLElement>, hints: Hints,
      clearInputsButton: HTMLElement,
}

export interface Margin {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ConditionalOutput {
  containerName: string;
  outputElt: HTMLElement;
  generateOutput(): string;
}
