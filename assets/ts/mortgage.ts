import * as d3 from 'd3';
import {Decimal} from 'decimal.js';

import {Context} from './context';
import {InputEntry, keys, Margin, PaymentRecord, PaymentRecordWithMonth, PaymentType} from './types';
import * as utils from './utils';

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

const textColor = '#f0e7d5';

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
const prepaymentInput = utils.getInputElt('prepayment-input');
const stocksReturnRateInput = utils.getInputElt('stocks-return-rate-input');

// Outputs.
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
const stocksReturnRateHintOutput = utils.getHtmlElt('stocks-return-rate-hint');
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

const fieldColor = (pt: PaymentType): string => {
  switch (pt) {
    case 'principal':
      return '#1f77b4';
    case 'interest':
      return '#ff7f0e';
    case 'hoa':
      return '#bcbd22';
    case 'property_tax':
      return '#17becf';
    case 'homeowners_insurance':
      return '#9467bd';
    case 'pmi':
      return '#7f7f7f';
  }
};

const fieldDisplay = (pt: PaymentType): string => {
  switch (pt) {
    case 'principal':
      return 'Principal';
    case 'interest':
      return 'Interest';
    case 'hoa':
      return 'HOA';
    case 'property_tax':
      return 'Property Tax';
    case 'homeowners_insurance':
      return 'Homeowner\'s Insurance';
    case 'pmi':
      return 'PMI';
  }
};

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
  // Assume a 30 year fixed loan.
  mortgageTerm: utils.orZeroN(mortgageTermInput),
  annualIncome: utils.orZero(annualIncomeInput),
  monthlyDebt: utils.orZero(monthlyDebtInput),
  totalAssets: utils.orZero(totalAssetsInput),
  alreadyClosed: alreadyClosedInput.checked,
  paymentsAlreadyMade: utils.orZeroN(paymentsAlreadyMadeInput),
  prepayment: utils.orZero(prepaymentInput),
  stocksReturnRate: utils.orUndef(stocksReturnRateInput),
});

// Attaches listeners to react to user input, URL changes.
const attachListeners = (): void => {
  clearInputsButton.addEventListener('click', () => void clearInputs());
  for (const elt of urlParamMap.keys()) {
    elt.addEventListener('input', () => {
      saveFields(elt);
      setContents(contextFromInputs());
    });
  }
  window.onpopstate = () => void populateFields();
};

