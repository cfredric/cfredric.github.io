import d3 = require('d3');

// Typescript doesn't like having variables that are never read, but we want to
// expose the payment schedule as a variable for the user to play around with in
// the JS developer console, if they want to do some more complicated stuff.
// @ts-ignore
let data: PaymentRecord[] = [];

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
const orZero = (elt: HTMLInputElement): number => {
  const num = Number.parseFloat(elt.value);
  return Number.isNaN(num) ? 0 : num;
};
const clamp = (x: number, {min, max}: {min: number, max: number}): number =>
    Math.max(min, Math.min(max, x));

// Inputs.
const priceInput = document.getElementById('price-input') as HTMLInputElement;
const homeValueInput =
    document.getElementById('home-value-input') as HTMLInputElement;
const homeValueHintOutput = document.getElementById('home-value-hint')!;
const hoaInput = document.getElementById('hoa-input') as HTMLInputElement;
const downPaymentPercentageInput =
    document.getElementById('down-payment-percentage-input') as
    HTMLInputElement;
const downPaymentAbsoluteInput =
    document.getElementById('down-payment-absolute-input') as HTMLInputElement;
const interestRateInput =
    document.getElementById('interest-rate-input') as HTMLInputElement;
const interestRateHintOutput = document.getElementById('interest-rate-hint')!;
const pointsPurchasedInput =
    document.getElementById('points-purchased-input') as HTMLInputElement;
const pointValueInput =
    document.getElementById('point-value-input') as HTMLInputElement;
const pointValueHintOutput = document.getElementById('point-value-hint')!;
const mortgageInsuranceInput = document.getElementById(
                                   'mortgage-insurance-input',
                                   ) as HTMLInputElement;
const pmiEquityPercentageInput =
    document.getElementById('mortgage-insurance-equity-percentage-input') as
    HTMLInputElement;
const pmiEquityPercentageHintOutput =
    document.getElementById('mortgage-insurance-equity-percent-hint')!;
const propertyTaxAbsoluteInput =
    document.getElementById('property-tax-absolute-input') as HTMLInputElement;
const propertyTaxPercentageInput =
    document.getElementById('property-tax-percentage-input') as
    HTMLInputElement;
const propertyTaxHintOutput =
    document.getElementById('property-tax-percentage-hint')!;
const residentialExemptionSavingsInput =
    document.getElementById('residential-exemption-savings-input') as
    HTMLInputElement;
const residentialExemptionDeductionInput =
    document.getElementById('residential-exemption-deduction-input') as
    HTMLInputElement;
const residentialExemptionHintOutput =
    document.getElementById('residential-exemption-hint')!;
const homeownersInsuranceInput = document.getElementById(
                                     'homeowners-insurance-input',
                                     ) as HTMLInputElement;
const closingCostInput =
    document.getElementById('closing-cost-input') as HTMLInputElement;
const mortgageTermInput =
    document.getElementById('mortgage-term-input') as HTMLInputElement;
const mortgageTermHintOutput = document.getElementById('mortgage-term-hint')!;
const annualIncomeInput =
    document.getElementById('annual-income-input') as HTMLInputElement;
const monthlyDebtInput =
    document.getElementById('monthly-debt-input') as HTMLInputElement;
const totalAssetsInput =
    document.getElementById('total-assets-input') as HTMLInputElement;
const alreadyClosedInput =
    document.getElementById('already-closed-input') as HTMLInputElement;
const paymentsAlreadyMadeInput =
    document.getElementById('payments-already-made-input') as HTMLInputElement;

// Outputs.
const downPaymentHintOutput = document.getElementById('down-payment-hint')!;
const loanAmountOutput = document.getElementById('loan-amount-output')!;
const principalAndInterestOutput =
    document.getElementById('principal-and-interest-output')!;
const monthlyPaymentAmountOutput = document.getElementById(
    'monthly-payment-output',
    )!;
const monthlyPaymentPmiOutput = document.getElementById(
    'monthly-payment-pmi-output',
    )!;
const pmiPaymentTimelineOutput =
    document.getElementById('pmi-payment-timeline-output')!;
const lifetimePaymentOutput = document.getElementById(
    'lifetime-payment-output',
    )!;
const purchasePaymentOutput = document.getElementById(
    'purchase-payment-output',
    )!;
const totalPaidSoFarOutput =
    document.getElementById('total-paid-so-far-output')!;
const equityOwnedSoFarOutput =
    document.getElementById('equity-owned-so-far-output')!;
