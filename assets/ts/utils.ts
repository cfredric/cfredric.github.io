import * as d3 from 'd3';
import {Decimal} from 'decimal.js';

import {Context} from './context';
import {HidableOutput} from './hidable_output';
import {HidableContainer, hidableContainers, HintType, InputEntry, loanPaymentTypes, nonLoanPaymentTypes, OutputType, PaymentRecord, PaymentRecordWithMonth, PaymentType, paymentTypes, Schedules, TemplateType, templateTypes} from './types';

const timeFormat = new Intl.DateTimeFormat();

// Returns the numeric value of the input element, or 0 if the input was empty.
export function orZeroN(elt: HTMLInputElement): number {
  const num = Number.parseFloat(elt.value);
  return Number.isNaN(num) ? 0 : num;
}
// Decimal version of the above.
export function orZero(elt: HTMLInputElement): Decimal {
  const str = elt.value;
  if (Number.isNaN(Number.parseFloat(str))) return new Decimal(0);
  return new Decimal(str);
}
// Returns the numberic value of the input element, or undefined.
export function orUndef(elt: HTMLInputElement): Decimal|undefined {
  const str = elt.value;
  if (Number.isNaN(Number.parseFloat(str))) return undefined;
  return new Decimal(str);
}
// Returns the HTMLInputElement with the given ID, or throws an informative
// error.
export function getInputElt(id: string): HTMLInputElement {
  const elt = document.getElementById(id);
  if (!(elt instanceof HTMLInputElement))
    throw new Error(`${id} element is not an HTMLInputElement`);
  return elt;
}
// Returns the HTMLElement with the given ID, or throws an informative error.
export function getHtmlElt(id: string): HTMLElement {
  const elt = document.getElementById(id);
  if (!(elt instanceof HTMLElement))
    throw new Error(`${id} element is not an HTMLElement`);
  return elt;
}

export function setClassVisibility(className: string, visible: boolean) {
  const value = visible ? '' : 'none';
  for (const elt of Array.from(document.getElementsByClassName(className))) {
    if (!(elt instanceof HTMLElement)) continue;
    elt.style.display = value;
  }
}

// Counts the number of elements of `data` which satisfy `predicate`.
export function countSatisfying<T>(
    data: readonly T[], predicate: (t: T) => boolean): number {
  let count = 0;
  for (const t of data)
    if (predicate(t)) ++count;
  return count;
}

// Counts the number of months between `from` and `to`. I.e., how many times the
// "month" part of the date has changed.
export function computeMonthDiff(from: Date, to: Date) {
  // Computations are kept in local time, since that's what the user provided.
  // (Importantly, the user might have specified the first of a month, which
  // if converted to UTC, could become the last of the previous month. We want
  // to avoid artificially changing the month like that.)
  return Math.max(0, d3.timeMonth.count(from, to));
}

// Sums the given keys in a record.
export function sumOfKeys<T extends string>(
    data: Record<T, Decimal>, keys: readonly T[]) {
  return Decimal.sum(...keys.map(key => data[key]));
}

// Returns an array where the ith element is an object with the amount paid of
// each type before (and excluding) the ith month.
export function cumulativeSumByFields(
    data: readonly PaymentRecordWithMonth[],
    fields: readonly PaymentType[]): PaymentRecordWithMonth[] {
  const results = new Array<PaymentRecordWithMonth>(data.length + 1);
  results[0] = {
    month: 0,
    data: mkRecord(fields, () => new Decimal(0)),
  };
  for (const [idx, datum] of data.entries()) {
    results[idx + 1] = {
      data: mkRecord(fields, (f) => datum.data[f].add(results[idx]!.data[f])),
      month: datum.month,
    };
  }
  return results;
}

// Returns the number of payments that can be made with the given total assets,
// taking previously-made payments into account.
export function countBurndownMonths(
    startingAssets: Decimal, schedule: readonly PaymentRecord[],
    monthlyDebt: Decimal): number {
  let assets = startingAssets;
  for (const [i, data] of schedule.entries()) {
    const due = sumOfKeys(data, paymentTypes).add(monthlyDebt);
    if (due.gt(assets)) return i;
    assets = assets.sub(due);
  }

  const totalMonthlyExpenses = monthlyDebt.add(
      schedule.length ? sumOfKeys(schedule[0]!, nonLoanPaymentTypes) : 0);
  return schedule.length +
      Decimal.floor(assets.div(totalMonthlyExpenses)).toNumber();
}

