import * as d3 from 'd3';

import {Context} from './context';
import {ExpandableElement} from './expandable_element';
import {Formatter} from './formatter';
import {Elements, HidableContainer, hidableContainerMap, HidableOutputType, HintType, InputEntry, Inputs, loanPaymentTypes, OutputType, PaymentRecordWithMonth, PaymentType, paymentTypes, Schedules, TemplateType} from './types';
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
    }));

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
    homeownersInsurance: utils.getInputElt('homeowners-insurance-input'),
    closingCost: utils.getInputElt('closing-cost-input'),
    mortgageTerm: utils.getInputElt('mortgage-term-input'),
    annualIncome: utils.getInputElt('annual-income-input'),
    monthlyDebt: utils.getInputElt('monthly-debt-input'),
    totalAssets: utils.getInputElt('total-assets-input'),
    alreadyClosed: utils.getInputElt('already-closed-input'),
    paymentsAlreadyMade: utils.getInputElt('payments-already-made-input'),
    closingDate: utils.getInputElt('closing-date-input'),
    prepayment: utils.getInputElt('prepayment-input'),
    stocksReturnRate: utils.getInputElt('stocks-return-rate-input'),
  };
}

function getHints(): Record<HintType, HTMLElement> {
  return {
    'homeValue': utils.getHtmlElt('home-value-hint'),
    'interestRate': utils.getHtmlElt('interest-rate-hint'),
    'pointValue': utils.getHtmlElt('point-value-hint'),
    'pmiEquityPercentage':
        utils.getHtmlElt('mortgage-insurance-equity-percent-hint'),
    'propertyTax': utils.getHtmlElt('property-tax-percentage-hint'),
    'residentialExemption': utils.getHtmlElt('residential-exemption-hint'),
    'mortgageTerm': utils.getHtmlElt('mortgage-term-hint'),
    'downPayment': utils.getHtmlElt('down-payment-hint'),
    'paymentsAlreadyMade': utils.getHtmlElt('payments-already-made-hint'),
    'stocksReturnRate': utils.getHtmlElt('stocks-return-rate-hint'),
  };
}

function getOutputs(): Record<OutputType, HTMLElement> {
  return {
    'loanAmount': utils.getHtmlElt('loan-amount-output'),
    'principalAndInterest': utils.getHtmlElt('principal-and-interest-output'),
    'monthlyPaymentAmount': utils.getHtmlElt('monthly-payment-output'),
    'lifetimeOfLoan': utils.getHtmlElt('lifetime-of-loan-output'),
    'lifetimePayment': utils.getHtmlElt('lifetime-payment-output'),
    'purchasePayment': utils.getHtmlElt('purchase-payment-output'),
    'prepayComparison': utils.getHtmlElt('prepay-comparison-output'),
    'stocksComparison': utils.getHtmlElt('stocks-comparison-output'),
  };
}

function getHidableOutputs(): Record<HidableOutputType, HTMLElement> {
  return {
    'monthlyPaymentPmi': utils.getHtmlElt('monthly-payment-pmi-output'),
    'pmiPaymentTimeline': utils.getHtmlElt('pmi-payment-timeline-output'),
    'totalPaidSoFar': utils.getHtmlElt('total-paid-so-far-output'),
    'equityOwnedSoFar': utils.getHtmlElt('equity-owned-so-far-output'),
    'totalLoanOwed': utils.getHtmlElt('total-loan-owed-output'),
    'remainingEquity': utils.getHtmlElt('remaining-equity-to-pay-for-output'),
    'debtToIncome': utils.getHtmlElt('debt-to-income-ratio-output'),
    'firedTomorrowCountdown':
        utils.getHtmlElt('fired-tomorrow-countdown-output'),
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
    [inputs.homeownersInsurance, {name: 'hoi'}],
    [inputs.closingCost, {name: 'closing_cost'}],
    [inputs.mortgageTerm, {name: 'mortgage-term'}],
    [inputs.annualIncome, {name: 'annual-income', deprecated: true}],
    [inputs.monthlyDebt, {name: 'monthly-debt'}],
    [inputs.totalAssets, {name: 'total_assets', deprecated: true}],
    [inputs.alreadyClosed, {name: 'closed'}],
    [inputs.paymentsAlreadyMade, {name: 'paid'}],
    [inputs.closingDate, {name: 'closing-date'}],
    [inputs.prepayment, {name: 'prepay'}],
    [inputs.stocksReturnRate, {name: 'stock_rate'}],
  ]);
}

function getCookieValueMap(inputs: Inputs): InputParamMap {
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
    now: d3.timeDay(),
  });
}

// Attaches listeners to react to user input, URL changes.
function attachListeners(
    elts: Elements, urlParamMap: InputParamMap,
    cookieValueMap: InputParamMap): void {
  elts.clearInputsButton.addEventListener(
      'click', () => void clearInputs(elts, urlParamMap, cookieValueMap));
  const reactToInput = (elt: HTMLInputElement) => () => {
    utils.saveFields(urlParamMap, cookieValueMap, elt);
    setContents(contextFromInputs(elts.inputs), elts);
  };
  for (const elt of urlParamMap.keys()) {
    elt.addEventListener('input', reactToInput(elt));
  }
  for (const elt of cookieValueMap.keys()) {
    elt.addEventListener('input', reactToInput(elt));
  }
  window.onpopstate = () =>
      void populateFields(elts, urlParamMap, cookieValueMap);
}