const totalLoanOwedOutput = document.getElementById('total-loan-owed-output')!;
const remainingEquityOutput =
    document.getElementById('remaining-equity-to-pay-for-output')!;
const debtToIncomeOutput =
    document.getElementById('debt-to-income-ratio-output')!;
const firedTomorrowCountdownOutput =
    document.getElementById('fired-tomorrow-countdown-output')!;

const keys = [
  'principal',
  'interest',
  'hoa',
  'property_tax',
  'homeowners_insurance',
  'pmi',
] as const;
type PaymentType = typeof keys[number];

const COOKIE_ATTRIBUTES: Readonly<string[]> = [
  'Secure',
  'SameSite=Lax',
  `Domain=${window.location.hostname}`,
  'Path=/Mortgage/',
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

interface InputEntry {
  name: string;
  deprecated?: boolean;
}

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
]);

const cookieValueMap: Readonly<Map<HTMLInputElement, InputEntry>> = new Map([
  [annualIncomeInput, {name: 'annual_income'}],
  [totalAssetsInput, {name: 'total_assets'}],
]);

const attachListeners = (): void => {
  const onChange = (elt: HTMLInputElement) => {
    const ctx = new Context();
    showAmountHints(ctx);
    saveFields(elt);
    setContents(ctx);
  };
  for (const elt of urlParamMap.keys()) {
    elt.addEventListener('input', () => onChange(elt));
  }
};

const console_prompt = () => {
  console.log(
      'Play around with the data! ' +
      'The payment schedule is in a variable called `data`. ' +
      'D3 is exposed as `d3`.');
};

class Context {
  // This class captures a snapshot of the input fields at construction, and
  // computes all the interesting values to be used in the payment schedule
  // calculation.
  //
  // This is an optimization detail, as a kind of memoization to avoid needless
  // extra function calls when we've already computed a value.
  readonly price: number;
  readonly homeValue: number;
  readonly hoa: number;
  readonly downPayment: number;
  readonly downPaymentPct: number;
  readonly interestRate: number;
  readonly pointsPurchased: number;
  readonly pointValue: number;
  readonly pmi: number;
  readonly pmiEquityPct: number;
  readonly propertyTax: number;
  readonly residentialExemptionPerMonth: number;
  readonly homeownersInsurance: number;
  readonly closingCost: number;
  readonly mortgageTerm: number;
  readonly annualIncome: number;
  readonly monthlyDebt: number;
  readonly totalAssets: number;
  readonly alreadyClosed: boolean;
  readonly paymentsAlreadyMade: number;

  readonly n: number;

  constructor() {
    this.price = Math.max(0, orZero(priceInput));
    this.homeValue = Math.max(0, orZero(homeValueInput)) || this.price;
    this.hoa = Math.max(0, orZero(hoaInput));
    this.downPayment =
        clamp(orZero(downPaymentPercentageInput), {min: 0, max: 100}) / 100 *
            this.price ||
        clamp(orZero(downPaymentAbsoluteInput), {min: 0, max: this.price});
    this.downPaymentPct = this.downPayment / this.price;
    this.interestRate =
        clamp(orZero(interestRateInput), {min: 0, max: 100}) / 100;
    this.pointValue = Math.max(0, orZero(pointValueInput) / 100) || 0.0025;
    this.pointsPurchased = Math.max(0, orZero(pointsPurchasedInput));
    if (this.interestRate && this.pointsPurchased) {
      this.interestRate = Math.max(
          0, this.interestRate - this.pointsPurchased * this.pointValue);
    }
    this.pmi = this.downPaymentPct >= 0.2 ?
        0 :
        Math.max(0, orZero(mortgageInsuranceInput));
    this.pmiEquityPct =
        clamp(orZero(pmiEquityPercentageInput), {min: 0, max: 100}) / 100 ||
        0.22;
    {
      const rawMonthlyAbsolute = Math.max(0, orZero(propertyTaxAbsoluteInput));
      const rawAnnualRate =
          clamp(orZero(propertyTaxPercentageInput), {min: 0, max: 100}) / 100;

      const rawExemptionAnnualSavings =
          Math.max(0, orZero(residentialExemptionSavingsInput));
      const rawAnnualDeduction = clamp(
          orZero(residentialExemptionDeductionInput),
          {min: 0, max: this.price});

      if (rawExemptionAnnualSavings) {
        const monthlyAbsolute =
            rawMonthlyAbsolute || rawAnnualRate * this.homeValue / 12;
        this.propertyTax = monthlyAbsolute - rawExemptionAnnualSavings / 12;
        this.residentialExemptionPerMonth = rawExemptionAnnualSavings / 12;
      } else {
        const annualRate =
            rawMonthlyAbsolute * 12 / this.homeValue || rawAnnualRate;
        this.propertyTax =
            annualRate * (this.homeValue - rawAnnualDeduction) / 12;
        this.residentialExemptionPerMonth =
            annualRate * rawAnnualDeduction / 12;
      }
    }
    this.homeownersInsurance = Math.max(0, orZero(homeownersInsuranceInput));
    this.closingCost = Math.max(0, orZero(closingCostInput));
    // Assume a 30 year fixed loan.
    this.mortgageTerm = Math.max(0, orZero(mortgageTermInput)) || 30;
    this.n = 12 * this.mortgageTerm;
    this.annualIncome = Math.max(0, orZero(annualIncomeInput));
    this.monthlyDebt = Math.max(0, orZero(monthlyDebtInput));
    this.totalAssets = Math.max(0, orZero(totalAssetsInput));

    this.alreadyClosed = alreadyClosedInput.checked;
    this.paymentsAlreadyMade =
        clamp(orZero(paymentsAlreadyMadeInput), {min: 0, max: this.n});
  }
}

