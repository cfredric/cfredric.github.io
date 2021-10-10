import * as d3 from 'd3';
import {Decimal} from 'decimal.js';

import {Context} from './context';
import {ExpandableElement} from './expandable_element';
import {InputEntry, loanPaymentTypes, paymentTypes} from './types';
import * as utils from './utils';
import * as viz from './viz';

(function() {
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

const clearInputsButton = utils.getHtmlElt('clear-inputs-button');

// Inputs.
const priceInput = utils.getInputElt('price-input');
const homeValueInput = utils.getInputElt('home-value-input');
const hoaInput = utils.getInputElt('hoa-input');
const downPaymentPercentageInput =
    utils.getInputElt('down-payment-percentage-input');
const downPaymentAbsoluteInput =
    utils.getInputElt('down-payment-absolute-input');
const interestRateInput = utils.getInputElt('interest-rate-input');
const pointsPurchasedInput = utils.getInputElt('points-purchased-input');
const pointValueInput = utils.getInputElt('point-value-input');
const mortgageInsuranceInput = utils.getInputElt('mortgage-insurance-input');
const pmiEquityPercentageInput =
    utils.getInputElt('mortgage-insurance-equity-percentage-input');
const propertyTaxAbsoluteInput =
    utils.getInputElt('property-tax-absolute-input');
const propertyTaxPercentageInput =
    utils.getInputElt('property-tax-percentage-input');
const residentialExemptionSavingsInput =
    utils.getInputElt('residential-exemption-savings-input');
const residentialExemptionDeductionInput =
    utils.getInputElt('residential-exemption-deduction-input');
const homeownersInsuranceInput =
    utils.getInputElt('homeowners-insurance-input');
const closingCostInput = utils.getInputElt('closing-cost-input');
const mortgageTermInput = utils.getInputElt('mortgage-term-input');
const annualIncomeInput = utils.getInputElt('annual-income-input');
const monthlyDebtInput = utils.getInputElt('monthly-debt-input');
const totalAssetsInput = utils.getInputElt('total-assets-input');
const alreadyClosedInput = utils.getInputElt('already-closed-input');
const paymentsAlreadyMadeInput =
    utils.getInputElt('payments-already-made-input');
const closingDateInput = utils.getInputElt('closing-date-input');
const prepaymentInput = utils.getInputElt('prepayment-input');
const stocksReturnRateInput = utils.getInputElt('stocks-return-rate-input');

// Hints.
const homeValueHintOutput = utils.getHtmlElt('home-value-hint');
const interestRateHintOutput = utils.getHtmlElt('interest-rate-hint');
const pointValueHintOutput = utils.getHtmlElt('point-value-hint');
const pmiEquityPercentageHintOutput =
    utils.getHtmlElt('mortgage-insurance-equity-percent-hint');
const propertyTaxHintOutput = utils.getHtmlElt('property-tax-percentage-hint');
const residentialExemptionHintOutput =
    utils.getHtmlElt('residential-exemption-hint');
const mortgageTermHintOutput = utils.getHtmlElt('mortgage-term-hint');
const downPaymentHintOutput = utils.getHtmlElt('down-payment-hint');
const paymentsAlreadyMadeHintOutput =
    utils.getHtmlElt('payments-already-made-hint');
const stocksReturnRateHintOutput = utils.getHtmlElt('stocks-return-rate-hint');

// Outputs.
const loanAmountOutput = utils.getHtmlElt('loan-amount-output');
const principalAndInterestOutput =
    utils.getHtmlElt('principal-and-interest-output');
const monthlyPaymentAmountOutput = utils.getHtmlElt('monthly-payment-output');
const monthlyPaymentPmiOutput = utils.getHtmlElt('monthly-payment-pmi-output');
const pmiPaymentTimelineOutput =
    utils.getHtmlElt('pmi-payment-timeline-output');
const lifetimeOfLoanOutput = utils.getHtmlElt('lifetime-of-loan-output');
const lifetimePaymentOutput = utils.getHtmlElt('lifetime-payment-output');
const purchasePaymentOutput = utils.getHtmlElt('purchase-payment-output');
const totalPaidSoFarOutput = utils.getHtmlElt('total-paid-so-far-output');
const equityOwnedSoFarOutput = utils.getHtmlElt('equity-owned-so-far-output');
const totalLoanOwedOutput = utils.getHtmlElt('total-loan-owed-output');
const remainingEquityOutput =
    utils.getHtmlElt('remaining-equity-to-pay-for-output');
const debtToIncomeOutput = utils.getHtmlElt('debt-to-income-ratio-output');
const firedTomorrowCountdownOutput =
    utils.getHtmlElt('fired-tomorrow-countdown-output');
const prepayComparisonOutput = utils.getHtmlElt('prepay-comparison-output');
const stocksComparisonOutput = utils.getHtmlElt('stocks-comparison-output');

const urlParamMap: Readonly<Map<HTMLInputElement, InputEntry>> = new Map([
  [priceInput, {name: 'price'}],
  [homeValueInput, {name: 'home_value'}],
  [hoaInput, {name: 'hoa'}],
  [downPaymentPercentageInput, {name: 'down_payment'}],
  [downPaymentAbsoluteInput, {name: 'down_payment_amt'}],
  [interestRateInput, {name: 'interest_rate'}],
  [pointsPurchasedInput, {name: 'points_purchased'}],
  [pointValueInput, {name: 'point_value'}],
  [mortgageInsuranceInput, {name: 'mortgage_insurance'}],
  [pmiEquityPercentageInput, {name: 'pmi_equity_pct'}],
  [propertyTaxAbsoluteInput, {name: 'property_tax'}],
  [propertyTaxPercentageInput, {name: 'property_tax_pct'}],
  [residentialExemptionSavingsInput, {name: 'resi_savings'}],
  [residentialExemptionDeductionInput, {name: 'resi_deduction'}],
  [homeownersInsuranceInput, {name: 'hoi'}],
  [closingCostInput, {name: 'closing_cost'}],
  [mortgageTermInput, {name: 'mortgage-term'}],
  [annualIncomeInput, {name: 'annual-income', deprecated: true}],
  [monthlyDebtInput, {name: 'monthly-debt'}],
  [totalAssetsInput, {name: 'total_assets', deprecated: true}],
  [alreadyClosedInput, {name: 'closed'}],
  [paymentsAlreadyMadeInput, {name: 'paid'}],
  [closingDateInput, {name: 'closing-date'}],
  [prepaymentInput, {name: 'prepay'}],
  [stocksReturnRateInput, {name: 'stock_rate'}],
]);

const cookieValueMap: Readonly<Map<HTMLInputElement, InputEntry>> = new Map([
  [annualIncomeInput, {name: 'annual_income'}],
  [totalAssetsInput, {name: 'total_assets'}],
]);

const contextFromInputs = () => new Context({
  price: utils.orZero(priceInput),
  homeValue: utils.orZero(homeValueInput),
  hoa: utils.orZero(hoaInput),
  downPaymentPercent: utils.orZero(downPaymentPercentageInput),
  downPaymentAbsolute: utils.orZero(downPaymentAbsoluteInput),
  interestRate: utils.orZero(interestRateInput),
  pointValue: utils.orZero(pointValueInput),
  pointsPurchased: utils.orZeroN(pointsPurchasedInput),
  pmi: utils.orZero(mortgageInsuranceInput),
  pmiEquityPercent: utils.orZero(pmiEquityPercentageInput),
  propertyTaxAbsolute: utils.orZero(propertyTaxAbsoluteInput),
  propertyTaxPercent: utils.orZero(propertyTaxPercentageInput),
  residentialExemptionAnnualSavings:
      utils.orZero(residentialExemptionSavingsInput),
  residentialExemptionDeduction:
      utils.orZero(residentialExemptionDeductionInput),
  homeownersInsurance: utils.orZero(homeownersInsuranceInput),
  closingCost: utils.orZero(closingCostInput),
  mortgageTerm: utils.orZeroN(mortgageTermInput),
  annualIncome: utils.orZero(annualIncomeInput),
  monthlyDebt: utils.orZero(monthlyDebtInput),
  totalAssets: utils.orZero(totalAssetsInput),
  alreadyClosed: alreadyClosedInput.checked,
  paymentsAlreadyMade: utils.orZeroN(paymentsAlreadyMadeInput),
  closingDate: closingDateInput.value ? new Date(closingDateInput.value) :
                                        undefined,
  prepayment: utils.orZero(prepaymentInput),
  stocksReturnRate: utils.orUndef(stocksReturnRateInput),
  now: d3.timeDay(),
});

// Attaches listeners to react to user input, URL changes.
const attachListeners = (): void => {
  clearInputsButton.addEventListener('click', () => void clearInputs());
  const reactToInput = (elt: HTMLInputElement) => () => {
    utils.saveFields(urlParamMap, cookieValueMap, elt);
    setContents(contextFromInputs());
  };
  for (const elt of urlParamMap.keys()) {
    elt.addEventListener('input', reactToInput(elt));
  }
  for (const elt of cookieValueMap.keys()) {
    elt.addEventListener('input', reactToInput(elt));
  }
  window.onpopstate = () => void populateFields();
};

// Set the contents of all the outputs based on the `ctx`.
const setContents = (ctx: Context): void => {
  showAmountHints(ctx);
  loanAmountOutput.innerText =
      `${fmt.format(ctx.price.sub(ctx.downPayment).toNumber())}`;

  purchasePaymentOutput.innerText = `${
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
    clearMonthlyPaymentOutputs();
    return;
  }

  const M = ctx.downPayment.eq(ctx.price) ? new Decimal(0) :
                                            utils.computeAmortizedPaymentAmount(
                                                ctx.price.sub(ctx.downPayment),
                                                ctx.interestRate.div(12),
                                                ctx.n,
                                            );
  const monthlyLoanPayment = M.add(ctx.prepayment);
  principalAndInterestOutput.innerText =
      `${fmt.format(monthlyLoanPayment.toNumber())}`;
  const extras = Decimal.sum(ctx.hoa, ctx.propertyTax, ctx.homeownersInsurance);

  monthlyPaymentAmountOutput.innerText =
      `${fmt.format(monthlyLoanPayment.add(extras).toNumber())}`;
  monthlyPaymentPmiOutput.innerText = `${
      fmt.format(Decimal.sum(monthlyLoanPayment, extras, ctx.pmi).toNumber())}`;
  const showPmi = ctx.pmi.gt(0) && ctx.downPaymentPct.lt(ctx.pmiEquityPct);
  utils.getHtmlElt('monthly-payment-without-pmi-span').style.display =
      showPmi ? '' : 'none';
  utils.getHtmlElt('monthly-payment-pmi-div').style.display =
      showPmi ? '' : 'none';
  const schedule = utils.calculatePaymentSchedule(ctx, monthlyLoanPayment);
  viz.buildPaymentScheduleChart(schedule, fmt, paymentTypes);
  const pmiMonths =
      utils.countSatisfying(schedule, payment => !payment.data.pmi.eq(0));
  pmiPaymentTimelineOutput.innerText = `${utils.formatMonthNum(pmiMonths)} (${
      fmt.format(ctx.pmi.mul(pmiMonths).toNumber())} total)`;
  const cumulativeSums = utils.cumulativeSumByFields(schedule, paymentTypes);
  if (!M.eq(0)) {
    viz.buildCumulativeChart(cumulativeSums, fmt, loanPaymentTypes);
    lifetimeOfLoanOutput.innerText = `${
        utils.formatMonthNum(
            utils.countSatisfying(schedule, m => m.data.principal.gt(0)),
            ctx.closingDate)}`
    lifetimePaymentOutput.innerText = `${
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
    lifetimePaymentOutput.innerText = `${fmt.format(0)}`;
  }

  utils.showConditionalOutput(!ctx.totalAssets.eq(0), [
    {
      containerName: 'fired-tomorrow-countdown-div',
      outputElt: firedTomorrowCountdownOutput,
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
  ]);

  const absoluteEquityOwned =
      (ctx.alreadyClosed ? ctx.downPayment : new Decimal(0))
          .add(cumulativeSums[ctx.paymentsAlreadyMade]!.data.principal);

  utils.showConditionalOutput(!!ctx.paymentsAlreadyMade || ctx.alreadyClosed, [
    {
      containerName: 'total-paid-so-far-div',
      outputElt: totalPaidSoFarOutput,
      generateOutput: () => `${
          fmt.format((ctx.alreadyClosed ? ctx.closingCost.add(ctx.downPayment) :
                                          new Decimal(0))
                         .add(utils.sumOfKeys(
                             cumulativeSums[ctx.paymentsAlreadyMade]!.data,
                             paymentTypes))
                         .toNumber())}`,
    },
    {
      containerName: 'equity-owned-so-far-div',
      outputElt: equityOwnedSoFarOutput,
      generateOutput: () => `${
          pctFmt.format(absoluteEquityOwned.div(ctx.homeValue).toNumber())} (${
          fmt.format(absoluteEquityOwned.toNumber())})`,
    },
    {
      containerName: 'total-loan-owed-div',
      outputElt: totalLoanOwedOutput,
      generateOutput() {
        const totalPrincipalAndInterestPaid = utils.sumOfKeys(
            cumulativeSums[ctx.paymentsAlreadyMade]!.data, loanPaymentTypes);
        const totalPrincipalAndInterestToPay = utils.sumOfKeys(
            cumulativeSums[cumulativeSums.length - 1]!.data, loanPaymentTypes);
        return `${
            fmt.format(totalPrincipalAndInterestToPay
                           .sub(totalPrincipalAndInterestPaid)
                           .toNumber())}`;
      },
    },
    {
      containerName: 'remaining-equity-to-pay-for-div',
      outputElt: remainingEquityOutput,
      generateOutput: () =>
          `${fmt.format(ctx.price.sub(absoluteEquityOwned).toNumber())}`,
    },
  ]);

  utils.showConditionalOutput(!!ctx.annualIncome, [
    {
      containerName: 'debt-to-income-ratio-div',
      outputElt: debtToIncomeOutput,
      generateOutput: () => `${
          pctFmt.format(
              Decimal.sum(ctx.monthlyDebt, monthlyLoanPayment, extras, ctx.pmi)
                  .div(ctx.annualIncome)
                  .mul(12)
                  .toNumber())}`,
    },
  ]);

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
    utils.fillTemplateElts('mortgage-term', utils.formatMonthNum(ctx.n));
    utils.fillTemplateElts(
        'prepay-amount', fmt.format(ctx.prepayment.toNumber()));
    prepayComparisonOutput.innerText = `${
        fmt.format(utils
                       .computeStockAssets(
                           schedule
                               .map(
                                   m => monthlyLoanPayment.sub(Decimal.sum(
                                       m.data.interest, m.data.principal)))
                               .filter(x => !x.eq(0)),
                           ctx.stocksReturnRate)
                       .toNumber())}`;

    stocksComparisonOutput.innerText = `${
        fmt.format(
            utils
                .computeStockAssets(
                    new Array(ctx.n).fill(ctx.prepayment), ctx.stocksReturnRate)
                .toNumber())}`;
  }
};

// Updates the "hints"/previews displayed alongside the input fields.
const showAmountHints = (ctx: Context): void => {
  homeValueHintOutput.innerText = `(${fmt.format(ctx.homeValue.toNumber())})`;
  downPaymentHintOutput.innerText =
      `(${fmt.format(ctx.downPayment.toNumber())})`;
  interestRateHintOutput.innerText =
      `(${hundredthsPctFmt.format(ctx.interestRate.toNumber())})`;
  pointValueHintOutput.innerText =
      `(${hundredthsPctFmt.format(ctx.pointValue.toNumber())})`;
  pmiEquityPercentageHintOutput.innerText =
      `(${pctFmt.format(ctx.pmiEquityPct.toNumber())})`;
  propertyTaxHintOutput.innerText = `(Effective ${
      fmt.format(ctx.propertyTax.mul(12)
                     .div(ctx.homeValue)
                     .mul(1000)
                     .toNumber())} / $1000; ${
      fmt.format(ctx.propertyTax.toNumber())}/mo)`;
  residentialExemptionHintOutput.innerText =
      `(${fmt.format(ctx.residentialExemptionPerMonth.toNumber())}/mo)`
  mortgageTermHintOutput.innerText = `(${ctx.mortgageTerm} yrs)`;
  paymentsAlreadyMadeHintOutput.innerText =
      `(${ctx.paymentsAlreadyMade} payments)`;
  stocksReturnRateHintOutput.innerText =
      `(${hundredthsPctFmt.format(ctx.stocksReturnRate.toNumber())})`
};

// Clears output elements associated with monthly payments.
const clearMonthlyPaymentOutputs = (): void => {
  principalAndInterestOutput.innerText = '';
  monthlyPaymentAmountOutput.innerText = '';
  monthlyPaymentPmiOutput.innerText = '';
  lifetimePaymentOutput.innerText = '';

  debtToIncomeOutput.innerText = '';
  utils.getHtmlElt('debt-to-income-ratio-div').style.display = 'none';

  document.querySelector('#schedule_viz > svg:first-of-type')?.remove();
  utils.removeChildren(utils.getHtmlElt('schedule_tab'));
  document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
  utils.removeChildren(utils.getHtmlElt('cumulative_tab'));
};

// Reads fields from the URL and from cookies, and populates the UI accordingly.
const populateFields = (): void => {
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
    setContents(contextFromInputs());
  }
};

// Clears all parameters from the `url`, and clears all cookies.
const clearInputs = () => {
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
  setContents(contextFromInputs());
};

populateFields();
// To support URL param / cookie deprecations cleanly, we write out the UI
// fields immediately after populating them. This "upgrades" fields that have
// been moved from URL params to cookies (or vice versa).
utils.saveFields(urlParamMap, cookieValueMap);
utils.clearDeprecatedStorage(urlParamMap, cookieValueMap);
attachListeners();
})();
