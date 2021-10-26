import * as d3 from 'd3';
import {Decimal} from 'decimal.js';

import {ConditionalOutput} from './conditional_output';
import {Context} from './context';
import {ExpandableElement} from './expandable_element';
import {Elements, HintType, hintTypes, InputEntry, Inputs, loanPaymentTypes, Outputs, OutputType, outputTypes, paymentTypes, templateTypes} from './types';
import * as utils from './utils';
import * as viz from './viz';

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const pctFmt = new Intl.NumberFormat('en-US', {
  style: 'percent',
});
const hundredthsPctFmt = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
});

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
    'monthlyPaymentPmi': utils.getHtmlElt('monthly-payment-pmi-output'),
    'pmiPaymentTimeline': utils.getHtmlElt('pmi-payment-timeline-output'),
    'lifetimeOfLoan': utils.getHtmlElt('lifetime-of-loan-output'),
    'lifetimePayment': utils.getHtmlElt('lifetime-payment-output'),
    'purchasePayment': utils.getHtmlElt('purchase-payment-output'),
    'totalPaidSoFar': utils.getHtmlElt('total-paid-so-far-output'),
    'equityOwnedSoFar': utils.getHtmlElt('equity-owned-so-far-output'),
    'totalLoanOwed': utils.getHtmlElt('total-loan-owed-output'),
    'remainingEquity': utils.getHtmlElt('remaining-equity-to-pay-for-output'),
    'debtToIncome': utils.getHtmlElt('debt-to-income-ratio-output'),
    'firedTomorrowCountdown':
        utils.getHtmlElt('fired-tomorrow-countdown-output'),
    'prepayComparison': utils.getHtmlElt('prepay-comparison-output'),
    'stocksComparison': utils.getHtmlElt('stocks-comparison-output'),
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
  const {hints, outputs, templates} = computeContents(ctx);

  for (const h of hintTypes) {
    elts.hints[h].innerText = hints[h];
  }
  for (const o of outputTypes) {
    const val = outputs[o];
    if (val instanceof ConditionalOutput) {
      val.display();
      elts.outputs[o].innerText = val.output();
    } else {
      elts.outputs[o].innerText = val;
    }
  }
  for (const t of templateTypes) {
    utils.fillTemplateElts(t, templates[t]);
  }
}

