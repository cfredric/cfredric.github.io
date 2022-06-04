import {PaymentRecordWithMonth} from './types';

export class Schedules {
  private points: readonly PaymentRecordWithMonth[];
  private cumulatives: readonly PaymentRecordWithMonth[];

  constructor(
      pointwise: readonly PaymentRecordWithMonth[],
      cumulative: readonly PaymentRecordWithMonth[]) {
    this.points = pointwise;
    this.cumulatives = cumulative;
  }

  pointwise(): readonly PaymentRecordWithMonth[] {
    return this.points;
  }

  cumulative(): readonly PaymentRecordWithMonth[] {
    return this.cumulatives;
  }
}