// Set the contents of all the outputs based on the `ctx`.
const setContents = (ctx: Context): void => {
  showAmountHints(ctx);
  loanAmountOutput.innerText =
      `${fmt.format(ctx.price.sub(ctx.downPayment).toNumber())}`;

  if (!ctx.interestRate.eq(0) || ctx.downPayment.eq(ctx.price)) {
    const M = ctx.downPayment.eq(ctx.price) ?
        new Decimal(0) :
        monthlyFormula(
            ctx.price.mul(Decimal.sub(1, ctx.downPaymentPct)),
            ctx.interestRate.div(12),
            ctx.n,
        );
    const monthlyLoanPayment = M.add(ctx.prepayment);
    principalAndInterestOutput.innerText =
        `${fmt.format(monthlyLoanPayment.toNumber())}`;
    const extras =
        Decimal.sum(ctx.hoa, ctx.propertyTax, ctx.homeownersInsurance);

    monthlyPaymentAmountOutput.innerText =
        `${fmt.format(monthlyLoanPayment.add(extras).toNumber())}`;
    monthlyPaymentPmiOutput.innerText = `${
        fmt.format(
            Decimal.sum(monthlyLoanPayment, extras, ctx.pmi).toNumber())}`;
    const showPmi = ctx.pmi && ctx.downPaymentPct < ctx.pmiEquityPct;
    utils.getHtmlElt('monthly-payment-without-pmi-span').style.display =
        showPmi ? '' : 'none';
    utils.getHtmlElt('monthly-payment-pmi-div').style.display =
        showPmi ? '' : 'none';
    const schedule = calculatePaymentSchedule(ctx, monthlyLoanPayment);
    buildPaymentScheduleChart(schedule, keys);
    const pmiMonths =
        utils.countSatisfying(schedule, payment => !payment.data.pmi.eq(0));
    pmiPaymentTimelineOutput.innerText = `${utils.formatMonthNum(pmiMonths)} (${
        fmt.format(ctx.pmi.mul(pmiMonths).toNumber())} total)`;
    const cumulativeSums = utils.cumulativeSumByFields(schedule, keys);
    if (!M.eq(0)) {
      buildCumulativeChart(cumulativeSums, ['principal', 'interest', 'pmi']);
      lifetimeOfLoanOutput.innerText = `${
          utils.formatMonthNum(
              utils.countSatisfying(schedule, m => m.data.principal.gt(0)))}`
      lifetimePaymentOutput.innerText = `${
          fmt.format(utils
                         .sumOfKeys(
                             cumulativeSums[cumulativeSums.length - 1]!.data,
                             ['principal', 'interest', 'pmi'])
                         .toNumber())}`;
    } else {
      document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
      lifetimePaymentOutput.innerText = `${fmt.format(0)}`;
    }

    showConditionalOutput(
        !ctx.totalAssets.eq(0), 'fired-tomorrow-countdown-div',
        firedTomorrowCountdownOutput,
        () => `${
            utils.formatMonthNum(utils.countBurndownMonths(
                ctx.totalAssets.sub(
                    (ctx.alreadyClosed ? new Decimal(0) :
                                         ctx.downPayment.add(ctx.closingCost))),
                schedule.slice(ctx.paymentsAlreadyMade).map(d => d.data),
                ctx.monthlyDebt))}`)

    showConditionalOutput(
        !!ctx.paymentsAlreadyMade || ctx.alreadyClosed, 'total-paid-so-far-div',
        totalPaidSoFarOutput,
        () => `${
            fmt.format(
                (ctx.alreadyClosed ? ctx.closingCost.add(ctx.downPayment) :
                                     new Decimal(0))
                    .add(utils.sumOfKeys(
                        cumulativeSums[ctx.paymentsAlreadyMade]!.data, keys))
                    .toNumber())}`);

    const absoluteEquityOwned =
        (ctx.alreadyClosed ? ctx.downPayment : new Decimal(0))
            .add(cumulativeSums[ctx.paymentsAlreadyMade]!.data['principal']);
    showConditionalOutput(
        !!ctx.paymentsAlreadyMade || ctx.alreadyClosed,
        'equity-owned-so-far-div', equityOwnedSoFarOutput, () => {
          return `${
              pctFmt.format(
                  absoluteEquityOwned.div(ctx.homeValue).toNumber())} (${
              fmt.format(absoluteEquityOwned.toNumber())})`;
        });

    showConditionalOutput(
        !!ctx.paymentsAlreadyMade || ctx.alreadyClosed, 'total-loan-owed-div',
        totalLoanOwedOutput, () => {
          const totalPrincipalAndInterestPaid = utils.sumOfKeys(
              cumulativeSums[ctx.paymentsAlreadyMade]!.data,
              ['principal', 'interest']);
          const totalPrincipalAndInterestToPay = utils.sumOfKeys(
              cumulativeSums[cumulativeSums.length - 1]!.data,
              ['principal', 'interest']);
          return `${
              fmt.format(totalPrincipalAndInterestToPay
                             .sub(totalPrincipalAndInterestPaid)
                             .toNumber())}`;
        });

    showConditionalOutput(
        !!ctx.paymentsAlreadyMade || ctx.alreadyClosed,
        'remaining-equity-to-pay-for-div', remainingEquityOutput,
        () => `${fmt.format(ctx.price.sub(absoluteEquityOwned).toNumber())}`);

    showConditionalOutput(
        !!ctx.annualIncome, 'debt-to-income-ratio-div', debtToIncomeOutput,
        () => `${
            pctFmt.format(
                Decimal
                    .sum(ctx.monthlyDebt, monthlyLoanPayment, extras, ctx.pmi)
                    .div(ctx.annualIncome)
                    .mul(12)
                    .toNumber())}`);

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
          fmt.format(utils
                         .computeStockAssets(
                             new Array(ctx.n).fill(ctx.prepayment),
                             ctx.stocksReturnRate)
                         .toNumber())}`;
    }
  } else {
    clearMonthlyPaymentOutputs();
  }

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
};

// Computes the sum of principal + interest to be paid each month of the loan.
const monthlyFormula = (P: Decimal, r: Decimal, n: number): Decimal =>
    (P.mul(r).mul(Decimal.pow(r.add(1), n)))
        .div(Decimal.pow(r.add(1), n).sub(1));

// Conditionally shows or hides an output.
const showConditionalOutput =
    (condition: boolean, containerName: string, outputElt: HTMLElement,
     generateOutput: () => string) => {
      const container = utils.getHtmlElt(containerName);
      let text;
      let display;
      if (condition) {
        text = generateOutput();
        display = '';
      } else {
        text = '';
        display = 'none';
      }
      outputElt.innerText = text;
      container.style.display = display;
    };

// Computes the payment for each month of the loan.
const calculatePaymentSchedule =
    (ctx: Context, monthlyLoanPayment: Decimal): PaymentRecordWithMonth[] => {
      let equityOwned = ctx.downPayment;
      const schedule: PaymentRecordWithMonth[] = [];
      for (const month of d3.range(ctx.n)) {
        const principalRemaining = ctx.price.sub(equityOwned);
        const interestPayment =
            ctx.interestRate.div(12).mul(principalRemaining);
        const pmiPayment = equityOwned.lt(ctx.pmiEquityPct.mul(ctx.price)) ?
            ctx.pmi :
            new Decimal(0);
        const principalPaidThisMonth = monthlyLoanPayment.sub(interestPayment)
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
  stocksReturnRateHintOutput.innerText =
      `(${hundredthsPctFmt.format(ctx.stocksReturnRate.toNumber())})`
};

// Given the X axis and an X mouse coordinate, finds the month that is being
// hovered over.
const bisectMonth =
    (data: readonly PaymentRecordWithMonth[], x: d3.ScaleLinear<number, number>,
     mouseX: number): PaymentRecordWithMonth => {
      const month = x.invert(mouseX);
      const index = d3.bisector((d: PaymentRecordWithMonth) => d.month)
                        .left(data, month, 1);
      const a = data[index - 1]!;
      const b = data[index];
      return b && month - a.month > b.month - month ? b : a;
    };

// Builds the chart of monthly payments over time.
const buildPaymentScheduleChart =
    (schedule: readonly PaymentRecordWithMonth[], keys: readonly PaymentType[]):
        void => {
          // set the dimensions and margins of the graph
          const margin = {top: 50, right: 100, bottom: 120, left: 100};
          const width = 900 - margin.left - margin.right;
          const height = 450 - margin.top - margin.bottom;

          const svg = makeSvg('schedule_viz', width, height, margin);

          const {x, y} = makeAxes(
              svg,
              schedule,
              keys,
              width,
              height,
              margin,
              'Monthly Payment',
              d3.sum,
          );

          // Add the area
          svg.append('g')
              .selectAll('path')
              .data(d3.stack<unknown, PaymentRecordWithMonth, PaymentType>()
                        .keys(keys)
                        .order(d3.stackOrderNone)
                        .offset(d3.stackOffsetNone)
                        .value((d, key) => d.data[key].toNumber())(schedule))
              .join('path')
              .style('fill', d => fieldColor(d.key))
              .attr(
                  'd',
                  d3.area<d3.SeriesPoint<PaymentRecordWithMonth>>()
                      .x(d => x(d.data.month))
                      .y0(d => y(d['0']))
                      .y1(d => y(d['1'])),
              );

          makeTooltip(svg, schedule, keys, x, (mouseY, datum) => {
            const yTarget = y.invert(mouseY);
            let cumulative = new Decimal(0);
            for (const [idx, key] of keys.entries()) {
              if (cumulative.add(datum[key]).gte(yTarget)) {
                return idx;
              }
              cumulative = cumulative.add(datum[key]);
            }
            return keys.length - 1;
          });

          makeLegend(svg, width, d => fieldColor(d), keys);
        };

// Builds the chart of cumulative payments over time.
const buildCumulativeChart =
    (data: readonly PaymentRecordWithMonth[],
     keys: readonly PaymentType[]): void => {
      const margin = {top: 50, right: 100, bottom: 120, left: 100};
      const width = 900 - margin.left - margin.right;
      const height = 450 - margin.top - margin.bottom;

      const svg = makeSvg('cumulative_viz', width, height, margin);

      const {x, y} = makeAxes(
          svg,
          data,
          keys,
          width,
          height,
          margin,
          'Cumulative Payment',
          d3.max,
      );

      const area = d3.area<{month: number, value: Decimal}>()
                       .curve(d3.curveMonotoneX)
                       .x(d => x(d.month))
                       .y0(y(0))
                       .y1(d => y(d.value.toNumber()));

      svg.selectAll('.area')
          .data(keys.map(key => ({
                           key,
                           values: data.map(datum => ({
                                              month: datum.month,
                                              value: datum.data[key],
                                            })),
                         })))
          .enter()
          .append('g')
          .attr('class', d => `area ${d.key}`)
          .append('path')
          .attr('d', d => area(d.values))
          .style('fill', d => transparent(fieldColor(d.key)));

      makeTooltip(svg, data, keys, x, (mouseY, datum) => {
        const yTarget = y.invert(mouseY);
        const sorted = keys.map(key => ({key, value: datum[key]}))
                           .sort((a, b) => a.value.cmp(b.value));
        const elt = sorted.find(
            (elt, idx, arr) => elt.value.gte(yTarget) &&
                (idx === arr.length - 1 || arr[idx + 1]!.value.gte(yTarget)),
            ) ??
            sorted[sorted.length - 1]!;
        return keys.indexOf(elt.key);
      });

      makeLegend(svg, width, d => transparent(fieldColor(d)), keys);
    };

// Adds an alpha channel to a hex color string to make it translucent.
const transparent = (color: string): string => `${color}aa`;

// Creates a figure.
const makeSvg =
    (divId: string, width: number, height: number, margin: Margin):
        d3.Selection<SVGGElement, unknown, HTMLElement, unknown> => {
      d3.select(`#${divId}`).select('svg').remove();
      return d3.select(`#${divId}`)
          .append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);
    };

