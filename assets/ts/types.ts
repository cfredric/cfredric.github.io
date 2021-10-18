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

export interface Outputs {
  loanAmount: HTMLElement,                  //
      principalAndInterest: HTMLElement,    //
      monthlyPaymentAmount: HTMLElement,    //
      monthlyPaymentPmi: HTMLElement,       //
      pmiPaymentTimeline: HTMLElement,      //
      lifetimeOfLoan: HTMLElement,          //
      lifetimePayment: HTMLElement,         //
      purchasePayment: HTMLElement,         //
      totalPaidSoFar: HTMLElement,          //
      equityOwnedSoFar: HTMLElement,        //
      totalLoanOwed: HTMLElement,           //
      remainingEquity: HTMLElement,         //
      debtToIncome: HTMLElement,            //
      firedTomorrowCountdown: HTMLElement,  //
      prepayComparison: HTMLElement,        //
      stocksComparison: HTMLElement,        //
      clearInputsButton: HTMLElement,       //
}

export interface Elements {
  inputs: Inputs, outputs: Outputs, hints: Hints,
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