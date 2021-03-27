import d3 = require('d3');

(function() {
const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const pctFmt = new Intl.NumberFormat('en-US', {
  style: 'percent',
});
const orZero = (elt: HTMLInputElement): number => {
  const num = Number.parseFloat(elt.value);
  return Number.isNaN(num) ? 0 : num;
};
const clamp = (x: number, {min, max}: {min: number, max: number}): number =>
    Math.max(min, Math.min(max, x));

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
const debtToIncomeOutput =
    document.getElementById('debt-to-income-ratio-output')!;

const keys = [
  'principal',
  'interest',
  'hoa',
  'property_tax',
  'homeowners_insurance',
  'pmi',
] as const;
type PaymentType = typeof keys[number];

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

const urlParamMap = new Map<string, HTMLInputElement>([
  ['price', priceInput],
  ['home_value', homeValueInput],
  ['hoa', hoaInput],
  ['down_payment', downPaymentPercentageInput],
  ['down_payment_amt', downPaymentAbsoluteInput],
  ['interest_rate', interestRateInput],
  ['mortgage_insurance', mortgageInsuranceInput],
  ['pmi_equity_pct', pmiEquityPercentageInput],
  ['property_tax', propertyTaxAbsoluteInput],
  ['property_tax_pct', propertyTaxPercentageInput],
  ['resi_savings', residentialExemptionSavingsInput],
  ['resi_deduction', residentialExemptionDeductionInput],
  ['hoi', homeownersInsuranceInput],
  ['closing_cost', closingCostInput],
  ['mortgage-term', mortgageTermInput],
  ['annual-income', annualIncomeInput],
  ['monthly-debt', monthlyDebtInput],
]);

const attachListeners = (): void => {
  const onChange = () => {
    const ctx = new Context();
    showAmountHints(ctx);
    updateUrl();
    setContents(ctx);
  };
  for (const elt of urlParamMap.values()) {
    elt.addEventListener('change', () => onChange());
    elt.addEventListener('input', () => onChange());
  }
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
  readonly pmi: number;
  readonly pmiEquityPct: number;
  readonly propertyTax: number;
  readonly residentialExemptionPerMonth: number;
  readonly homeownersInsurance: number;
  readonly closingCost: number;
  readonly mortgageTerm: number;
  readonly annualIncome: number;
  readonly monthlyDebt: number;

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
    this.pmi = this.downPaymentPct >= 0.2 ?
        0 :
        Math.max(0, orZero(mortgageInsuranceInput));
    this.pmiEquityPct =
        clamp(orZero(pmiEquityPercentageInput), {min: 0, max: 100}) / 100 ||
        0.22;
    this.propertyTax = ((): number => {
      const rawMonthlyAbsolute = Math.max(0, orZero(propertyTaxAbsoluteInput));
      const rawAnnualRate =
          clamp(orZero(propertyTaxPercentageInput), {min: 0, max: 100}) / 100;
      const savings =
          Math.max(0, orZero(residentialExemptionSavingsInput) / 12);
      const deduction = clamp(
          orZero(residentialExemptionDeductionInput),
          {min: 0, max: this.price});

      if (rawMonthlyAbsolute) {
        if (savings) return rawMonthlyAbsolute - savings;
        if (deduction) {
          // We assume that the monthly absolute does not include the deduction.
          const annualRate = rawMonthlyAbsolute * 12 / this.homeValue;
          return annualRate * (this.homeValue - deduction) / 12;
        }
        return rawMonthlyAbsolute;
      }
      if (savings) {
        const monthlyAbsolute = rawAnnualRate * this.homeValue / 12;
        return monthlyAbsolute - savings;
      }
      return rawAnnualRate * (this.homeValue - deduction) / 12;
    })();
    this.residentialExemptionPerMonth = ((): number => {
      const savings =
          Math.max(0, orZero(residentialExemptionSavingsInput) / 12);
      if (savings) return savings;

      const deduction = clamp(
          orZero(residentialExemptionDeductionInput),
          {min: 0, max: this.price});

      if (!deduction) return deduction;

      const rawMonthlyAbsolute = Math.max(0, orZero(propertyTaxAbsoluteInput));
      if (rawMonthlyAbsolute) {
        const annualRate = rawMonthlyAbsolute * 12 / this.homeValue;
        return annualRate * deduction / 12;
      }

      const rawAnnualRate =
          clamp(orZero(propertyTaxPercentageInput), {min: 0, max: 100}) / 100;
      return rawAnnualRate * deduction / 12;
    })();
    this.homeownersInsurance = Math.max(0, orZero(homeownersInsuranceInput));
    this.closingCost = Math.max(0, orZero(closingCostInput));
    // Assume a 30 year fixed loan.
    this.mortgageTerm = Math.max(0, orZero(mortgageTermInput)) || 30;
    this.annualIncome = Math.max(0, orZero(annualIncomeInput));
    this.monthlyDebt = Math.max(0, orZero(monthlyDebtInput));

    // For convenience.
    this.n = 12 * this.mortgageTerm;
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
    buildPaymentScheduleChart(schedule, keys);
    const pmiMonths =
        countSatisfying(schedule, payment => payment.data.pmi !== 0);
    pmiPaymentTimelineOutput.innerText = `${formatMonthNum(pmiMonths)} (${
        fmt.format(pmiMonths * ctx.pmi)} total)`;
    if (M) {
      const cumulativePaymentTypes: PaymentType[] =
          ['principal', 'interest', 'pmi'];
      buildCumulativeChart(
          cumulativeSumByFields(schedule, cumulativePaymentTypes),
          cumulativePaymentTypes);
      lifetimePaymentOutput.innerText =
          `${fmt.format(ctx.n * M + d3.sum(schedule, (d) => d.data.pmi))}`;
    } else {
      document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
      lifetimePaymentOutput.innerText = `${fmt.format(0)}`;
    }

    if (ctx.annualIncome) {
      debtToIncomeOutput.innerText = `${
          pctFmt.format(
              (ctx.monthlyDebt + M + extras + ctx.pmi) / ctx.annualIncome *
              12)}`;
      document.getElementById('debt-to-income-ratio-div')!.style.display = '';
    } else {
      debtToIncomeOutput.innerText = '';
      document.getElementById('debt-to-income-ratio-div')!.style.display =
          'none';
    }
  } else {
    clearMonthlyPaymentOutputs();
  }

  purchasePaymentOutput.innerText = `${
      fmt.format(
          ctx.downPayment + ctx.closingCost,
          )}`;
};

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
              .style('fill', (d) => fieldColor(d.key))
              .attr(
                  'd',
                  d3.area<d3.SeriesPoint<PaymentRecord>>()
                      .x((d) => x(d.data.month))
                      .y0((d) => y(d['0']))
                      .y1((d) => y(d['1'])),
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

          makeLegend(svg, width, (d) => fieldColor(d), keys);
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
                       .x((d) => x(d.month))
                       .y0(y(0))
                       .y1((d) => y(d.value));

      svg.selectAll('.area')
          .data(keys.map((key) => ({
                           key,
                           values: data.map((datum) => ({
                                              month: datum.month,
                                              value: datum.data[key],
                                            })),
                         })))
          .enter()
          .append('g')
          .attr('class', (d) => `area ${d.key}`)
          .append('path')
          .attr('d', (d) => area(d.values))
          .style('fill', (d) => transparent(fieldColor(d.key)));

      makeTooltip(svg, data, keys, x, (mouseY, datum) => {
        const yTarget = y.invert(mouseY);
        const sorted = keys.map((key) => ({key, value: datum.data[key]}))
                           .sort((a, b) => a.value - b.value);
        const elt = sorted.find(
            (elt, idx, arr) => yTarget <= elt.value &&
                (idx === arr.length - 1 || arr[idx + 1]!.value >= yTarget),
            ) ??
            sorted[sorted.length - 1]!;
        return keys.indexOf(elt.key);
      });

      makeLegend(svg, width, (d) => transparent(fieldColor(d)), keys);
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
      const ext = d3.extent(data, (d) => d.month) as [number, number];
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
                d3.max(
                    data, (d) => yDomainFn(keys.map((k) => d.data[k])) * 1.25)!,
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
                    (k) => `${fieldDisplay(k)}: ${fmt.format(datum.data[k])}` +
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
                (text) =>
                    text.selectAll('tspan')
                        .data((value + '').split(/\n/))
                        .join('tspan')
                        .attr('x', 0)
                        .attr('y', (_, i) => `${i * 1.1}em`)
                        .style(
                            'font-weight',
                            (_, i) => i === paymentTypeIdx ? 'bold' : null,
                            )
                        .text((d) => d),
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
          .text((d) => fieldDisplay(d))
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

const initFieldsFromUrl = (): void => {
  const url = new URL(location.href);
  let hasValue = false;
  for (const [name, elt] of urlParamMap.entries()) {
    const value = url.searchParams.get(name);
    elt.value = value ?? '';
    hasValue = hasValue || value !== null;
  }
  if (hasValue) {
    const ctx = new Context();
    showAmountHints(ctx);
    setContents(ctx);
  }
};

const updateUrl = (): void => {
  const url = new URL(location.href);
  for (const [name, elt] of urlParamMap.entries()) {
    if (elt.value === '') {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, elt.value);
    }
  }
  history.pushState({}, '', url.toString());
};

const cumulativeSumByFields =
    (data: PaymentRecord[], fields: PaymentType[]): PaymentRecord[] => {
      const results = new Array<PaymentRecord>(data.length);
      const carriedValue = (idx: number, key: PaymentType) => {
        if (!fields.includes(key)) return data[idx]!.data[key];
        if (idx === 0) return 0;
        return results[idx - 1]!.data[key] + data[idx]!.data[key];
      };
      for (const [idx, datum] of data.entries()) {
        results[idx] = {
          month: datum.month,
          data: {} as Record<PaymentType, number>
        };
        for (const field of fields) {
          results[idx]!.data[field] = carriedValue(idx, field);
        }
      }
      return results;
    };

const countSatisfying = <T,>(data: T[], predicate: (t: T) => boolean): number => {
    let count = 0;
    for (const t of data) {
      if (predicate(t)) {
        ++count;
      }
    }
    return count;
  };

initFieldsFromUrl();
attachListeners();
})();