// Set the contents of all the outputs based on the `ctx`.
function setContents(ctx: Context, elts: Elements): void {
  const schedules = utils.computeSchedules(ctx);

  for (const [h, v] of Object.entries(utils.computeAmountHints(ctx, fmt))) {
    elts.hints[h as HintType].innerText = v;
  }
  for (const [o, v] of Object.entries(
           utils.computeContents(ctx, fmt, schedules))) {
    elts.outputs[o as OutputType].innerText = v;
  }
  for (const [k, v] of Object.entries(
           utils.computeHidables(ctx, fmt, schedules))) {
    const hc = k as HidableContainer;
    v.display(hc);
    elts.hidables[hidableContainerMap[hc]].innerText = v.output();
  }
  for (const [t, v] of Object.entries(utils.computeTemplates(ctx, fmt))) {
    utils.fillTemplateElts(t as TemplateType, v);
  }
  setChartsAndButtonsContent(ctx, schedules);
}

function setChartsAndButtonsContent(
    ctx: Context, schedules: Schedules|undefined): void {
  viz.clearTables();

  if (!schedules) {
    viz.clearCharts();
    return;
  }

  const {pointwise, cumulative} = schedules;

  viz.buildPaymentScheduleChart(ctx, pointwise, fmt, paymentTypes);
  if (ctx.m.eq(0)) {
    viz.clearCumulativeChart();
    return;
  }

  viz.buildCumulativeChart(ctx, cumulative, fmt, loanPaymentTypes);

  const makeTabler =
      (data: readonly PaymentRecordWithMonth[], ts: readonly PaymentType[]):
          () => HTMLTableElement => () => utils.makeTable(
              ['Month', ...ts.map(utils.toCapitalized)],
              data.map(
                  d =>
                      [utils.formatMonthNum(d.month, ctx.closingDate),
                       ...ts.map(k => fmt.formatCurrency(d.data[k].toNumber())),
  ]));
  new ExpandableElement(
      utils.getHtmlElt('schedule_tab'), 'Monthly payment table',
      makeTabler(pointwise, paymentTypes));
  new ExpandableElement(
      utils.getHtmlElt('cumulative_tab'), 'Cumulative payments table',
      makeTabler(cumulative, loanPaymentTypes));
}

// Reads fields from the URL and from cookies, and populates the UI
// accordingly.
function populateFields(
    elts: Elements, urlParamMap: InputParamMap,
    cookieValueMap: InputParamMap): void {
  const url = new URL(location.href);
  let hasValue = false;
  for (const [elt, {name}] of urlParamMap.entries()) {
    switch (elt.type) {
      case 'text':
      case 'date':
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
  const cookies = document.cookie.split(';').map(x => {
    const parts = x.split('=');
    return {name: parts[0]?.trim(), value: decodeURIComponent(parts[1]!)};
  });
  for (const [elt, {name}] of cookieValueMap.entries()) {
    const savedCookie =
        cookies.find(({name: cookieName}) => name === cookieName);
    switch (elt.type) {
      case 'text':
        hasValue = hasValue || savedCookie !== undefined;
        elt.value = savedCookie ? savedCookie.value! : '';
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
  if (hasValue) {
    setContents(contextFromInputs(elts.inputs), elts);
  }
}

// Clears all parameters from the `url`, and clears all cookies.
function clearInputs(
    elts: Elements, urlParamMap: InputParamMap,
    cookieValueMap: InputParamMap): void {
  const url = new URL(location.href);
  let urlChanged = false;
  for (const [elt, entry] of urlParamMap.entries()) {
    elt.value = '';
    urlChanged = utils.deleteParam(url, entry.name) || urlChanged;
  }
  if (urlChanged) history.pushState({}, '', url.toString());
  for (const [elt, entry] of cookieValueMap.entries()) {
    elt.value = '';
    utils.deleteCookie(entry.name);
  }
  setContents(contextFromInputs(elts.inputs), elts);
}

export function main(): void {
  const elts: Elements = {
    inputs: getInputs(),
    outputs: getOutputs(),
    hints: getHints(),
    hidables: getHidableOutputs(),
    clearInputsButton: utils.getHtmlElt('clear-inputs-button'),
  };
  const urlParamMap = getUrlParamMap(elts.inputs);
  const cookieValueMap = getCookieValueMap(elts.inputs);
  populateFields(elts, urlParamMap, cookieValueMap);
  // To support URL param / cookie deprecations cleanly, we write out the UI
  // fields immediately after populating them. This "upgrades" fields that
  // have been moved from URL params to cookies (or vice versa).
  utils.saveFields(urlParamMap, cookieValueMap);
  utils.clearDeprecatedStorage(urlParamMap, cookieValueMap);
  attachListeners(elts, urlParamMap, cookieValueMap);
}