// Creates axes for the given figure.
const makeAxes =
    (svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
     data: readonly PaymentRecordWithMonth[], keys: readonly PaymentType[],
     width: number, height: number, margin: Margin, yLabel: string,
     yDomainFn: (ys: readonly number[]) => number): {
      x: d3.ScaleLinear<number, number, never>,
      y: d3.ScaleLinear<number, number, never>,
    } => {
      // Add X axis
      const ext = d3.extent(data, d => d.month) as [number, number];
      const x = d3.scaleLinear().domain(ext).range([
        0,
        width,
      ]);
      svg.append('g')
          .attr('transform', `translate(0, ${height})`)
          .call(d3.axisBottom(x).tickValues(d3.range(0, data.length, 12)));

      // text label for the x axis
      svg.append('text')
          .attr('transform', `translate(${width / 2}, ${height + margin.top})`)
          .style('text-anchor', 'middle')
          .text('Month')
          .attr('fill', textColor);

      const y =
          d3.scaleLinear()
              .domain([
                0,
                d3.max(
                    data,
                    d => yDomainFn(keys.map(k => d.data[k].toNumber())) * 1.25)!
                ,
              ])
              .range([height, 0]);
      svg.append('g').call(d3.axisLeft(y));

      // text label for the y axis
      svg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('y', 0 - margin.left)
          .attr('x', 0 - height / 2)
          .attr('dy', '1em')
          .style('text-anchor', 'middle')
          .text(yLabel)
          .attr('fill', textColor);

      return {x, y};
    };

