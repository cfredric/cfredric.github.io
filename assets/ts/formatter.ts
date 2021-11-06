
export class Formatter {
  readonly fmt: Intl.NumberFormat;
  readonly pctFmt: Intl.NumberFormat;
  readonly hundredthsPctFmt: Intl.NumberFormat;
  constructor(
      fmt: Intl.NumberFormat, pctFmt: Intl.NumberFormat,
      hundredthsPctFmt: Intl.NumberFormat) {
    this.fmt = fmt;
    this.pctFmt = pctFmt;
    this.hundredthsPctFmt = hundredthsPctFmt;
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
}