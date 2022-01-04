import * as d3 from 'd3';
import {Decimal} from 'decimal.js';

import {Context} from './context';
import {Formatter} from './formatter';
import {HidableOutput} from './hidable_output';
import {Literal, Num} from './num';
import {HidableContainer, hidableContainers, HintType, InputEntry, loanPaymentTypes, nonLoanPaymentTypes, OutputType, PaymentRecord, PaymentRecordWithMonth, PaymentType, paymentTypes, Schedules, TemplateType, templateTypes} from './types';

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
    data: Record<T, Num>, keys: readonly T[]) {
  return Num.sum(...keys.map(key => data[key]));
}

// Returns an array where the ith element is an object with the amount paid of
// each type before (and excluding) the ith month.
export function cumulativeSumByFields(
    data: readonly PaymentRecordWithMonth[],
    fields: readonly PaymentType[]): PaymentRecordWithMonth[] {
  const results = new Array<PaymentRecordWithMonth>(data.length + 1);
  results[0] = {
    month: 0,
    data: mkRecord(fields, () => new Literal(0)),
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
    startingAssets: Num, schedule: readonly PaymentRecord[],
    monthlyDebt: Num): number {
  let assets = startingAssets;
  for (const [i, data] of schedule.entries()) {
    const due = sumOfKeys(data, paymentTypes).add(monthlyDebt);
    if (due.gt(assets)) return i;
    assets = assets.sub(due);
  }

  const totalMonthlyExpenses = monthlyDebt.add(
      schedule.length ? sumOfKeys(schedule[0]!, nonLoanPaymentTypes) : 0);
  return schedule.length +
      Num.floor(assets.div(totalMonthlyExpenses)).toNumber();
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
export function chooseNonzero(...xs: readonly Num[]): Num {
  for (const x of xs) {
    if (!x.eq(0)) return x;
  }
  return new Literal(0);
}

// Computes the total stock assets at the end of `schedule`, assuming a given
// annual rate of return and monthly compounding.
export function computeStockAssets(
    schedule: readonly Num[], annualReturnRate: Num): Num {
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
  const monthlyScaleFactor = annualReturnRate.add(1).pow(Num.div(1, 12));

  let assets: Num = new Literal(0);
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
export function computeAmortizedPaymentAmount(P: Num, r: Num, n: Num): Num {
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
  for (const month of d3.range(ctx.n.value().toNumber())) {
    const principalRemaining = ctx.price.sub(equityOwned);
    const interestPayment = ctx.interestRate.div(12).mul(principalRemaining);
    const pmiPayment = equityOwned.lt(ctx.pmiEquityPct.mul(ctx.price)) ?
        ctx.pmi :
        new Literal(0);
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
  'max-age=0',
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
          updateURLParam(url, changed, urlParams.get(changed)!) || urlChanged;
    }
    if (cookieValues.has(changed))
      updateCookie(changed, cookieValues.get(changed)!);
  } else {
    for (const [elt, entry] of urlParams.entries()) {
      urlChanged = updateURLParam(url, elt, entry) || urlChanged;
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
    ctx: Context, fmt: Formatter,
    schedules: Schedules|undefined): Record<OutputType, string> {
  const showPrepaymentComparison = ctx.prepayment.gt(0);
  setClassVisibility('prepay', showPrepaymentComparison);

  const loanAmount = fmt.formatCurrency(ctx.loanAmount, true);

  const purchasePayment = fmt.formatCurrency(
      Num.sum(
          ctx.downPayment,
          ctx.closingCost,
          ctx.loanAmount.div(100).mul(ctx.pointsPurchased),
          ),
      true);

  if (!schedules) {
    return {
      loanAmount,
      purchasePayment,
      lifetimeOfLoan: '',
      lifetimePayment: '',
      monthlyExpensesAmount: '',
      prepayComparison: '',
      principalAndInterest: '',
      stocksComparison: '',
    };
  }

  const {pointwise, cumulative} = schedules;

  return {
    loanAmount,
    purchasePayment,
    lifetimeOfLoan: ctx.m.eq(0) ?
        '' :
        fmt.formatMonthNum(
            countSatisfying(pointwise, m => m.data.principal.gt(0)),
            ctx.closingDate),
    lifetimePayment: ctx.m.eq(0) ?
        fmt.formatCurrency(new Literal(0)) :
        fmt.formatCurrency(sumOfKeys(
            cumulative[cumulative.length - 1]!.data, loanPaymentTypes)),
    prepayComparison: showPrepaymentComparison ?
        fmt.formatCurrency(computeStockAssets(
            pointwise
                .map(
                    m => ctx.monthlyLoanPayment.sub(
                        Num.sum(m.data.interest, m.data.principal)))
                .filter(x => !x.eq(0)),
            ctx.stocksReturnRate)) :
        '',
    stocksComparison: showPrepaymentComparison ?
        fmt.formatCurrency(computeStockAssets(
            new Array(ctx.n.toNumber()).fill(ctx.prepayment),
            ctx.stocksReturnRate)) :
        '',
    principalAndInterest: fmt.formatCurrency(ctx.m, true),
    monthlyExpensesAmount: fmt.formatCurrency(
        ctx.monthlyLoanPayment.add(ctx.monthlyNonLoanPayment), true),
  };
}

export function computeHidables(
    ctx: Context, fmt: Formatter,
    schedules: Schedules|undefined): Record<HidableContainer, HidableOutput> {
  if (!schedules)
    return mkRecord(hidableContainers, (k) => new HidableOutput(k));
  const {pointwise, cumulative} = schedules;
  let monthlyExpensesPmi;
  let monthsOfPmi;
  if (ctx.pmi.gt(0) && ctx.downPaymentPct.lt(ctx.pmiEquityPct)) {
    monthlyExpensesPmi = new HidableOutput(
        'monthly-expenses-pmi-div',
        fmt.formatCurrency(
            Num.sum(ctx.monthlyLoanPayment, ctx.monthlyNonLoanPayment, ctx.pmi),
            true),
    );
    const pmiMonths =
        countSatisfying(pointwise, payment => !payment.data.pmi.eq(0));
    monthsOfPmi = new HidableOutput(
        'months-of-pmi-div',
        `${fmt.formatMonthNum(pmiMonths)} (${
            fmt.formatCurrency(ctx.pmi.mul(pmiMonths))} total)`);
  } else {
    monthlyExpensesPmi = new HidableOutput('monthly-expenses-pmi-div');
    monthsOfPmi = new HidableOutput('months-of-pmi-div');
  }

  let firedTomorrowCountdown;
  if (!ctx.totalAssets.eq(0)) {
    firedTomorrowCountdown = new HidableOutput(
        'fired-tomorrow-countdown-div',
        fmt.formatMonthNum(
            countBurndownMonths(
                ctx.totalAssets.sub(
                    (ctx.alreadyClosed ? new Literal(0) :
                                         ctx.downPayment.add(ctx.closingCost))),
                pointwise.slice(ctx.paymentsAlreadyMade).map(d => d.data),
                ctx.monthlyDebt),
            maxNonEmptyDate(ctx.closingDate, d3.timeMonth.floor(new Date()))));
  } else {
    firedTomorrowCountdown = new HidableOutput('fired-tomorrow-countdown-div');
  }

  let totalPaidSoFar;
  let equityOwnedSoFar;
  let totalLoanOwed;
  let remainingEquityToPayFor;
  if (!!ctx.paymentsAlreadyMade || ctx.alreadyClosed) {
    const absoluteEquityOwned =
        (ctx.alreadyClosed ? ctx.downPayment : new Literal(0))
            .add(cumulative[ctx.paymentsAlreadyMade]!.data.principal);

    totalPaidSoFar = new HidableOutput(
        'total-paid-so-far-div',
        fmt.formatCurrency(
            (ctx.alreadyClosed ? ctx.closingCost.add(ctx.downPayment) :
                                 new Literal(0))
                .add(sumOfKeys(
                    cumulative[ctx.paymentsAlreadyMade]!.data, paymentTypes))));
    equityOwnedSoFar = new HidableOutput(
        'equity-owned-so-far-div',
        `${fmt.formatPercent(absoluteEquityOwned.div(ctx.homeValue))} (${
            fmt.formatCurrency(absoluteEquityOwned)})`);
    const totalPrincipalAndInterestPaid =
        sumOfKeys(cumulative[ctx.paymentsAlreadyMade]!.data, loanPaymentTypes);
    const totalPrincipalAndInterestToPay =
        sumOfKeys(cumulative[cumulative.length - 1]!.data, loanPaymentTypes);
    totalLoanOwed = new HidableOutput(
        'total-loan-owed-div',
        fmt.formatCurrency(
            totalPrincipalAndInterestToPay.sub(totalPrincipalAndInterestPaid)));
    remainingEquityToPayFor = new HidableOutput(
        'remaining-equity-to-pay-for-div',
        fmt.formatCurrency(ctx.price.sub(absoluteEquityOwned)));
  } else {
    totalPaidSoFar = new HidableOutput('total-paid-so-far-div');
    equityOwnedSoFar = new HidableOutput('equity-owned-so-far-div');
    totalLoanOwed = new HidableOutput('total-loan-owed-div');
    remainingEquityToPayFor =
        new HidableOutput('remaining-equity-to-pay-for-div');
  }

  let debtToIncomeRatio;
  if (ctx.annualIncome.gt(0)) {
    debtToIncomeRatio = new HidableOutput(
        'debt-to-income-ratio-div',
        fmt.formatPercent(
            Num.sum(
                   ctx.monthlyDebt, ctx.monthlyLoanPayment,
                   ctx.monthlyNonLoanPayment, ctx.pmi)
                .div(ctx.annualIncome)
                .mul(12),
            true),
    );
  } else {
    debtToIncomeRatio = new HidableOutput('debt-to-income-ratio-div');
  }

  return {
    ['monthly-expenses-pmi-div']: monthlyExpensesPmi,
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
    ctx: Context, fmt: Formatter): Record<TemplateType, string> {
  if (ctx.prepayment.gt(0)) {
    return {
      'mortgage-term': fmt.formatMonthNum(ctx.n.toNumber()),
      'prepay-amount': fmt.formatCurrency(ctx.prepayment),
    };
  }
  return mkRecord(templateTypes, () => '');
}

// Updates the "hints"/previews displayed alongside the input fields.
export function computeAmountHints(
    ctx: Context, fmt: Formatter): Record<HintType, string> {
  return {
    homeValue: `(${fmt.formatCurrency(ctx.homeValue, true)})`,
    downPayment: `(${fmt.formatCurrency(ctx.downPayment, true)})`,
    interestRate: `(${fmt.formatHundredthsPercent(ctx.interestRate)})`,
    pointValue: `(${fmt.formatHundredthsPercent(ctx.pointValue)})`,
    pmiEquityPercentage: `(${fmt.formatPercent(ctx.pmiEquityPct, true)})`,
    propertyTax: `(Effective ${
        fmt.formatCurrency(
            ctx.propertyTax.mul(12).div(ctx.homeValue).mul(1000) ||
                new Literal(0),
            true)} / $1000; ${fmt.formatCurrency(ctx.propertyTax, true)}/mo)`,
    residentialExemption:
        `(${fmt.formatCurrency(ctx.residentialExemptionPerMonth, true)}/mo)`,
    mortgageTerm: `(${ctx.mortgageTerm.toNumber()} yrs)`,
    paymentsAlreadyMade: `(${ctx.paymentsAlreadyMade} payments)`,
    stocksReturnRate: `(${fmt.formatHundredthsPercent(ctx.stocksReturnRate)})`,
  };
}