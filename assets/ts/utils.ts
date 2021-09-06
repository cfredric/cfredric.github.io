import {Decimal} from 'decimal.js';

import {InputEntry, keys, nonLoanKeys, PaymentRecord, PaymentRecordWithMonth, PaymentType} from './types';

// Returns the numeric value of the input element, or 0 if the input was empty.
export const orZeroN = (elt: HTMLInputElement): number => {
  const num = Number.parseFloat(elt.value);
  return Number.isNaN(num) ? 0 : num;
};
// Decimal version of the above.
export const orZero = (elt: HTMLInputElement): Decimal => {
  const str = elt.value;
  if (Number.isNaN(Number.parseFloat(str))) return new Decimal(0);
  return new Decimal(str);
};
// Returns the numberic value of the input element, or undefined.
export const orUndef = (elt: HTMLInputElement): Decimal|undefined => {
  const str = elt.value;
  if (Number.isNaN(Number.parseFloat(str))) return undefined;
  return new Decimal(str);
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
export const sumOfKeys = <T extends string,>(data: Record<T, Decimal>, keys: readonly T[]) =>
    Decimal.sum(...keys.map(key => data[key]));

// Returns an array where the ith element is an object with the amount paid of
// each type before (and excluding) the ith month.
export const cumulativeSumByFields =
    (data: readonly PaymentRecordWithMonth[], fields: readonly PaymentType[]):
        PaymentRecordWithMonth[] => {
          const results = new Array<PaymentRecordWithMonth>(data.length + 1);
          const record = {month: 0, data: {} as PaymentRecord};
          for (const k of fields) {
            record.data[k] = new Decimal(0);
          }
          results[0] = record;
          for (const [idx, datum] of data.entries()) {
            const newData = {} as PaymentRecord;
            for (const field of fields) {
              newData[field] = datum.data[field].add(results[idx]!.data[field]);
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
    (startingAssets: Decimal, schedule: readonly PaymentRecord[],
     monthlyDebt: Decimal): number => {
      let assets = startingAssets;
      for (const [i, data] of schedule.entries()) {
        const due = sumOfKeys(data, keys).add(monthlyDebt);
        if (due.gt(assets)) return i;
        assets = assets.sub(due);
      }
      return schedule.length +
          Decimal
              .floor(assets.div(
                  sumOfKeys(schedule[0]!, nonLoanKeys).add(monthlyDebt)))
              .toNumber();
    };

// Formats a number of months into an integral number of years and integral
// number of months.
export const formatMonthNum = (m: number):
    string => {
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

// Deletes the given parameter in `url`, if it exists. Returns true if `url` was
// modified.
export const deleteParam = (url: URL, name: string): boolean => {
  const hadValue = url.searchParams.has(name);
  url.searchParams.delete(name);
  return hadValue;
};

// Updates the value of the given URL parameter in `url`.
export const updateURLParam =
    (url: URL, elt: HTMLInputElement, entry: InputEntry): boolean => {
      if (entry.deprecated) return false;
      let value;
      let hasValue;
      switch (elt.type) {
        case 'text':
          value = encodeURIComponent(elt.value);
          hasValue = value !== '';
          break;
        case 'checkbox':
          value = '';
          hasValue = elt.checked;
          break;
        default:
          throw new Error('unreachable');
      }
      if (hasValue) {
        const result = !url.searchParams.has(entry.name) ||
            url.searchParams.get(entry.name) !== value;
        url.searchParams.set(entry.name, value);
        return result;
      }
      return deleteParam(url, entry.name);
    };

// Returns the first non-zero argument, or zero if all arguments are zero (or
// none are provided).
export const chooseNonzero = (...xs: readonly Decimal[]): Decimal => {
  for (const x of xs) {
    if (!x.eq(0)) return x;
  }
  return new Decimal(0);
};

// Computes the total stock assets at the end of `schedule`, assuming a given
// annual rate of return and monthly compounding.
export const computeStockAssets =
    (schedule: readonly Decimal[], annualReturnRate: Decimal): Decimal => {
      // Let Y = annual rate of return, M = monthly rate of return. Then:
      //
      // Y = (1 + M) ^ 12 - 1
      //
      // Solve for M:
      //
      // M = (Y + 1)^(1/12) - 1
      //
      // Since we scale `assets` by 1+M each month anyway, don't bother to
      // subtract 1:
      //
      // monthlyScaleFactor = M + 1 = (Y + 1)^(1/12)
      const monthlyScaleFactor =
          annualReturnRate.add(1).pow(Decimal.div(1, 12));

      let assets = new Decimal(0);
      for (const investment of schedule) {
        assets = assets.mul(monthlyScaleFactor).add(investment);
      }
      return assets;
    };

export const fillTemplateElts = (className: string, value: string) => {
  for (const elt of Array.from(document.getElementsByClassName(className))) {
    if (!(elt instanceof HTMLElement)) continue;
    elt.innerText = value;
  }
}