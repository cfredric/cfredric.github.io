import * as d3 from 'd3';
import {Decimal} from 'decimal.js';
import katex from 'katex';

import {Context} from './context';
import {FormatResult, Formatter} from './formatter';
import {HidableOutput} from './hidable_output';
import {Num} from './num';
import {Schedules} from './schedules';
import {HidableContainer, HintType, InputEntry, loanPaymentTypes, nonLoanPaymentTypes, OutputType, PaymentRecordWithMonth, PaymentType, paymentTypes, PaymentTypeWithInitial, TemplateType} from './types';

/**
 * Returns the numeric value of the input element, or 0 if the input was empty.
 */
export function orZeroN(elt: HTMLInputElement): number {
  const num = Number.parseFloat(elt.value);
  return Number.isNaN(num) ? 0 : num;
}
/** Decimal version of the above. */
export function orZero(elt: HTMLInputElement): Decimal {
  const str = elt.value;
  if (Number.isNaN(Number.parseFloat(str))) return new Decimal(0);
  return new Decimal(str);
}
/** Returns the numberic value of the input element, or undefined. */
export function orUndef(elt: HTMLInputElement): Decimal|undefined {
  const str = elt.value;
  if (Number.isNaN(Number.parseFloat(str))) return undefined;
  return new Decimal(str);
}

/**
 * Asserts `condition`. If `condition` is not satsified, throws an error.
 * @param condition
 * @param message
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Returns the HTMLInputElement with the given ID, or throws an informative
 * error.
 */
export function getInputElt(id: string): HTMLInputElement {
  const elt = document.getElementById(id);
  assert(
      elt instanceof HTMLInputElement,
      `${id} element is not an HTMLInputElement`);
  return elt;
}
/**
 * Returns the HTMLElement with the given ID, or throws an informative error.
 */
export function getHtmlEltWithId(id: string): HTMLElement {
  const elt = document.getElementById(id);
  assert(elt instanceof HTMLElement, `${id} element is not an HTMLElement`);
  return elt;
}

/**
 * Sets the visibilities of the elements with the given class name to the given
 * visible/hidden state.
 */
export function setClassVisibility(className: string, visible: boolean) {
  const value = visible ? '' : 'none';
  for (const elt of Array.from(document.getElementsByClassName(className))) {
    if (!(elt instanceof HTMLElement)) continue;
    elt.style.display = value;
  }
}

/**
 * Sets the visibility of the given element to the given visibility/hidden
 * state.
 */
export function setEltVisibility(elt: HTMLElement, visible: boolean) {
  const value = visible ? '' : 'none';
  elt.style.display = value;
}

/**
 * Sets the content of the given element.
 */
export function setEltContent(e: HTMLElement, v: string|FormatResult) {
  if (typeof v === 'string') {
    e.innerText = v;
  } else {
    e.innerText = v.value;
    if (v.derivation) {
      const elt = document.createElement('span');
      elt.classList.add('derivation-elt');
      katex.render(` = ${v.derivation}`, elt);
      e.parentNode?.insertBefore(elt, e.nextSibling);
    }
  }
}

/** Counts the number of elements of `data` which satisfy `predicate`. */
export function countSatisfying<T>(
    data: readonly T[], predicate: (t: T) => boolean): number {
  let count = 0;
  for (const t of data)
    if (predicate(t)) ++count;
  return count;
}

/**
 * Counts the number of months between `from` and `to`. I.e., how many times
 * the "month" part of the date has changed.
 */
export function computeMonthDiff(from: Date, to: Date) {
  // Computations are kept in local time, since that's what the user provided.
  // (Importantly, the user might have specified the first of a month, which
  // if converted to UTC, could become the last of the previous month. We want
  // to avoid artificially changing the month like that.)
  return Math.max(0, d3.timeMonth.count(from, to));
}

/**
 * Converts a Date that represents a particular time (in UTC timezone) to a
 * Date that represents that same time (but in the local timezone).
 */
