import * as d3 from 'd3';
import {keys, nonLoanKeys, PaymentRecord, PaymentRecordWithMonth, PaymentType} from './types';

// Returns the numeric value of the input element, or 0 if the input was empty.
export const orZero = (elt: HTMLInputElement): number => {
  const num = Number.parseFloat(elt.value);
  return Number.isNaN(num) ? 0 : num;
};
// Returns the HTMLInputElement with the given ID, or throws an informative
// error.
export const getInputElt = (id: string): HTMLInputElement => {
  const elt = document.getElementById(id);
  if (!(elt instanceof HTMLInputElement))
    throw new Error(`${id} element is not an HTMLInputElement`);
  return elt;
};
// Returns the HTMLElement with the given ID, or throws an informative error.
export const getHtmlElt = (id: string): HTMLElement => {
  const elt = document.getElementById(id);
  if (!(elt instanceof HTMLElement))
    throw new Error(`${id} element is not an HTMLElement`);
  return elt;
};

// Counts the number of elements of `data` which satisfy `predicate`.
export const countSatisfying = <T,>(data: readonly T[], predicate: (t: T) => boolean): number => {
    let count = 0;
    for (const t of data)
      if (predicate(t))
        ++count;
    return count;
  };

// Sums the given keys in a record.
export const sumOfKeys = <T extends string,>(data: Record<T, number>, keys: readonly T[]) =>
    d3.sum(keys.map(key => data[key]));

// Returns an array where the ith element is an object with the amount paid of
// each type before (and excluding) the ith month.
export const cumulativeSumByFields =
    (data: readonly PaymentRecordWithMonth[], fields: readonly PaymentType[]):
        PaymentRecordWithMonth[] => {
          const results = new Array<PaymentRecordWithMonth>(data.length + 1);
          const record = {month: 0, data: {} as PaymentRecord};
          for (const k of fields) {
            record.data[k] = 0;
          }
          results[0] = record;
          for (const [idx, datum] of data.entries()) {
            const newData = {} as PaymentRecord;
            for (const field of fields) {
              newData[field] = datum.data[field] + results[idx]!.data[field];
            }
            results[idx + 1] = {
              data: newData,
              month: datum.month + 1,
            };
          }
          return results;
        };

// Returns the number of payments that can be made with the given total assets,
// taking previously-made payments into account.
export const countBurndownMonths =
    (startingAssets: number, schedule: readonly PaymentRecord[],
     monthlyDebt: number): number => {
      let assets = startingAssets;
      for (const [i, data] of schedule.entries()) {
        const due = sumOfKeys(data, keys) + monthlyDebt;
        if (due >= assets) return i;
        assets -= due;
      }
      return schedule.length +
          Math.floor(
              assets / (sumOfKeys(schedule[0]!, nonLoanKeys) + monthlyDebt));
    };

// Formats a number of months into an integral number of years and integral
// number of months.
export const formatMonthNum = (m: number): string => {
  if (!Number.isFinite(m)) {
    if (Number.isNaN(m)) return 'NaN';
    if (m > 0) return 'forever';
  }
  if (m <= 0) return '0mo';

  const years = Math.floor(m / 12);
  const months = m % 12;

  let output = years !== 0 ? `${years}y ` : '';
  if (months !== 0) output += `${months}mo`;

  return output.trim();
}