// Creates a tooltip for the given figure.
const makeTooltip =
    (svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
     data: readonly PaymentRecordWithMonth[], keys: readonly PaymentType[],
     x: d3.ScaleLinear<number, number, never>,
     identifyPaymentType: (yCoord: number, d: PaymentRecord) =>
         number): void => {
      const tooltip = svg.append('g');

      svg.on('touchmove mousemove', function(event) {
        // eslint-disable-next-line no-invalid-this
        const pointer = d3.pointer(event, this);
        const datum = bisectMonth(data, x, pointer[0]);
        const paymentTypeIdx = identifyPaymentType(pointer[1], datum.data);

        const value = keys.map(
                              k => `${fieldDisplay(k)}: ${
                                       fmt.format(datum.data[k].toNumber())}` +
                                  '\n')
                          .join('') +
            `Month: ${utils.formatMonthNum(datum.month)}`;
        tooltip.attr('transform', `translate(${x(datum.month)},${pointer[1]})`)
            .call(callout, value, paymentTypeIdx);
      });

      svg.on('touchend mouseleave', () => tooltip.call(callout, null, null));

      const callout =
          (g: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
           value: string, paymentTypeIdx: number): void => {
            if (!value) {
              g.style('display', 'none');
              return;
            }

            g.style('display', null)
                .style('pointer-events', 'none')
                .style('font', '12px sans-serif');

            const path = g.selectAll('path')
                             .data([null])
                             .join('path')
                             .attr('fill', 'white')
                             .attr('stroke', 'black');

            const text = g.selectAll('text').data([null]).join('text').call(
                text => text.selectAll('tspan')
                            .data((value + '').split(/\n/))
                            .join('tspan')
                            .attr('x', 0)
                            .attr('y', (_, i) => `${i * 1.1}em`)
                            .style(
                                'font-weight',
                                (_, i) => i === paymentTypeIdx ? 'bold' : null,
                                )
                            .text(d => d),
            );

            const {y, width: w, height: h} =
                (text.node() as SVGGElement).getBBox();

            text.attr('transform', `translate(${- w / 2},${15 - y})`);
            path.attr(
                'd',
                `M${- w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${
                    w + 20}z`,
            );
          };
    };