const setContents = (ctx: Context): void => {
  loanAmountOutput.innerText = `${fmt.format(ctx.price - ctx.downPayment)}`;

  if (ctx.interestRate || ctx.downPayment === ctx.price) {
    const M = ctx.downPayment === ctx.price ?
        0 :
        monthlyFormula(
            ctx.price * (1 - ctx.downPaymentPct),
            ctx.interestRate / 12,
            ctx.n,
        );
    principalAndInterestOutput.innerText = `${fmt.format(M)}`;
    const extras = ctx.hoa + ctx.propertyTax + ctx.homeownersInsurance;

    monthlyPaymentAmountOutput.innerText = `${fmt.format(M + extras)}`;
    monthlyPaymentPmiOutput.innerText = `${fmt.format(M + extras + ctx.pmi)}`;
    const showPmi = ctx.pmi && ctx.downPaymentPct < ctx.pmiEquityPct;
    document
        .getElementById(
            'monthly-payment-without-pmi-span',
            )!.style.display = showPmi ? '' : 'none';
    document.getElementById('monthly-payment-pmi-div')!.style.display =
        showPmi ? '' : 'none';
    const schedule = calculatePaymentSchedule(ctx, M);
    data = schedule;
    buildPaymentScheduleChart(schedule, keys);
    const pmiMonths =
        countSatisfying(schedule, payment => payment.data.pmi !== 0);
    pmiPaymentTimelineOutput.innerText = `${formatMonthNum(pmiMonths)} (${
        fmt.format(pmiMonths * ctx.pmi)} total)`;
    const cumulativeSums = cumulativeSumByFields(schedule, keys);
    if (M) {
      buildCumulativeChart(cumulativeSums, ['principal', 'interest', 'pmi']);
      lifetimePaymentOutput.innerText =
          `${fmt.format(ctx.n * M + d3.sum(schedule, d => d.data.pmi))}`;
    } else {
      document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
      lifetimePaymentOutput.innerText = `${fmt.format(0)}`;
    }

    showConditionalOutput(
        !!ctx.totalAssets, 'fired-tomorrow-countdown-div',
        firedTomorrowCountdownOutput,
        () => `${formatMonthNum(countBurndownMonths(ctx, schedule))}`)

    showConditionalOutput(
        !!ctx.paymentsAlreadyMade || ctx.alreadyClosed, 'total-paid-so-far-div',
        totalPaidSoFarOutput,
        () => `${
            fmt.format(
                (ctx.alreadyClosed ? ctx.closingCost + ctx.downPayment : 0) +
                sumAtIndex(cumulativeSums, keys, ctx.paymentsAlreadyMade))}`);

    const absoluteEquityOwned = (ctx.alreadyClosed ? ctx.downPayment : 0) +
        cumulativeSums[ctx.paymentsAlreadyMade]!.data['principal'];
    showConditionalOutput(
        !!ctx.paymentsAlreadyMade || ctx.alreadyClosed,
        'equity-owned-so-far-div', equityOwnedSoFarOutput, () => {
          return `${pctFmt.format(absoluteEquityOwned / ctx.homeValue)} (${
              fmt.format(absoluteEquityOwned)})`;
        });

    showConditionalOutput(
        !!ctx.paymentsAlreadyMade || ctx.alreadyClosed, 'total-loan-owed-div',
        totalLoanOwedOutput, () => {
          const totalPrincipalAndInterestPaid =
              (ctx.alreadyClosed ? ctx.closingCost + ctx.downPayment : 0) +
              sumAtIndex(
                  cumulativeSums, ['principal', 'interest'],
                  ctx.paymentsAlreadyMade);
          const totalPrincipalAndInterestToPay = ctx.closingCost +
              sumAtIndex(cumulativeSums, ['principal', 'interest'],
                         cumulativeSums.length - 1);
          return `${
              fmt.format(
                  totalPrincipalAndInterestToPay -
                  totalPrincipalAndInterestPaid)}`;
        });

    showConditionalOutput(
        !!ctx.paymentsAlreadyMade || ctx.alreadyClosed,
        'remaining-equity-to-pay-for-div', remainingEquityOutput,
        () => `${fmt.format(ctx.price - absoluteEquityOwned)}`);

    showConditionalOutput(
        !!ctx.annualIncome, 'debt-to-income-ratio-div', debtToIncomeOutput,
        () => `${
            pctFmt.format(
                (ctx.monthlyDebt + M + extras + ctx.pmi) / ctx.annualIncome *
                12)}`);
  } else {
    data = [];
    clearMonthlyPaymentOutputs();
  }

  purchasePaymentOutput.innerText = `${
      fmt.format(
          ctx.downPayment + ctx.closingCost +
              ctx.pointsPurchased * (ctx.price - ctx.downPayment) / 100,
          )}`;
};