export function utcDateToLocalDate(d: Date): Date {
  return new Date(
      d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(),
      d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
}

/** Sums the given keys in a record. */
export function sumOfKeys<T extends string>(
    data: Record<T, Num>, keys: readonly T[]) {
  return Num.sum(...keys.map(key => data[key]));
}

/**
 * Returns the number of payments that can be made with the given total assets,
 * taking previously-made payments into account.
 */
export function countBurndownMonths(
    startingAssets: Num, schedule: readonly PaymentRecordWithMonth[],
    monthlyDebt: Num, paymentsAlreadyMade: number): number {
  let assets = startingAssets;
  for (let i = paymentsAlreadyMade; i < schedule.length; ++i) {
    const due = sumOfKeys(schedule[i]!.data, paymentTypes).add(monthlyDebt);
    if (due.gt(assets)) return i;
    assets = assets.sub(due);
  }

  const totalMonthlyExpenses = monthlyDebt.add(
      schedule.length ?
          sumOfKeys(schedule[paymentsAlreadyMade]!.data, nonLoanPaymentTypes) :
          0);
  return schedule.length +
      Num.floor(assets.div(totalMonthlyExpenses)).toNumber();
}

/**
 * Finds the maximum non-undefined Date of the input.
 */
export function maxNonEmptyDate(...ds: (Date|undefined)[]): Date|undefined {
  return d3.greatest(ds, d => d === undefined ? NaN : d.valueOf());
}

/**
 * Deletes the given parameter in `url`, if it exists. Returns true if `url`
 * was modified.
 */
export function deleteParam(url: URL, name: string): boolean {
  const hadValue = url.searchParams.has(name);
  url.searchParams.delete(name);
  return hadValue;
}

/** Updates the value of the given URL parameter in `url`. */
export function updateURLParam(
    url: URL, elt: HTMLInputElement, entry: InputEntry): boolean {
  if (entry.deprecated) return false;
  let value;
  let hasValue;
  switch (elt.type) {
    case 'text':
    case 'date':
    case 'month':
      value = encodeURIComponent(elt.value);
      hasValue = value !== '';
      break;
    case 'checkbox':
      value = '';
      hasValue = elt.checked;
      break;
    default:
      assert(false, 'unreachable');
  }
  if (hasValue) {
    const result = !url.searchParams.has(entry.name) ||
        url.searchParams.get(entry.name) !== value;
    url.searchParams.set(entry.name, value);
    return result;
  }
  return deleteParam(url, entry.name);
}

/**
 * Returns the first non-zero, non-NaN argument, or zero if all arguments are
 * zero (or none are provided).
 */
export function chooseNonzero(...xs: readonly Num[]): Num {
  for (const x of xs) {
    if (!x.eq(0) && !Number.isNaN(x.toNumber()) &&
        Number.isFinite(x.toNumber()))
      return x;
  }
  return Num.literal(0);
}

/**
 * Computes the total stock assets at the end of `schedule`, assuming a given
 * annual rate of return and monthly compounding.
 */
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

  let assets: Num = Num.literal(0);
  for (const investment of schedule) {
    assets = assets.mul(monthlyScaleFactor).add(investment);
  }
  return assets;
}

/**
 * Sets the contents of all the template elements with the given class name.
 */
export function fillTemplateElts(className: TemplateType, value: string) {
  for (const elt of Array.from(document.getElementsByClassName(className))) {
    if (!(elt instanceof HTMLElement)) continue;
    elt.innerText = value;
  }
}

/**
 * Computes the sum of principal + interest to be paid each month of the loan.
 */
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

/** Updates the value of the given entry in private storage. */
function updatePrivateStorage(elt: HTMLInputElement, entry: InputEntry) {
  if (entry.deprecated) return;
  let value;
  switch (elt.type) {
    case 'text':
      value = elt.value;
      break;
    case 'checkbox':
      value = elt.checked ? '1' : '0';
      break;
    default:
      assert(false, 'unreachable');
  }
  window.localStorage.setItem(entry.name, value);
}

/**
 * Generates the appropriate suffix to delete a cookie.
 */
function cookieSuffixDelete(): string {
  return [
    'Secure',
    'SameSite=Lax',
    `Domain=${window.location.hostname}`,
    'Path=/Mortgage',
    'max-age=0',
  ].join(';');
}

