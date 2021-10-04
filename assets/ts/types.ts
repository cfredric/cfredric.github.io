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