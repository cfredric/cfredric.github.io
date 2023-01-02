import * as d3 from 'd3';

import {Num} from './num';

export class FormatResult {
  readonly value: string;
  readonly derivation?: string;

  constructor(value: string, derivation?: string) {
    this.value = value;
    this.derivation = derivation;
  }

  map(f: (value: string) => string): FormatResult {
    return new FormatResult(f(this.value), this.derivation);
  }
}

export class Formatter {
  private showDerivations: boolean;
  private simplifyDerivations: boolean;
  readonly fmt: Intl.NumberFormat;
  readonly pctFmt: Intl.NumberFormat;
  readonly hundredthsPctFmt: Intl.NumberFormat;
  readonly timeFormat: Intl.DateTimeFormat;

  constructor(
      fmt: Intl.NumberFormat, pctFmt: Intl.NumberFormat,
      hundredthsPctFmt: Intl.NumberFormat, timeFormat: Intl.DateTimeFormat) {
    this.showDerivations = false;
    this.simplifyDerivations = false;
    this.fmt = fmt;
    this.pctFmt = pctFmt;
    this.hundredthsPctFmt = hundredthsPctFmt;
    this.timeFormat = timeFormat;
  }

  setDerivationParams(show: boolean, simplify: boolean) {
    this.showDerivations = show;
    this.simplifyDerivations = simplify;
  }

  formatCurrency(n: Num): string {
    return this.fmt.format(n.toNumber());
  }
  formatCurrencyWithDerivation(n: Num): FormatResult {
    const value = this.formatCurrency(n);
    if (this.showDerivations) {
      const exp = this.simplifyDerivations ? n.simplify() : n;
      return new FormatResult(value, exp.prettyPrint());
    }
    return new FormatResult(value);
  }

  formatPercent(p: Num): string {
    return this.pctFmt.format(p.toNumber());
  }
  formatPercentWithDerivation(p: Num): FormatResult {
    const value = this.formatPercent(p);
    if (this.showDerivations) {
      const exp = this.simplifyDerivations ? p.simplify() : p;
      return new FormatResult(value, exp.prettyPrint());
    }
    return new FormatResult(value);
  }

  formatHundredthsPercent(p: Num): string {
    return this.hundredthsPctFmt.format(p.toNumber());
  }
  formatHundredthsPercentWithDerivation(p: Num): FormatResult {
    const value = this.formatHundredthsPercent(p);
    if (this.showDerivations) {
      const exp = this.simplifyDerivations ? p.simplify() : p;
      return new FormatResult(value, exp.prettyPrint());
    }
    return new FormatResult(value);
  }

  /**
   * Formats a number of months into an integral number of years and integral
   * number of months.
   */
  formatMonthNum(m: number, baseDate?: Date): string {
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