/**
 * "Deletes" the cookie with the given name. This doesn't seem to really delete
 * the cookie; it just makes it a session cookie, so that it won't be present in
 * the next session of the browser.
 */
export function deleteCookie(name: string) {
  document.cookie = `${name}=0;${cookieSuffixDelete()}`;
}

/** Saves fields to the URL and cookies. */
export function saveFields(
    urlParams: Readonly<Map<HTMLInputElement, InputEntry>>,
    privateValues: Readonly<Map<HTMLInputElement, InputEntry>>,
    changed?: HTMLInputElement): void {
  const url = new URL(location.href);
  let urlChanged = false;
  if (changed) {
    // Just check the one element that changed.
    if (urlParams.has(changed)) {
      urlChanged =
          updateURLParam(url, changed, urlParams.get(changed)!) || urlChanged;
    }
    if (privateValues.has(changed))
      updatePrivateStorage(changed, privateValues.get(changed)!);
  } else {
    // Check all elements, since we don't know what changed.
    for (const [elt, entry] of urlParams.entries()) {
      urlChanged = updateURLParam(url, elt, entry) || urlChanged;
    }
    for (const [elt, entry] of privateValues.entries()) {
      updatePrivateStorage(elt, entry);
    }
  }
  if (urlChanged) history.pushState({}, '', url.toString());
}

/** Clears out deprecated URL params and private storage. */
export function clearDeprecatedStorage(
    urlParams: Readonly<Map<HTMLInputElement, InputEntry>>,
    privateValues: Readonly<Map<HTMLInputElement, InputEntry>>,
    existingCookies: Readonly<Set<string>>) {
  const url = new URL(location.href);
  let modified = false;
  for (const {name, deprecated} of urlParams.values())
    if (deprecated) modified = deleteParam(url, name) || modified;

  if (modified) history.pushState({}, '', url.toString());

  for (const {name, deprecated} of privateValues.values()) {
    // We don't use cookies for any storage anymore, so delete any that exist.
    if (existingCookies.has(name)) deleteCookie(name);
    if (deprecated) window.localStorage.removeItem(name);
  }
}

/**
 * Removes all children of the given node.
 */
