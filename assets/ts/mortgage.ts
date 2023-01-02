import * as d3 from 'd3';

import {Context} from './context';
import {Formatter} from './formatter';
import {Num} from './num';
import {Schedules} from './schedules';
import {Elements, HidableContainer, hidableContainerMap, HidableOutputType, HintType, InputEntry, Inputs, OutputType, TemplateType} from './types';
import * as utils from './utils';
import * as viz from './viz';

const fmt = new Formatter(
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }),
    new Intl.NumberFormat('en-US', {
      style: 'percent',
    }),
    new Intl.NumberFormat('en-US', {
      style: 'percent',
      maximumFractionDigits: 2,
    }),
    new Intl.DateTimeFormat());

type InputParamMap = Readonly<Map<HTMLInputElement, InputEntry>>;

function getInputs(): Inputs {
  return {
    price: utils.getInputElt('price-input'),
    homeValue: utils.getInputElt('home-value-input'),
    hoa: utils.getInputElt('hoa-input'),
    downPaymentPercentage: utils.getInputElt('down-payment-percentage-input'),
    downPaymentAbsolute: utils.getInputElt('down-payment-absolute-input'),
    interestRate: utils.getInputElt('interest-rate-input'),
    pointsPurchased: utils.getInputElt('points-purchased-input'),
    pointValue: utils.getInputElt('point-value-input'),
    mortgageInsurance: utils.getInputElt('mortgage-insurance-input'),
    pmiEquityPercentage:
        utils.getInputElt('mortgage-insurance-equity-percentage-input'),
    propertyTaxAbsolute: utils.getInputElt('property-tax-absolute-input'),
    propertyTaxPercentage: utils.getInputElt('property-tax-percentage-input'),
    residentialExemptionSavings:
        utils.getInputElt('residential-exemption-savings-input'),
    residentialExemptionDeduction:
        utils.getInputElt('residential-exemption-deduction-input'),
    taxCollectionMonthStart: utils.getInputElt('tax-collection-start-input'),
    homeownersInsurance: utils.getInputElt('homeowners-insurance-input'),
    closingCost: utils.getInputElt('closing-cost-input'),
    mortgageTerm: utils.getInputElt('mortgage-term-input'),
    annualIncome: utils.getInputElt('annual-income-input'),
    monthlyDebt: utils.getInputElt('monthly-debt-input'),
    totalAssets: utils.getInputElt('total-assets-input'),
    alreadyClosed: utils.getInputElt('already-closed-input'),
    paymentsAlreadyMade: utils.getInputElt('payments-already-made-input'),
    closingDate: utils.getInputElt('closing-date-input'),
    nowDate: utils.getInputElt('now-input'),
    prepayment: utils.getInputElt('prepayment-input'),
    stocksReturnRate: utils.getInputElt('stocks-return-rate-input'),
    showDerivations: utils.getInputElt('show-derivations-input'),
    simplifyDerivations: utils.getInputElt('simplify-derivations-input'),
  };
}

function getHints(): Record<HintType, HTMLElement> {
  return {
    homeValue: utils.getHtmlEltWithId('home-value-hint'),
    interestRate: utils.getHtmlEltWithId('interest-rate-hint'),
    pointValue: utils.getHtmlEltWithId('point-value-hint'),
    pmiEquityPercentage:
        utils.getHtmlEltWithId('mortgage-insurance-equity-percent-hint'),
    propertyTax: utils.getHtmlEltWithId('property-tax-percentage-hint'),
    residentialExemption: utils.getHtmlEltWithId('residential-exemption-hint'),
    mortgageTerm: utils.getHtmlEltWithId('mortgage-term-hint'),
    downPayment: utils.getHtmlEltWithId('down-payment-hint'),
    paymentsAlreadyMade: utils.getHtmlEltWithId('payments-already-made-hint'),
    stocksReturnRate: utils.getHtmlEltWithId('stocks-return-rate-hint'),
  };
}

function getOutputs(): Record<OutputType, HTMLElement> {
  return {
    loanAmount: utils.getHtmlEltWithId('loan-amount-output'),
    principalAndInterest:
        utils.getHtmlEltWithId('principal-and-interest-output'),
    monthlyExpensesAmount: utils.getHtmlEltWithId('monthly-expenses-output'),
    lifetimeOfLoan: utils.getHtmlEltWithId('lifetime-of-loan-output'),
    lifetimePayment: utils.getHtmlEltWithId('lifetime-payment-output'),
    purchasePayment: utils.getHtmlEltWithId('purchase-payment-output'),
    prepayComparison: utils.getHtmlEltWithId('prepay-comparison-output'),
    stocksComparison: utils.getHtmlEltWithId('stocks-comparison-output'),
  };
}

