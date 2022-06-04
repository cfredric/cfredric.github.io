import {PaymentRecordWithMonth} from './types';

export interface Schedules {
  pointwise: readonly PaymentRecordWithMonth[];
  cumulative: readonly PaymentRecordWithMonth[];
}