// Creates a legend for the given figure, with the given payment types and
// corresponding colors.
const makeLegend =
    (svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
     width: number, color: (d: PaymentType) => string,
     keys: readonly PaymentType[]): void => {
      const legend = svg.append('g')
                         .attr('class', 'legend')
                         .attr('transform', `translate(${width - 200}, -50)`);
      legend.selectAll('rect')
          .data(keys)
          .enter()
          .append('rect')
          .attr('x', 0)
          .attr('y', (_, i) => i * 18)
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', color);

      legend.selectAll('text')
          .data(keys)
          .enter()
          .append('text')
          .text(d => fieldDisplay(d))
          .attr('x', 18)
          .attr('y', (_, i) => i * 18)
          .attr('text-anchor', 'start')
          .attr('dominant-baseline', 'hanging')
          .attr('fill', textColor);
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
  document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
};

// Reads fields from the URL and from cookies, and populates the UI accordingly.
const populateFields = (): void => {
  const url = new URL(location.href);
  let hasValue = false;
  for (const [elt, {name}] of urlParamMap.entries()) {
    switch (elt.type) {
      case 'text':
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

// Saves fields to the URL and cookies.
const saveFields = (changed?: HTMLInputElement): void => {
  const url = new URL(location.href);
  let urlChanged = false;
  if (changed) {
    if (urlParamMap.has(changed)) {
      urlChanged = urlChanged ||
          utils.updateURLParam(url, changed, urlParamMap.get(changed)!);
    }
    if (cookieValueMap.has(changed))
      updateCookie(changed, cookieValueMap.get(changed)!);
  } else {
    for (const [elt, entry] of urlParamMap.entries()) {
      urlChanged = urlChanged || utils.updateURLParam(url, elt, entry);
    }
    for (const [elt, entry] of cookieValueMap.entries()) {
      updateCookie(elt, entry);
    }
  }
  if (urlChanged) history.pushState({}, '', url.toString());
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
    deleteCookie(entry.name);
  }
  setContents(contextFromInputs());
};

// Updates the value of the given cookie.
const updateCookie =
    (elt: HTMLInputElement, entry: InputEntry) => {
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

// Clears out deprecated URL params and cookies.
const clearDeprecatedStorage = () => {
  const url = new URL(location.href);
  let modified = false;
  for (const {name, deprecated} of urlParamMap.values())
    if (deprecated) modified = utils.deleteParam(url, name) || modified;

  if (modified) history.pushState({}, '', url.toString());

  for (const {name, deprecated} of cookieValueMap.values())
    if (deprecated) deleteCookie(name);
};

// Sets the value of the cookie with the given name.
const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)};${COOKIE_SUFFIX}`;
};

// "Deletes" the cookie with the given name. This doesn't seem to really delete
// the cookie; it just makes it a session cookie, so that it won't be present in
// the next session of the browser.
const deleteCookie = (name: string) => {
  document.cookie = `${name}=0;${COOKIE_SUFFIX_DELETE}`;
};

populateFields();
// To support URL param / cookie deprecations cleanly, we write out the UI
// fields immediately after populating them. This "upgrades" fields that have
// been moved from URL params to cookies (or vice versa).
saveFields();
clearDeprecatedStorage();
attachListeners();
})();