function getHidableOutputs(): Record<HidableOutputType, HTMLElement> {
  return {
    monthlyExpensesPmi: utils.getHtmlEltWithId('monthly-expenses-pmi-output'),
    pmiPaymentTimeline: utils.getHtmlEltWithId('pmi-payment-timeline-output'),
    totalPaidSoFar: utils.getHtmlEltWithId('total-paid-so-far-output'),
    equityOwnedSoFar: utils.getHtmlEltWithId('equity-owned-so-far-output'),
    totalLoanOwed: utils.getHtmlEltWithId('total-loan-owed-output'),
    remainingEquity:
        utils.getHtmlEltWithId('remaining-equity-to-pay-for-output'),
    debtToIncome: utils.getHtmlEltWithId('debt-to-income-ratio-output'),
    firedTomorrowCountdown:
        utils.getHtmlEltWithId('fired-tomorrow-countdown-output'),
  };
}

function getUrlParamMap(inputs: Inputs): InputParamMap {
  return new Map([
    [inputs.price, {name: 'price'}],
    [inputs.homeValue, {name: 'home_value'}],
    [inputs.hoa, {name: 'hoa'}],
    [inputs.downPaymentPercentage, {name: 'down_payment'}],
    [inputs.downPaymentAbsolute, {name: 'down_payment_amt'}],
    [inputs.interestRate, {name: 'interest_rate'}],
    [inputs.pointsPurchased, {name: 'points_purchased'}],
    [inputs.pointValue, {name: 'point_value'}],
    [inputs.mortgageInsurance, {name: 'mortgage_insurance'}],
    [inputs.pmiEquityPercentage, {name: 'pmi_equity_pct'}],
    [inputs.propertyTaxAbsolute, {name: 'property_tax'}],
    [inputs.propertyTaxPercentage, {name: 'property_tax_pct'}],
    [inputs.residentialExemptionSavings, {name: 'resi_savings'}],
    [inputs.residentialExemptionDeduction, {name: 'resi_deduction'}],
    [inputs.taxCollectionMonthStart, {name: 'tax_month'}],
    [inputs.homeownersInsurance, {name: 'hoi'}],
    [inputs.closingCost, {name: 'closing_cost'}],
    [inputs.mortgageTerm, {name: 'mortgage-term'}],
    [inputs.annualIncome, {name: 'annual-income', deprecated: true}],
    [inputs.monthlyDebt, {name: 'monthly-debt'}],
    [inputs.totalAssets, {name: 'total_assets', deprecated: true}],
    [inputs.alreadyClosed, {name: 'closed'}],
    [inputs.paymentsAlreadyMade, {name: 'paid'}],
    [inputs.closingDate, {name: 'closing-date'}],
    [inputs.nowDate, {name: 'now'}],
    [inputs.prepayment, {name: 'prepay'}],
    [inputs.stocksReturnRate, {name: 'stock_rate'}],
    [inputs.showDerivations, {name: 'show_derivations'}],
    [inputs.simplifyDerivations, {name: 'simplify_derivations'}],
  ]);
}

function getPrivateValueMap(inputs: Inputs): InputParamMap {
  return new Map([
    [inputs.annualIncome, {name: 'annual_income'}],
    [inputs.totalAssets, {name: 'total_assets'}],
  ]);
}