export function removeChildren(node: Node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function removeClass(className: string) {
  const elements = document.getElementsByClassName(className);
  while (elements.length > 0) {
    elements[0]!.parentNode!.removeChild(elements[0]!);
  }
}

function makePaymentTableHeader(
    firstColumnName: string, paymentTypes: readonly PaymentType[]): string[] {
  return [firstColumnName, ...paymentTypes.map(toCapitalized), 'Total'];
}

export function makeMonthlyTable(
    ctx: Context, fmt: Formatter, paymentTypes: readonly PaymentType[],
    data: readonly PaymentRecordWithMonth[]): HTMLTableElement {
  return makeTable(
      makePaymentTableHeader('Month', paymentTypes),
      data.map(
          (record: PaymentRecordWithMonth): string[] =>
              [fmt.formatMonthNum(record.month, ctx.closingDate),
               ...paymentTypes.map(ty => fmt.formatCurrency(record.data[ty])),
               fmt.formatCurrency(
                   Num.sum(...paymentTypes.map(k => record.data[k]))),
  ]));
}

export function makeYearlyTable(
    closingDate: Date, paymentTypes: readonly PaymentType[],
    data: readonly PaymentRecordWithMonth[],
    yearToColumns: (year: number, payments: PaymentRecordWithMonth[]) =>
        string[]): HTMLTableElement {
  const dataByYear = [
    ...d3
        .group(
            data,
            (payment) =>
                d3.timeMonth.offset(closingDate, payment.month).getFullYear())
        .entries()
  ].sort(([yearA], [yearB]) => d3.ascending(yearA, yearB));

  return makeTable(
      makePaymentTableHeader('Year', paymentTypes),
      dataByYear.map(([year, group]) => yearToColumns(year, group)));
}

function makeTable(
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

export function toCapitalized(input: PaymentTypeWithInitial): string {
  switch (input) {
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
    case 'initial':
      return 'Initial cost';
  }
}

/** Compute hint strings and set output strings. */
export function computeContents(
    ctx: Context, fmt: Formatter,
    schedules: Schedules|undefined): Record<OutputType, FormatResult|string> {
  const showPrepaymentComparison = ctx.prepayment.gt(0);
  setClassVisibility('prepay', showPrepaymentComparison);

  const loanAmount = fmt.formatCurrencyWithDerivation(ctx.loanAmount);

  const purchasePayment = fmt.formatCurrencyWithDerivation(ctx.purchasePayment);

  if (!schedules) {
    return {
      loanAmount,
      purchasePayment,
      annualPropertyTax: '',
      lifetimeOfLoan: '',
      lifetimePayment: '',
      monthlyExpensesAmount: '',
      prepayComparison: '',
      principalAndInterest: '',
      stocksComparison: '',
    };
  }

  return {
    loanAmount,
    purchasePayment,
    lifetimeOfLoan: ctx.m.eq(0) ?
        '' :
        fmt.formatMonthNum(
            countSatisfying(schedules.pointwise(), m => m.data.principal.gt(0)),
            ctx.closingDate),
    lifetimePayment: ctx.m.eq(0) ?
        fmt.formatCurrency(Num.literal(0)) :
        fmt.formatCurrency(sumOfKeys(
            schedules.cumulative()[schedules.cumulative().length - 1]!.data,
            loanPaymentTypes)),
    prepayComparison: showPrepaymentComparison ?
        fmt.formatCurrency(computeStockAssets(
            schedules.pointwise()
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
    principalAndInterest: fmt.formatCurrencyWithDerivation(ctx.m),
    monthlyExpensesAmount: fmt.formatCurrencyWithDerivation(
        ctx.monthlyLoanPayment.add(ctx.monthlyNonLoanPayment)),
    annualPropertyTax: fmt.formatCurrencyWithDerivation(ctx.propertyTaxAnnual),
  };
}

export function computeHidables(
    ctx: Context, fmt: Formatter,
    schedules: Schedules|undefined): Record<HidableContainer, HidableOutput> {
  if (!schedules) {
    return {
      ['monthly-expenses-pmi-div']: new HidableOutput(''),
      ['months-of-pmi-div']: new HidableOutput(''),
      ['fired-tomorrow-countdown-div']: new HidableOutput(''),
      ['total-paid-so-far-div']: new HidableOutput(''),
      ['equity-owned-so-far-div']: new HidableOutput(''),
      ['total-loan-owed-div']: new HidableOutput(''),
      ['remaining-equity-to-pay-for-div']: new HidableOutput(''),
      ['debt-to-income-ratio-div']: new HidableOutput(''),
    };
  }
  let monthlyExpensesPmi;
  let monthsOfPmi;
  if (ctx.pmi.gt(0) && ctx.downPaymentPct.lt(ctx.pmiEquityPct)) {
    monthlyExpensesPmi = new HidableOutput(
        fmt.formatCurrencyWithDerivation(Num.sum(
            ctx.monthlyLoanPayment, ctx.monthlyNonLoanPayment, ctx.pmi)),
    );
    const pmiMonths = countSatisfying(
        schedules.pointwise(), payment => !payment.data.pmi.eq(0));
    monthsOfPmi = new HidableOutput(`${fmt.formatMonthNum(pmiMonths)} (${
        fmt.formatCurrency(ctx.pmi.mul(pmiMonths))} total)`);
  } else {
    monthlyExpensesPmi = new HidableOutput('');
    monthsOfPmi = new HidableOutput('');
  }

  let firedTomorrowCountdown;
  if (!ctx.totalAssets.eq(0)) {
    firedTomorrowCountdown = new HidableOutput(fmt.formatMonthNum(
        countBurndownMonths(
            ctx.totalAssets.sub(
                (ctx.alreadyClosed ? Num.literal(0) :
                                     ctx.downPayment.add(ctx.closingCost))),
            schedules.pointwise(), ctx.monthlyDebt, ctx.paymentsAlreadyMade),
        maxNonEmptyDate(ctx.closingDate, d3.timeMonth.floor(new Date()))));
  } else {
    firedTomorrowCountdown = new HidableOutput('');
  }

  let totalPaidSoFar;
  let equityOwnedSoFar;
  let totalLoanOwed;
  let remainingEquityToPayFor;
  if (!!ctx.paymentsAlreadyMade || ctx.alreadyClosed) {
    const absoluteEquityOwned =
        (ctx.alreadyClosed ? ctx.downPayment : Num.literal(0))
            .add(schedules.cumulative()[ctx.paymentsAlreadyMade]!.data
                     .principal);

    totalPaidSoFar = new HidableOutput(fmt.formatCurrency(
        (ctx.alreadyClosed ? ctx.closingCost.add(ctx.downPayment) :
                             Num.literal(0))
            .add(sumOfKeys(
                schedules.cumulative()[ctx.paymentsAlreadyMade]!.data,
                paymentTypes))));
    equityOwnedSoFar = new HidableOutput(
        `${fmt.formatPercent(absoluteEquityOwned.div(ctx.homeValue))} (${
            fmt.formatCurrency(absoluteEquityOwned)})`);
    const totalPrincipalAndInterestPaid = sumOfKeys(
        schedules.cumulative()[ctx.paymentsAlreadyMade]!.data,
        loanPaymentTypes);
    const totalPrincipalAndInterestToPay = sumOfKeys(
        schedules.cumulative()[schedules.cumulative().length - 1]!.data,
        loanPaymentTypes);
    totalLoanOwed = new HidableOutput(fmt.formatCurrency(
        totalPrincipalAndInterestToPay.sub(totalPrincipalAndInterestPaid)));
    remainingEquityToPayFor = new HidableOutput(
        fmt.formatCurrency(ctx.price.sub(absoluteEquityOwned)));
  } else {
    totalPaidSoFar = new HidableOutput('');
    equityOwnedSoFar = new HidableOutput('');
    totalLoanOwed = new HidableOutput('');
    remainingEquityToPayFor = new HidableOutput('');
  }

  let debtToIncomeRatio;
  if (ctx.annualIncome.gt(0)) {
    debtToIncomeRatio = new HidableOutput(
        fmt.formatPercentWithDerivation(
            Num.sum(
                   ctx.monthlyDebt, ctx.monthlyLoanPayment,
                   ctx.monthlyNonLoanPayment, ctx.pmi)
                .div(ctx.annualIncome)
                .mul(12)),
    );
  } else {
    debtToIncomeRatio = new HidableOutput('');
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

  return {
    'mortgage-term': '',
    'prepay-amount': '',
  };
}

/** Updates the "hints"/previews displayed alongside the input fields. */
export function computeAmountHints(
    ctx: Context, fmt: Formatter): Record<HintType, FormatResult|string> {
  return {
    homeValue:
        fmt.formatCurrencyWithDerivation(ctx.homeValue).map((v) => `(${v})`),
    downPayment:
        fmt.formatCurrencyWithDerivation(ctx.downPayment).map((v) => `(${v})`),
    interestRate: `(${fmt.formatHundredthsPercent(ctx.interestRate)})`,
    pointValue: `(${fmt.formatHundredthsPercent(ctx.pointValue)})`,
    pmiEquityPercentage:
        fmt.formatPercentWithDerivation(ctx.pmiEquityPct).map((v) => `(${v})`),
    propertyTax: `(${
        fmt.formatCurrency(ctx.propertyTaxAnnual.div(4).add(
            ctx.residentialExemptionQuarterly))} - ${
        fmt.formatCurrency(ctx.residentialExemptionQuarterly)} = ${
        fmt.formatCurrency(ctx.propertyTaxAnnual.div(4))}/quarter)`,
    residentialExemption:
        fmt.formatCurrencyWithDerivation(ctx.residentialExemptionQuarterly)
            .map((v) => `(${v}/quarter)`),
    mortgageTerm: `(${ctx.mortgageTerm.toNumber()} yrs)`,
    paymentsAlreadyMade: `(${ctx.paymentsAlreadyMade} payments)`,
    stocksReturnRate: `(${fmt.formatHundredthsPercent(ctx.stocksReturnRate)})`,
  };
}