// Compute hint strings and set output strings.
function computeContents(ctx: Context): Outputs {
  const outputs = utils.emptyOutputs();
  const hints = computeAmountHints(ctx);
  const templates = utils.emptyTemplates();
  outputs['loanAmount'] =
      `${fmt.format(ctx.price.sub(ctx.downPayment).toNumber())}`;

  outputs['purchasePayment'] = `${
      fmt.format(Decimal
                     .sum(
                         ctx.downPayment,
                         ctx.closingCost,
                         ctx.price.sub(ctx.downPayment)
                             .mul(ctx.pointsPurchased)
                             .div(100),
                         )
                     .toNumber())}`;

  if (ctx.interestRate.eq(0) && !ctx.downPayment.eq(ctx.price)) {
    return {
      hints,
      templates,
      outputs: utils.merge(outputs, clearMonthlyPaymentOutputs()),
    };
  }

  const M = ctx.downPayment.eq(ctx.price) ? new Decimal(0) :
                                            utils.computeAmortizedPaymentAmount(
                                                ctx.price.sub(ctx.downPayment),
                                                ctx.interestRate.div(12),
                                                ctx.n,
                                            );
  const monthlyLoanPayment = M.add(ctx.prepayment);
  outputs['principalAndInterest'] =
      `${fmt.format(monthlyLoanPayment.toNumber())}`;
  const extras = Decimal.sum(ctx.hoa, ctx.propertyTax, ctx.homeownersInsurance);

  outputs['monthlyPaymentAmount'] =
      `${fmt.format(monthlyLoanPayment.add(extras).toNumber())}`;
  const schedule = utils.calculatePaymentSchedule(ctx, monthlyLoanPayment);
  utils.merge(
      outputs,
      utils.makeConditionalOutputs(
          ctx.pmi.gt(0) && ctx.downPaymentPct.lt(ctx.pmiEquityPct), [
            {
              container: 'monthly-payment-pmi-div',
              generateOutput: () => `${
                  fmt.format(Decimal.sum(monthlyLoanPayment, extras, ctx.pmi)
                                 .toNumber())}`,
            },
            {
              container: 'months-of-pmi-div',
              generateOutput: () => {
                const pmiMonths = utils.countSatisfying(
                    schedule, payment => !payment.data.pmi.eq(0));
                return `${utils.formatMonthNum(pmiMonths)} (${
                    fmt.format(ctx.pmi.mul(pmiMonths).toNumber())} total)`;
              },
            },
          ]));
  viz.buildPaymentScheduleChart(ctx, schedule, fmt, paymentTypes);
  const cumulativeSums = utils.cumulativeSumByFields(schedule, paymentTypes);
  if (!M.eq(0)) {
    viz.buildCumulativeChart(ctx, cumulativeSums, fmt, loanPaymentTypes);
    outputs['lifetimeOfLoan'] = `${
        utils.formatMonthNum(
            utils.countSatisfying(schedule, m => m.data.principal.gt(0)),
            ctx.closingDate)}`
    outputs['lifetimePayment'] = `${
        fmt.format(utils
                       .sumOfKeys(
                           cumulativeSums[cumulativeSums.length - 1]!.data,
                           loanPaymentTypes)
                       .toNumber())}`;

    utils.removeChildren(utils.getHtmlElt('schedule_tab'));
    new ExpandableElement(
        utils.getHtmlElt('schedule_tab'), 'Monthly payment table',
        () => utils.makeTable(
            ['Month'].concat(paymentTypes.map(utils.toCapitalized)),
            schedule.map(
                d => [utils.formatMonthNum(d.month, ctx.closingDate)].concat(
                    paymentTypes.map(k => fmt.format(d.data[k].toNumber()))))));
    utils.removeChildren(utils.getHtmlElt('cumulative_tab'));
    new ExpandableElement(
        utils.getHtmlElt('cumulative_tab'), 'Cumulative payments table',
        () => utils.makeTable(
            ['Month'].concat(loanPaymentTypes.map(utils.toCapitalized)),
            cumulativeSums.map(
                d =>
                    [utils.formatMonthNum(d.month, ctx.closingDate),
                     fmt.format(d.data.principal.toNumber()),
                     fmt.format(d.data.interest.toNumber()),
    ])));
  } else {
    document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
    utils.removeChildren(utils.getHtmlElt('cumulative_tab'));
    outputs['lifetimePayment'] = `${fmt.format(0)}`;
  }

  utils.merge(outputs, utils.makeConditionalOutputs(!ctx.totalAssets.eq(0), [
    {
      container: 'fired-tomorrow-countdown-div',
      generateOutput: () => `${
          utils.formatMonthNum(
              utils.countBurndownMonths(
                  ctx.totalAssets.sub(
                      (ctx.alreadyClosed ?
                           new Decimal(0) :
                           ctx.downPayment.add(ctx.closingCost))),
                  schedule.slice(ctx.paymentsAlreadyMade).map(d => d.data),
                  ctx.monthlyDebt),
              utils.maxNonEmptyDate(
                  ctx.closingDate, d3.timeMonth.floor(new Date())))}`,
    },
  ]));

  const absoluteEquityOwned =
      (ctx.alreadyClosed ? ctx.downPayment : new Decimal(0))
          .add(cumulativeSums[ctx.paymentsAlreadyMade]!.data.principal);

  utils.merge(
      outputs,
      utils.makeConditionalOutputs(
          !!ctx.paymentsAlreadyMade || ctx.alreadyClosed, [
            {
              container: 'total-paid-so-far-div',
              generateOutput: () => `${
                  fmt.format(
                      (ctx.alreadyClosed ?
                           ctx.closingCost.add(ctx.downPayment) :
                           new Decimal(0))
                          .add(utils.sumOfKeys(
                              cumulativeSums[ctx.paymentsAlreadyMade]!.data,
                              paymentTypes))
                          .toNumber())}`,
            },
            {
              container: 'equity-owned-so-far-div',
              generateOutput: () => `${
                  pctFmt.format(
                      absoluteEquityOwned.div(ctx.homeValue).toNumber())} (${
                  fmt.format(absoluteEquityOwned.toNumber())})`,
            },
            {
              container: 'total-loan-owed-div',
              generateOutput() {
                const totalPrincipalAndInterestPaid = utils.sumOfKeys(
                    cumulativeSums[ctx.paymentsAlreadyMade]!.data,
                    loanPaymentTypes);
                const totalPrincipalAndInterestToPay = utils.sumOfKeys(
                    cumulativeSums[cumulativeSums.length - 1]!.data,
                    loanPaymentTypes);
                return `${
                    fmt.format(totalPrincipalAndInterestToPay
                                   .sub(totalPrincipalAndInterestPaid)
                                   .toNumber())}`;
              },
            },
            {
              container: 'remaining-equity-to-pay-for-div',
              generateOutput: () => `${
                  fmt.format(ctx.price.sub(absoluteEquityOwned).toNumber())}`,
            },
          ]));

  utils.merge(outputs, utils.makeConditionalOutputs(ctx.annualIncome.gt(0), [
    {
      container: 'debt-to-income-ratio-div',
      generateOutput: () => `${
          pctFmt.format(
              Decimal.sum(ctx.monthlyDebt, monthlyLoanPayment, extras, ctx.pmi)
                  .div(ctx.annualIncome)
                  .mul(12)
                  .toNumber())}`,
    },
  ]));

  // Show the comparison between prepayment and investment, if relevant.
  if (ctx.prepayment.eq(0)) {
    for (const elt of Array.from(document.getElementsByClassName('prepay'))) {
      if (!(elt instanceof HTMLElement)) continue;
      elt.style.display = 'none';
    }
  } else {
    for (const elt of Array.from(document.getElementsByClassName('prepay'))) {
      if (!(elt instanceof HTMLElement)) continue;
      elt.style.display = '';
    }
    templates['mortgage-term'] = utils.formatMonthNum(ctx.n);
    templates['prepay-amount'] = fmt.format(ctx.prepayment.toNumber());
    outputs['prepayComparison'] = `${
        fmt.format(utils
                       .computeStockAssets(
                           schedule
                               .map(
                                   m => monthlyLoanPayment.sub(Decimal.sum(
                                       m.data.interest, m.data.principal)))
                               .filter(x => !x.eq(0)),
                           ctx.stocksReturnRate)
                       .toNumber())}`;

    outputs['stocksComparison'] = `${
        fmt.format(
            utils
                .computeStockAssets(
                    new Array(ctx.n).fill(ctx.prepayment), ctx.stocksReturnRate)
                .toNumber())}`;
  }

  return {
    hints,
    outputs,
    templates,
  };
}