const sumAtIndex =
    (data: readonly PaymentRecord[], keys: readonly PaymentType[],
     idx: number) =>
        keys.reduce(
            (sum: number, key: PaymentType) => sum + data[idx]!.data[key], 0);

const monthlyFormula = (P: number, r: number, n: number): number =>
    (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

interface PaymentRecord {
  month: number;
  data: Record<PaymentType, number>;
}

interface Margin {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const showConditionalOutput =
    (condition: boolean, containerName: string, outputElt: HTMLElement,
     generateOutput: () => string) => {
      const container = document.getElementById(containerName)!;
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

const calculatePaymentSchedule =
    (ctx: Context, monthlyPayment: number): PaymentRecord[] => {
      let equity = ctx.downPayment;
      const schedule: PaymentRecord[] = [];
      for (const month of d3.range(ctx.n)) {
        const principal = ctx.price - equity;
        const interestPayment = (ctx.interestRate / 12) * principal;
        const pmiPayment = equity < ctx.pmiEquityPct * ctx.price ? ctx.pmi : 0;
        equity += monthlyPayment - interestPayment;
        schedule.push({
          month: month + 1,
          data: {
            interest: interestPayment,
            principal: monthlyPayment - interestPayment,
            pmi: pmiPayment,
            hoa: ctx.hoa,
            property_tax: ctx.propertyTax,
            homeowners_insurance: ctx.homeownersInsurance,
          },
        });
      }
      return schedule;
    };

const showAmountHints = (ctx: Context): void => {
  homeValueHintOutput.innerText = `(${fmt.format(ctx.homeValue)})`;
  downPaymentHintOutput.innerText = `(${fmt.format(ctx.downPayment)})`;
  interestRateHintOutput.innerText =
      `(${hundredthsPctFmt.format(ctx.interestRate)})`;
  pointValueHintOutput.innerText =
      `(${hundredthsPctFmt.format(ctx.pointValue)})`;
  pmiEquityPercentageHintOutput.innerText =
      `(${pctFmt.format(ctx.pmiEquityPct)})`;
  propertyTaxHintOutput.innerText = `(Effective ${
      fmt.format(ctx.propertyTax * 12 / ctx.homeValue * 1000)} / $1000; ${
      fmt.format(ctx.propertyTax)}/mo)`;
  residentialExemptionHintOutput.innerText =
      `(${fmt.format(ctx.residentialExemptionPerMonth)}/mo)`
  mortgageTermHintOutput.innerText = `(${ctx.mortgageTerm} yrs)`;
};

const bisectMonth =
    (data: readonly PaymentRecord[], x: d3.ScaleLinear<number, number>,
     mouseX: number): PaymentRecord => {
      const month = x.invert(mouseX);
      const index =
          d3.bisector((d: PaymentRecord) => d.month).left(data, month, 1);
      const a = data[index - 1]!;
      const b = data[index];
      return b && month - a.month > b.month - month ? b : a;
    };

const buildPaymentScheduleChart =
    (schedule: readonly PaymentRecord[], keys: readonly PaymentType[]):
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
              .data(d3.stack<unknown, PaymentRecord, PaymentType>()
                        .keys(keys)
                        .order(d3.stackOrderNone)
                        .offset(d3.stackOffsetNone)
                        .value((d, key) => d.data[key])(schedule))
              .join('path')
              .style('fill', d => fieldColor(d.key))
              .attr(
                  'd',
                  d3.area<d3.SeriesPoint<PaymentRecord>>()
                      .x(d => x(d.data.month))
                      .y0(d => y(d['0']))
                      .y1(d => y(d['1'])),
              );

          makeTooltip(svg, schedule, keys, x, (mouseY, datum) => {
            const yTarget = y.invert(mouseY);
            let cumulative = 0;
            for (const [idx, key] of keys.entries()) {
              if (cumulative + datum.data[key] >= yTarget) {
                return idx;
              }
              cumulative += datum.data[key];
            }
            return keys.length - 1;
          });

          makeLegend(svg, width, d => fieldColor(d), keys);
        };

const buildCumulativeChart =
    (data: readonly PaymentRecord[], keys: readonly PaymentType[]): void => {
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

      const area = d3.area<{month: number, value: number}>()
                       .curve(d3.curveMonotoneX)
                       .x(d => x(d.month))
                       .y0(y(0))
                       .y1(d => y(d.value));

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
        const sorted = keys.map(key => ({key, value: datum.data[key]}))
                           .sort((a, b) => a.value - b.value);
        const elt = sorted.find(
            (elt, idx, arr) => yTarget <= elt.value &&
                (idx === arr.length - 1 || arr[idx + 1]!.value >= yTarget),
            ) ??
            sorted[sorted.length - 1]!;
        return keys.indexOf(elt.key);
      });

      makeLegend(svg, width, d => transparent(fieldColor(d)), keys);
    };

