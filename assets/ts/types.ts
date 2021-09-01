export const keys = [
  'principal',
  'interest',
  'hoa',
  'property_tax',
  'homeowners_insurance',
  'pmi',
] as const;

export const nonLoanKeys =
    ['hoa', 'property_tax', 'homeowners_insurance'] as const;

export type PaymentType = typeof keys[number];

export type PaymentRecord = Record<PaymentType, number>;

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