// Updates the "hints"/previews displayed alongside the input fields.
function computeAmountHints(ctx: Context): Record<HintType, string> {
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

// Clears output elements associated with monthly payments.
function clearMonthlyPaymentOutputs(): Partial<Record<OutputType, string>> {
  document.querySelector('#schedule_viz > svg:first-of-type')?.remove();
  utils.removeChildren(utils.getHtmlElt('schedule_tab'));
  document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
  utils.removeChildren(utils.getHtmlElt('cumulative_tab'));

  return {
    'principalAndInterest': '',
    'monthlyPaymentAmount': '',
    'monthlyPaymentPmi': '',
    'lifetimePayment': '',
    'debtToIncome': '',
  };
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
  const elts = {
    inputs: getInputs(),
    outputs: getOutputs(),
    hints: getHints(),
    clearInputsButton: utils.getHtmlElt('clear-inputs-button'),
  };
  const urlParamMap = getUrlParamMap(elts.inputs);
  const cookieValueMap = getCookieValueMap(elts.inputs);
  populateFields(elts, urlParamMap, cookieValueMap);
  // To support URL param / cookie deprecations cleanly, we write out the UI
  // fields immediately after populating them. This "upgrades" fields that have
  // been moved from URL params to cookies (or vice versa).
  utils.saveFields(urlParamMap, cookieValueMap);
  utils.clearDeprecatedStorage(urlParamMap, cookieValueMap);
  attachListeners(elts, urlParamMap, cookieValueMap);
}