const transparent = (color: string): string => `${color}aa`;

const formatMonthNum = (m: number): string =>
    (m >= 12 ? `${Math.floor(m / 12)}y ` : '') + `${m % 12}mo`;

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

const makeAxes =
    (svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
     data: readonly PaymentRecord[], keys: readonly PaymentType[],
     width: number, height: number, margin: Margin, yLabel: string,
     yDomainFn: (ys: number[]) => number): {
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
          .text('Month');

      const y =
          d3.scaleLinear()
              .domain([
                0,
                d3.max(data, d => yDomainFn(keys.map(k => d.data[k])) * 1.25)!,
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
          .text(yLabel);

      return {x, y};
    };

const makeTooltip =
    (svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
     data: readonly PaymentRecord[], keys: readonly PaymentType[],
     x: d3.ScaleLinear<number, number, never>,
     identifyPaymentType: (yCoord: number, d: PaymentRecord) =>
         number): void => {
      const tooltip = svg.append('g');

      svg.on('touchmove mousemove', function(event) {
        // eslint-disable-next-line no-invalid-this
        const pointer = d3.pointer(event, this);
        const datum = bisectMonth(data, x, pointer[0]);
        const paymentTypeIdx = identifyPaymentType(pointer[1], datum);

        const value =
            keys.map(
                    k => `${fieldDisplay(k)}: ${fmt.format(datum.data[k])}` +
                        '\n')
                .join('') +
            `Month: ${formatMonthNum(datum.month)}`;
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
          .attr('dominant-baseline', 'hanging');
    };

const clearMonthlyPaymentOutputs = (): void => {
  principalAndInterestOutput.innerText = '';
  monthlyPaymentAmountOutput.innerText = '';
  monthlyPaymentPmiOutput.innerText = '';
  lifetimePaymentOutput.innerText = '';

  debtToIncomeOutput.innerText = '';
  document.getElementById('debt-to-income-ratio-div')!.style.display = 'none';

  document.querySelector('#schedule_viz > svg:first-of-type')?.remove();
  document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
};

// Reads fields from the URL and from cookies, and populates the UI accordingly.
const initFields = (): void => {
  const url = new URL(location.href);
  let hasValue = false;
  for (const [elt, {name}] of urlParamMap.entries()) {
    switch (elt.type) {
      case 'text':
        const value = url.searchParams.get(name);
        hasValue = hasValue || value !== null;
        if (value !== null) {
          elt.value = decodeURIComponent(value);
        }
        break;
      case 'checkbox':
        const checked = url.searchParams.has(name);
        hasValue = hasValue || checked;
        if (checked) {
          elt.checked = checked;
        }
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
        if (savedCookie !== undefined) {
          elt.value = savedCookie ? savedCookie.value! : '';
        }
        break;
      case 'checkbox':
        const checked = !!savedCookie;
        hasValue = hasValue || checked;
        if (!!savedCookie) {
          elt.checked = checked;
        }
        break;
      default:
        throw new Error('unreachable');
    }
  }
  if (hasValue) {
    const ctx = new Context();
    showAmountHints(ctx);
    setContents(ctx);
  }
};

// Saves fields to the URL and cookies.
const saveFields = (changed?: HTMLInputElement): void => {
  const url = new URL(location.href);
  let urlChanged = false;
  if (changed) {
    if (urlParamMap.has(changed)) {
      urlChanged =
          urlChanged || updateURLParam(url, changed, urlParamMap.get(changed)!);
    }
    if (cookieValueMap.has(changed))
      updateCookie(changed, cookieValueMap.get(changed)!);
  } else {
    for (const [elt, entry] of urlParamMap.entries()) {
      urlChanged = urlChanged || updateURLParam(url, elt, entry);
    }
    for (const [elt, entry] of cookieValueMap.entries()) {
      updateCookie(elt, entry);
    }
  }
  if (urlChanged) history.pushState({}, '', url.toString());
};

const updateURLParam =
    (url: URL, elt: HTMLInputElement, entry: InputEntry): boolean => {
      if (entry.deprecated) return false;
      let value;
      let hasValue;
      switch (elt.type) {
        case 'text':
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
      let result;
      if (hasValue) {
        result = !url.searchParams.has(entry.name) ||
            url.searchParams.get(entry.name) !== value;
        url.searchParams.set(entry.name, value);
      } else {
        result = url.searchParams.has(entry.name);
        deleteParam(url, entry.name);
      }
      return result;
    };

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
        document.cookie =
            `${entry.name}=${encodeURIComponent(value)};${COOKIE_SUFFIX}`;
      } else {
        deleteCookie(entry.name);
      }
    }

// Clears out deprecated URL params and cookies.
const clearDeprecatedStorage = () => {
  const url = new URL(location.href);
  for (const {name, deprecated} of urlParamMap.values()) {
    if (deprecated) {
      deleteParam(url, name);
    }
  }
  history.pushState({}, '', url.toString());

  for (const {name, deprecated} of cookieValueMap.values()) {
    if (deprecated) {
      deleteCookie(name);
    }
  }
};

const deleteParam = (url: URL, name: string) => {
  url.searchParams.delete(name);
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=0;${COOKIE_SUFFIX_DELETE}`;
};

// Returns an array where the ith element is an object with the amount paid of
// each type before (and excluding) the ith month.
const cumulativeSumByFields =
    (data: readonly PaymentRecord[],
     fields: readonly PaymentType[]): PaymentRecord[] => {
      const results = new Array<PaymentRecord>(data.length + 1);
      results[0] = {month: 0, data: {} as Record<PaymentType, number>};
      for (const k of fields) {
        results[0].data[k] = 0;
      }
      for (const [idx, datum] of data.entries()) {
        const newData = {} as Record<PaymentType, number>;
        for (const field of fields) {
          newData[field] = data[idx]!.data[field] + results[idx]!.data[field];
        }
        results[idx + 1] = {
          data: newData,
          month: datum.month,
        };
      }
      return results;
    };

const countSatisfying = <T,>(data: readonly T[], predicate: (t: T) => boolean): number => {
    let count = 0;
    for (const t of data) {
      if (predicate(t)) {
        ++count;
      }
    }
    return count;
  };

const countBurndownMonths =
    (ctx: Context, schedule: readonly PaymentRecord[]): number => {
      let assets = ctx.totalAssets;
      if (!ctx.alreadyClosed) {
        assets -= ctx.downPayment + ctx.closingCost;
      }
      for (const [i, record] of schedule.entries()) {
        if (i < ctx.paymentsAlreadyMade) {
          continue;
        }
        const data = record.data;
        const due = d3.sum(keys.map(k => data[k])) + ctx.monthlyDebt;
        if (due >= assets) return i;
        assets -= due;
      }
      return schedule.length;
    };

initFields();
// To support URL param / cookie deprecations cleanly, we write out the UI
// fields immediately after populating them. This "upgrades" fields that have
// been moved from URL params to cookies (or vice versa).
saveFields();
clearDeprecatedStorage();
attachListeners();
console_prompt();
})();
