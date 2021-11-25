import * as d3 from 'd3';

export class Formatter {
  readonly fmt: Intl.NumberFormat;
  readonly pctFmt: Intl.NumberFormat;
  readonly hundredthsPctFmt: Intl.NumberFormat;
  readonly timeFormat: Intl.DateTimeFormat;

  constructor(
      fmt: Intl.NumberFormat, pctFmt: Intl.NumberFormat,
      hundredthsPctFmt: Intl.NumberFormat, timeFormat: Intl.DateTimeFormat) {
    this.fmt = fmt;
    this.pctFmt = pctFmt;
    this.hundredthsPctFmt = hundredthsPctFmt;
    this.timeFormat = timeFormat;
  }

  formatCurrency(n: number): string {
    return this.fmt.format(n);
  }

  formatPercent(p: number): string {
    return this.pctFmt.format(p);
  }

  formatHundredthsPercent(p: number): string {
    return this.hundredthsPctFmt.format(p);
  }

  // Formats a number of months into an integral number of years and integral
  // number of months.
  formatMonthNum(m: number, baseDate?: Date) {
    if (!Number.isFinite(m)) {
      if (Number.isNaN(m)) return 'NaN';
      if (m > 0) return 'forever';
    }
    let str;
    if (m <= 0) {
      str = '0mo';
    } else {
      const years = Math.floor(m / 12);
      const months = m % 12;

      str = years !== 0 ? `${years}y ` : '';
      if (months !== 0) str += `${months}mo`;

      str = str.trim();
    }
    if (baseDate) {
      str += ` (${this.timeFormat.format(d3.timeMonth.offset(baseDate, m))})`;
    }
    return str;
  }
}