// Formats a number of months into an integral number of years and integral
// number of months.
export function formatMonthNum(m: number, baseDate?: Date) {
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
    str += ` (${timeFormat.format(d3.timeMonth.offset(baseDate, m))})`;
  }
  return str;
}

export function maxNonEmptyDate(...ds: (Date|undefined)[]): Date|undefined {
  return d3.greatest(ds, d => d === undefined ? NaN : d.valueOf());
}

// Deletes the given parameter in `url`, if it exists. Returns true if `url` was
// modified.
export function deleteParam(url: URL, name: string): boolean {
  const hadValue = url.searchParams.has(name);
  url.searchParams.delete(name);
  return hadValue;
}

// Updates the value of the given URL parameter in `url`.
export function updateURLParam(
    url: URL, elt: HTMLInputElement, entry: InputEntry): boolean {
  if (entry.deprecated) return false;
  let value;
  let hasValue;
  switch (elt.type) {
    case 'text':
    case 'date':
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
}

// Returns the first non-zero argument, or zero if all arguments are zero (or
// none are provided).
export function chooseNonzero(...xs: readonly Decimal[]): Decimal {
  for (const x of xs) {
    if (!x.eq(0)) return x;
  }
  return new Decimal(0);
}

// Computes the total stock assets at the end of `schedule`, assuming a given
// annual rate of return and monthly compounding.
export function computeStockAssets(
    schedule: readonly Decimal[], annualReturnRate: Decimal): Decimal {
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
  const monthlyScaleFactor = annualReturnRate.add(1).pow(Decimal.div(1, 12));

  let assets = new Decimal(0);
  for (const investment of schedule) {
    assets = assets.mul(monthlyScaleFactor).add(investment);
  }
  return assets;
}

export function fillTemplateElts(className: TemplateType, value: string) {
  for (const elt of Array.from(document.getElementsByClassName(className))) {
    if (!(elt instanceof HTMLElement)) continue;
    elt.innerText = value;
  }
}

// Computes the sum of principal + interest to be paid each month of the loan.
export function computeAmortizedPaymentAmount(
    P: Decimal, r: Decimal, n: number): Decimal {
  // Let P = the loan amount (principal),
  //     r = the annual interest rate / 12,
  //     n = the number of pay installments
  //
  // Then:
  // monthly principal + interest = P*r*(1+r)^n / ((1+r)^n - 1)

  const onePlusRToTheN = r.add(1).pow(n);
  return P.mul(r).mul(onePlusRToTheN).div(onePlusRToTheN.sub(1));
}

// Computes the payment for each month of the loan.
export function calculatePaymentSchedule(ctx: Context):
    PaymentRecordWithMonth[] {
  let equityOwned = ctx.downPayment;
  const schedule: PaymentRecordWithMonth[] = [];
  for (const month of d3.range(ctx.n)) {
    const principalRemaining = ctx.price.sub(equityOwned);
    const interestPayment = ctx.interestRate.div(12).mul(principalRemaining);
    const pmiPayment = equityOwned.lt(ctx.pmiEquityPct.mul(ctx.price)) ?
        ctx.pmi :
        new Decimal(0);
    const principalPaidThisMonth = ctx.monthlyLoanPayment.sub(interestPayment)
                                       .clamp(0, principalRemaining);
    equityOwned = equityOwned.add(principalPaidThisMonth);
    schedule.push({
      month: month + 1,
      data: {
        interest: interestPayment,
        principal: principalPaidThisMonth,
        pmi: pmiPayment,
        hoa: ctx.hoa,
        property_tax: ctx.propertyTax,
        homeowners_insurance: ctx.homeownersInsurance,
      },
    });
  }
  return schedule;
}

// Updates the value of the given cookie.
function updateCookie(elt: HTMLInputElement, entry: InputEntry) {
  if (entry.deprecated) return;
  let value;
  let hasValue;
  switch (elt.type) {
    case 'text':
      value = elt.value;
      hasValue = value !== '';
      break;
    case 'checkbox':
      value = '1';
      hasValue = elt.checked;
      break;
    default:
      throw new Error('unreachable');
  }
  if (hasValue) {
    setCookie(entry.name, value);
  } else {
    deleteCookie(entry.name);
  }
}

const COOKIE_ATTRIBUTES: Readonly<string[]> = [
  'Secure',
  'SameSite=Lax',
  `Domain=${window.location.hostname}`,
  'Path=/Mortgage',
];

const COOKIE_SUFFIX = COOKIE_ATTRIBUTES
                          .concat([
                            `max-age=${60 * 60 * 24 * 365 * 10}`,
                          ])
                          .join(';');

const COOKIE_SUFFIX_DELETE = COOKIE_ATTRIBUTES.concat([
  `max-age=0`,
])

// Sets the value of the cookie with the given name.
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};${COOKIE_SUFFIX}`;
}

// "Deletes" the cookie with the given name. This doesn't seem to really delete
// the cookie; it just makes it a session cookie, so that it won't be present in
// the next session of the browser.
export function deleteCookie(name: string) {
  document.cookie = `${name}=0;${COOKIE_SUFFIX_DELETE}`;
}

// Saves fields to the URL and cookies.
export function saveFields(
    urlParams: Readonly<Map<HTMLInputElement, InputEntry>>,
    cookieValues: Readonly<Map<HTMLInputElement, InputEntry>>,
    changed?: HTMLInputElement): void {
  const url = new URL(location.href);
  let urlChanged = false;
  if (changed) {
    if (urlParams.has(changed)) {
      urlChanged =
          urlChanged || updateURLParam(url, changed, urlParams.get(changed)!);
    }
    if (cookieValues.has(changed))
      updateCookie(changed, cookieValues.get(changed)!);
  } else {
    for (const [elt, entry] of urlParams.entries()) {
      urlChanged = urlChanged || updateURLParam(url, elt, entry);
    }
    for (const [elt, entry] of cookieValues.entries()) {
      updateCookie(elt, entry);
    }
  }
  if (urlChanged) history.pushState({}, '', url.toString());
}

// Clears out deprecated URL params and cookies.
export function clearDeprecatedStorage(
    urlParams: Readonly<Map<HTMLInputElement, InputEntry>>,
    cookieValues: Readonly<Map<HTMLInputElement, InputEntry>>) {
  const url = new URL(location.href);
  let modified = false;
  for (const {name, deprecated} of urlParams.values())
    if (deprecated) modified = deleteParam(url, name) || modified;

  if (modified) history.pushState({}, '', url.toString());

  for (const {name, deprecated} of cookieValues.values())
    if (deprecated) deleteCookie(name);
}

export function removeChildren(node: Node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function makeTable(
    headers: readonly string[], rows: readonly string[][]): HTMLTableElement {
  const table = document.createElement('table');
  const headRow = table.createTHead().insertRow();
  for (const h of headers) {
    const cell = headRow.insertCell();
    cell.innerText = h;
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    for (const cell of row) {
      const tc = tr.insertCell();
      tc.innerText = cell;
    }
  }

  return table;
}

export function toCapitalized(paymentType: PaymentType): string {
  switch (paymentType) {
    case 'principal':
      return 'Principal';
    case 'interest':
      return 'Interest';
    case 'hoa':
      return 'HOA';
    case 'property_tax':
      return 'Property Tax';
    case 'homeowners_insurance':
      return 'Homeowners\' Insurance';
    case 'pmi':
      return 'PMI';
  }
}

// Creates a record with a specific value for each key.
export function mkRecord<K extends string, V>(
    ks: readonly K[], v: (k: K) => V): Record<K, V> {
  const record = {} as Record<K, V>;
  for (const k of ks) {
    record[k] = v(k);
  }
  return record;
}

export function computeSchedules(ctx: Context): Schedules|undefined {
  if (!ctx.showMonthlySchedule) return undefined;

  const pointwise = calculatePaymentSchedule(ctx);
  return {
    pointwise,
    cumulative: cumulativeSumByFields(pointwise, paymentTypes),
  };
}

// Compute hint strings and set output strings.
export function computeContents(
    ctx: Context, fmt: Intl.NumberFormat,
    schedules: Schedules|undefined): Record<OutputType, string> {
  const showPrepaymentComparison = ctx.prepayment.gt(0);
  setClassVisibility('prepay', showPrepaymentComparison);

  const loanAmount = `${fmt.format(ctx.price.sub(ctx.downPayment).toNumber())}`;

  const purchasePayment = `${
      fmt.format(Decimal
                     .sum(
                         ctx.downPayment,
                         ctx.closingCost,
                         ctx.price.sub(ctx.downPayment)
                             .mul(ctx.pointsPurchased)
                             .div(100),
                         )
                     .toNumber())}`;

  if (!schedules) {
    return {
      loanAmount,
      purchasePayment,
      lifetimeOfLoan: '',
      lifetimePayment: '',
      monthlyPaymentAmount: '',
      prepayComparison: '',
      principalAndInterest: '',
      stocksComparison: '',
    };
  }

  const {pointwise, cumulative} = schedules;

  const principalAndInterest =
      `${fmt.format(ctx.monthlyLoanPayment.toNumber())}`;

  const monthlyPaymentAmount = `${
      fmt.format(
          ctx.monthlyLoanPayment.add(ctx.monthlyNonLoanPayment).toNumber())}`;
  let lifetimeOfLoan;
  let lifetimePayment;
  if (!ctx.m.eq(0)) {
    lifetimeOfLoan = `${
        formatMonthNum(
            countSatisfying(pointwise, m => m.data.principal.gt(0)),
            ctx.closingDate)}`
    lifetimePayment = `${
        fmt.format(

            sumOfKeys(cumulative[cumulative.length - 1]!.data, loanPaymentTypes)
                .toNumber())}`;
  } else {
    lifetimePayment = `${fmt.format(0)}`;
    lifetimeOfLoan = '';
  }

  // Show the comparison between prepayment and investment, if relevant.
  let prepayComparison;
  let stocksComparison;
  if (showPrepaymentComparison) {
    prepayComparison = `${
        fmt.format(computeStockAssets(
                       pointwise
                           .map(
                               m => ctx.monthlyLoanPayment.sub(Decimal.sum(
                                   m.data.interest, m.data.principal)))
                           .filter(x => !x.eq(0)),
                       ctx.stocksReturnRate)
                       .toNumber())}`;

    stocksComparison = `${
        fmt.format(
            computeStockAssets(
                new Array(ctx.n).fill(ctx.prepayment), ctx.stocksReturnRate)
                .toNumber())}`;
  } else {
    prepayComparison = '';
    stocksComparison = '';
  }

  return {
    loanAmount,
    purchasePayment,
    principalAndInterest,
    monthlyPaymentAmount,
    lifetimeOfLoan,
    lifetimePayment,
    prepayComparison,
    stocksComparison,
  };
}

export function computeHidables(
    ctx: Context, fmt: Intl.NumberFormat, pctFmt: Intl.NumberFormat,
    schedules: Schedules|undefined): Record<HidableContainer, HidableOutput> {
  if (!schedules) return mkRecord(hidableContainers, () => new HidableOutput());
  const {pointwise, cumulative} = schedules;
  let monthlyPaymentPmi;
  let monthsOfPmi;
  if (ctx.pmi.gt(0) && ctx.downPaymentPct.lt(ctx.pmiEquityPct)) {
    monthlyPaymentPmi = new HidableOutput(
        `${
            fmt.format(Decimal
                           .sum(
                               ctx.monthlyLoanPayment,
                               ctx.monthlyNonLoanPayment, ctx.pmi)
                           .toNumber())}`,
    );
    const pmiMonths =
        countSatisfying(pointwise, payment => !payment.data.pmi.eq(0));
    monthsOfPmi = new HidableOutput(`${formatMonthNum(pmiMonths)} (${
        fmt.format(ctx.pmi.mul(pmiMonths).toNumber())} total)`);
  } else {
    monthlyPaymentPmi = new HidableOutput();
    monthsOfPmi = new HidableOutput();
  }

  let firedTomorrowCountdown;
  if (!ctx.totalAssets.eq(0)) {
    firedTomorrowCountdown = new HidableOutput(`${
        formatMonthNum(
            countBurndownMonths(
                ctx.totalAssets.sub(
                    (ctx.alreadyClosed ? new Decimal(0) :
                                         ctx.downPayment.add(ctx.closingCost))),
                pointwise.slice(ctx.paymentsAlreadyMade).map(d => d.data),
                ctx.monthlyDebt),
            maxNonEmptyDate(
                ctx.closingDate, d3.timeMonth.floor(new Date())))}`);
  } else {
    firedTomorrowCountdown = new HidableOutput();
  }

  let totalPaidSoFar;
  let equityOwnedSoFar;
  let totalLoanOwed;
  let remainingEquityToPayFor;
  if (!!ctx.paymentsAlreadyMade || ctx.alreadyClosed) {
    const absoluteEquityOwned =
        (ctx.alreadyClosed ? ctx.downPayment : new Decimal(0))
            .add(cumulative[ctx.paymentsAlreadyMade]!.data.principal);

    totalPaidSoFar = new HidableOutput(`${
        fmt.format(
            (ctx.alreadyClosed ? ctx.closingCost.add(ctx.downPayment) :
                                 new Decimal(0))
                .add(sumOfKeys(
                    cumulative[ctx.paymentsAlreadyMade]!.data, paymentTypes))
                .toNumber())}`);
    equityOwnedSoFar = new HidableOutput(
        `${pctFmt.format(absoluteEquityOwned.div(ctx.homeValue).toNumber())} (${
            fmt.format(absoluteEquityOwned.toNumber())})`);
    const totalPrincipalAndInterestPaid =
        sumOfKeys(cumulative[ctx.paymentsAlreadyMade]!.data, loanPaymentTypes);
    const totalPrincipalAndInterestToPay =
        sumOfKeys(cumulative[cumulative.length - 1]!.data, loanPaymentTypes);
    totalLoanOwed = new HidableOutput(`${
        fmt.format(
            totalPrincipalAndInterestToPay.sub(totalPrincipalAndInterestPaid)
                .toNumber())}`);
    remainingEquityToPayFor = new HidableOutput(
        `${fmt.format(ctx.price.sub(absoluteEquityOwned).toNumber())}`);
  } else {
    totalPaidSoFar = new HidableOutput();
    equityOwnedSoFar = new HidableOutput();
    totalLoanOwed = new HidableOutput();
    remainingEquityToPayFor = new HidableOutput();
  }

  let debtToIncomeRatio;
  if (ctx.annualIncome.gt(0)) {
    debtToIncomeRatio = new HidableOutput(
        `${
            pctFmt.format(Decimal
                              .sum(
                                  ctx.monthlyDebt, ctx.monthlyLoanPayment,
                                  ctx.monthlyNonLoanPayment, ctx.pmi)
                              .div(ctx.annualIncome)
                              .mul(12)
                              .toNumber())}`,
    );
  } else {
    debtToIncomeRatio = new HidableOutput();
  }

  return {
    ['monthly-payment-pmi-div']: monthlyPaymentPmi,
    ['months-of-pmi-div']: monthsOfPmi,
    ['fired-tomorrow-countdown-div']: firedTomorrowCountdown,
    ['total-paid-so-far-div']: totalPaidSoFar,
    ['equity-owned-so-far-div']: equityOwnedSoFar,
    ['total-loan-owed-div']: totalLoanOwed,
    ['remaining-equity-to-pay-for-div']: remainingEquityToPayFor,
    ['debt-to-income-ratio-div']: debtToIncomeRatio,
  };
}

export function computeTemplates(
    ctx: Context, fmt: Intl.NumberFormat): Record<TemplateType, string> {
  if (ctx.prepayment.gt(0)) {
    return {
      'mortgage-term': formatMonthNum(ctx.n),
      'prepay-amount': fmt.format(ctx.prepayment.toNumber()),
    };
  }
  return mkRecord(templateTypes, () => '');
}

// Updates the "hints"/previews displayed alongside the input fields.
export function computeAmountHints(
    ctx: Context, fmt: Intl.NumberFormat, pctFmt: Intl.NumberFormat,
    hundredthsPctFmt: Intl.NumberFormat): Record<HintType, string> {
  return {
    'homeValue': `(${fmt.format(ctx.homeValue.toNumber())})`,
    'downPayment': `(${fmt.format(ctx.downPayment.toNumber())})`,
    'interestRate': `(${hundredthsPctFmt.format(ctx.interestRate.toNumber())})`,
    'pointValue': `(${hundredthsPctFmt.format(ctx.pointValue.toNumber())})`,
    'pmiEquityPercentage': `(${pctFmt.format(ctx.pmiEquityPct.toNumber())})`,
    'propertyTax': `(Effective ${
        fmt.format(ctx.propertyTax.mul(12)
                       .div(ctx.homeValue)
                       .mul(1000)
                       .toNumber())} / $1000; ${
        fmt.format(ctx.propertyTax.toNumber())}/mo)`,
    'residentialExemption':
        `(${fmt.format(ctx.residentialExemptionPerMonth.toNumber())}/mo)`,
    'mortgageTerm': `(${ctx.mortgageTerm} yrs)`,
    'paymentsAlreadyMade': `(${ctx.paymentsAlreadyMade} payments)`,
    'stocksReturnRate':
        `(${hundredthsPctFmt.format(ctx.stocksReturnRate.toNumber())})`,
  };
}