function contextFromInputs(inputs: Inputs): Context {
  return new Context({
    price: utils.orZero(inputs.price),
    homeValue: utils.orZero(inputs.homeValue),
    hoa: utils.orZero(inputs.hoa),
    downPaymentPercent: utils.orZero(inputs.downPaymentPercentage),
    downPaymentAbsolute: utils.orZero(inputs.downPaymentAbsolute),
    interestRate: utils.orZero(inputs.interestRate),
    pointValue: utils.orZero(inputs.pointValue),
    pointsPurchased: utils.orZeroN(inputs.pointsPurchased),
    pmi: utils.orZero(inputs.mortgageInsurance),
    pmiEquityPercent: utils.orZero(inputs.pmiEquityPercentage),
    propertyTaxAbsolute: utils.orZero(inputs.propertyTaxAbsolute),
    propertyTaxPercent: utils.orZero(inputs.propertyTaxPercentage),
    residentialExemptionAnnualSavings:
        utils.orZero(inputs.residentialExemptionSavings),
    residentialExemptionDeduction:
        utils.orZero(inputs.residentialExemptionDeduction),
    taxCollectionStartMonth:
        inputs.taxCollectionMonthStart.valueAsDate?.getUTCMonth() ?? 0,
    homeownersInsurance: utils.orZero(inputs.homeownersInsurance),
    closingCost: utils.orZero(inputs.closingCost),
    mortgageTerm: utils.orZeroN(inputs.mortgageTerm),
    annualIncome: utils.orZero(inputs.annualIncome),
    monthlyDebt: utils.orZero(inputs.monthlyDebt),
    totalAssets: utils.orZero(inputs.totalAssets),
    alreadyClosed: inputs.alreadyClosed.checked,
    paymentsAlreadyMade: utils.orZeroN(inputs.paymentsAlreadyMade),
    closingDate: inputs.closingDate.value ? new Date(inputs.closingDate.value) :
                                            undefined,
    prepayment: utils.orZero(inputs.prepayment),
    stocksReturnRate: utils.orUndef(inputs.stocksReturnRate),
    // Note: valueAsDate interprets the input element in UTC timezone, which is
    // not necessarily the same as the user's timezone, so we have to convert
    // back to the user's local time by going through the Date ctor explicitly.
    now: inputs.nowDate.value ?
        utils.utcDateToLocalDate(inputs.nowDate.valueAsDate!) :
        d3.timeDay(),
    showDerivations: inputs.showDerivations.checked,
    simplifyDerivations: inputs.simplifyDerivations.checked,
  });
}

// Attaches listeners to react to user input, URL changes.
function attachListeners(
    elts: Elements, urlParamMap: InputParamMap, privateValueMap: InputParamMap,
    existingCookies: Readonly<Set<string>>): void {
  elts.clearInputsButton.addEventListener(
      'click',
      () => void clearInputs(
          elts, urlParamMap, privateValueMap, existingCookies));
  for (const elt of [...urlParamMap.keys(), ...privateValueMap.keys()]) {
    elt.addEventListener('change', () => {
      utils.saveFields(urlParamMap, privateValueMap, elt);
      setContents(contextFromInputs(elts.inputs), elts);
    });
  }
  window.onpopstate = () =>
      void populateFields(elts, urlParamMap, privateValueMap);
}

// Set the contents of all the outputs based on the `ctx`.
function setContents(ctx: Context, elts: Elements): void {
  utils.setEltVisibility(
      utils.getHtmlEltWithId('simplify-derivations-span'), ctx.showDerivations);
  fmt.setDerivationParams(ctx.showDerivations, ctx.simplifyDerivations);

  utils.removeClass('derivation-elt');

  const schedules = ctx.showMonthlySchedule ? new Schedules(ctx) : undefined;

  for (const [h, v] of Object.entries(utils.computeAmountHints(ctx, fmt))) {
    utils.setEltContent(elts.hints[h as HintType], v);
  }
  for (const [o, v] of Object.entries(
           utils.computeContents(ctx, fmt, schedules))) {
    utils.setEltContent(elts.outputs[o as OutputType], v);
  }
  for (const [h, v] of Object.entries(
           utils.computeHidables(ctx, fmt, schedules))) {
    const hc = h as HidableContainer;
    v.display(hc, elts.hidables[hidableContainerMap[hc]]);
  }
  for (const [t, v] of Object.entries(utils.computeTemplates(ctx, fmt))) {
    utils.fillTemplateElts(t as TemplateType, v);
  }
  viz.setChartsAndButtonsContent(ctx, fmt, schedules);

  Num.prune();
}

// Reads fields from the URL and from cookies, and populates the UI
// accordingly.
function populateFields(
    elts: Elements, urlParamMap: InputParamMap,
    privateValueMap: InputParamMap): Readonly<Set<string>> {
  const hasURLParam =
      populateFieldsFromURLParams(new URL(location.href), urlParamMap);
  const {cookies, hasValue: hasPrivateValue} =
      populateFieldsFromPrivateStorage(document.cookie, privateValueMap);

  if (hasURLParam || hasPrivateValue)
    setContents(contextFromInputs(elts.inputs), elts);

  return cookies;
}

function populateFieldsFromURLParams(
    url: URL, urlParamMap: InputParamMap): boolean {
  let hasValue = false;
  for (const [elt, {name}] of urlParamMap.entries()) {
    switch (elt.type) {
      case 'text':
      case 'date':
      case 'month':
        const value = url.searchParams.get(name);
        hasValue = hasValue || value !== null;
        elt.value = value ? decodeURIComponent(value) : '';
        break;
      case 'checkbox':
        const checked = url.searchParams.has(name);
        hasValue = hasValue || checked;
        elt.checked = checked;
        break;
      default:
        throw new Error('unreachable');
    }
  }
  return hasValue;
}

function populateFieldsFromPrivateStorage(
    cookieString: string, privateValueMap: InputParamMap):
    {cookies: Readonly<Set<string>>, hasValue: boolean} {
  const cookiesToCheck = new Map<string, string>(
      cookieString.split(';')
          .map((c) => c.split('='))
          .filter(([name, value]) => name && value)
          .map(([name, value]) => [name!.trim(), decodeURIComponent(value!)]));
  const existingCookies = new Set<string>();
  let hasValue = false;
  for (const [elt, {name}] of privateValueMap.entries()) {
    // LocalStorage takes precedence over cookies, but we still try to read from
    // both to provide a smooth upgrade experience.
    const savedStorageValue = window.localStorage.getItem(name);
    if (savedStorageValue) {
      hasValue = true;
      switch (elt.type) {
        case 'text':
          elt.value = savedStorageValue;
          break;
        case 'checkbox':
          elt.checked = savedStorageValue === '1';
          break;
        default:
          throw new Error('unreachable');
      }
    }

    // Always look for cookies that we can clear, but don't do anything with
    // them unless we don't have a value for this
    const savedCookie = cookiesToCheck.get(name);
    if (savedCookie !== undefined) existingCookies.add(name);

    if (!savedStorageValue) {
      switch (elt.type) {
        case 'text':
          hasValue = hasValue || savedCookie !== undefined;
          elt.value = savedCookie || '';
          break;
        case 'checkbox':
          const checked = !!savedCookie;
          hasValue = hasValue || checked;
          elt.checked = checked;
          break;
        default:
          throw new Error('unreachable');
      }
    }
  }

  return {
    cookies: existingCookies,
    hasValue,
  };
}

// Clears all parameters from the `url`, and clears all cookies.
function clearInputs(
    elts: Elements, urlParamMap: InputParamMap, privateValueMap: InputParamMap,
    existingCookies: Readonly<Set<string>>): void {
  const url = new URL(location.href);
  let urlChanged = false;
  for (const [elt, entry] of urlParamMap.entries()) {
    elt.value = '';
    urlChanged = utils.deleteParam(url, entry.name) || urlChanged;
  }
  if (urlChanged) history.pushState({}, '', url.toString());
  for (const [elt, entry] of privateValueMap.entries()) {
    elt.value = '';
    window.localStorage.removeItem(entry.name);
    if (existingCookies.has(entry.name)) utils.deleteCookie(entry.name);
  }
  setContents(contextFromInputs(elts.inputs), elts);
}

export function timeIt(action: () => void) {
  const start = Date.now();
  action();
  console.log(Date.now() - start);
}

export function main(): void {
  const elts: Elements = {
    inputs: getInputs(),
    outputs: getOutputs(),
    hints: getHints(),
    hidables: getHidableOutputs(),
    clearInputsButton: utils.getHtmlEltWithId('clear-inputs-button'),
  };
  const urlParamMap = getUrlParamMap(elts.inputs);
  const privateValueMap = getPrivateValueMap(elts.inputs);
  const existingCookies = populateFields(elts, urlParamMap, privateValueMap);
  // To support URL param / cookie deprecations cleanly, we write out the UI
  // fields immediately after populating them. This "upgrades" fields that
  // have been moved from URL params to cookies (or vice versa).
  utils.saveFields(urlParamMap, privateValueMap);
  utils.clearDeprecatedStorage(urlParamMap, privateValueMap, existingCookies);
  attachListeners(elts, urlParamMap, privateValueMap, existingCookies);
}
