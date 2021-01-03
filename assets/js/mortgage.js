'use strict';

(function() {
const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const get = (elt) => Number.parseFloat(elt.value);
const orZero = (num) => (Number.isNaN(num) ? 0 : num);

const priceInput = document.getElementById('price-input');
const homeValueInput = document.getElementById('home-value-input');
const homeValueHintOutput = document.getElementById('home-value-hint');
const hoaInput = document.getElementById('hoa-input');
const downPaymentInput = document.getElementById('down-payment-input');
const interestRateInput = document.getElementById('interest-rate-input');
const mortgageInsuranceInput = document.getElementById(
    'mortgage-insurance-input',
);
const propertyTaxAbsoluteInput =
    document.getElementById('property-tax-absolute-input');
const propertyTaxPercentageInput =
    document.getElementById('property-tax-percentage-input');
const propertyTaxHintOutput =
    document.getElementById('property-tax-percentage-hint');
const homeownersInsuranceInput = document.getElementById(
    'homeowners-insurance-input',
);
const closingCostInput = document.getElementById('closing-cost-input');

const downPaymentHintOutput = document.getElementById('down-payment-hint');
const loanAmountOutput = document.getElementById('loan-amount-output');
const monthlyPaymentAmountOutput = document.getElementById(
    'monthly-payment-output',
);
const monthlyPaymentPmiOutput = document.getElementById(
    'monthly-payment-pmi-output',
);
const lifetimePaymentOutput = document.getElementById(
    'lifetime-payment-output',
);
const purchasePaymentOutput = document.getElementById(
    'purchase-payment-output',
);

const keys = [
  'principal',
  'interest',
  'hoa',
  'property_tax',
  'homeowners_insurance',
  'pmi',
];
const fields = {
  principal: {
    display: 'Principal',
    color: '#1f77b4',
  },
  interest: {
    display: 'Interest',
    color: '#ff7f0e',
  },
  hoa: {
    display: 'HOA',
    color: '#bcbd22',
  },
  property_tax: {
    display: 'Property Tax',
    color: '#17becf',
  },
  homeowners_insurance: {
    display: 'Homeowner\'s Insurance',
    color: '#9467bd',
  },
  pmi: {
    display: 'PMI',
    color: '#7f7f7f',
  },
};

const attachListeners = () => {
  const onChange = () => {
    showAmountHints();
    updateUrl();
    setContents();
  };
  for (const elt
           of [priceInput,
               homeValueInput,
               hoaInput,
               downPaymentInput,
               interestRateInput,
               mortgageInsuranceInput,
               propertyTaxAbsoluteInput,
               propertyTaxPercentageInput,
               homeownersInsuranceInput,
               closingCostInput,
  ]) {
    elt.addEventListener('change', () => onChange());
    elt.addEventListener('input', () => onChange());
  }
};

// Assume a 30 year fixed loan.
const years = 30;

// Value getters.
const price = () => orZero(get(priceInput));
const hoa = () => orZero(get(hoaInput));
const downPaymentPct = () => orZero(get(downPaymentInput) / 100);
const interestRate = () => orZero(get(interestRateInput) / 100);
const pmi = () => orZero(get(mortgageInsuranceInput));
const homeValue = () => orZero(get(homeValueInput)) || price();
const propertyTax = () => orZero(get(propertyTaxAbsoluteInput)) ||
    (orZero(get(propertyTaxPercentageInput) / 100) * homeValue() / 12);
const homeownersInsurance = () => orZero(get(homeownersInsuranceInput));
const closingCost = () => orZero(get(closingCostInput));

// For convenience.
const n = 12 * years;
const downPayment = () => price() * downPaymentPct();

const setContents = () => {
  loanAmountOutput.innerText = `${fmt.format(price() - downPayment())}`;
  const M = monthlyFormula(
      price() * (1 - downPaymentPct()),
      interestRate() / 12,
      n,
  );
  const extras = hoa() + propertyTax() + homeownersInsurance();

  monthlyPaymentAmountOutput.innerText = `${fmt.format(M + extras)}`;
  monthlyPaymentPmiOutput.innerText = `${fmt.format(M + extras + pmi())}`;
  const showPmi = pmi() && downPaymentPct() < 0.2;
  document
      .querySelector(
          '#monthly-payment-without-pmi-span',
          )
      .style.display = showPmi ? '' : 'none';
  document.querySelector('#monthly-payment-pmi-div').style.display =
      showPmi ? '' : 'none';

  if (interestRate()) {
    const {
      sum: amortizedSum,
      schedule,
      cumulative,
    } = calculatePaymentSchedule(M);
    buildPaymentScheduleChart(schedule);
    buildCumulativeChart(cumulative);
    lifetimePaymentOutput.innerText = `${fmt.format(amortizedSum)}`;
  }

  purchasePaymentOutput.innerText = `${
      fmt.format(
          downPayment() + closingCost(),
          )}`;
};

const monthlyFormula = (P, r, n) => {
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

const calculatePaymentSchedule = (monthlyPayment) => {
  let equity = downPayment();
  const schedule = [];
  for (const month of d3.range(n)) {
    const principal = price() - equity;
    const interestPayment = (interestRate() / 12) * principal;
    const pmiPayment = equity < 0.2 * price() ? pmi() : 0;
    equity += monthlyPayment - interestPayment;
    schedule.push({
      month: month + 1,
      interest: interestPayment,
      principal: monthlyPayment - interestPayment,
      principal_balance: price() - equity,
      pmi: pmiPayment,
      hoa: hoa(),
      property_tax: propertyTax(),
      homeowners_insurance: homeownersInsurance(),
    });
  }
  return {
    sum: n * monthlyPayment + d3.sum(schedule, (d) => d.pmi),
    schedule,
    cumulative: cumulativeSumByFields(schedule, new Set(keys)),
  };
};

const showAmountHints = () => {
  homeValueHintOutput.innerText = `(${fmt.format(homeValue())})`;
  downPaymentHintOutput.innerText = `(${fmt.format(downPayment())})`;
  propertyTaxHintOutput.innerText = `(${fmt.format(propertyTax())} /mo)`;
};

const bisectMonth = (data, x, mouseX) => {
  const bisect = d3.bisector((d) => d.month).left;
  const month = x.invert(mouseX);
  const index = bisect(data, month, 1);
  const a = data[index - 1];
  const b = data[index];
  return b && month - a.month > b.month - month ? b : a;
};

const buildPaymentScheduleChart = (schedule) => {
  // set the dimensions and margins of the graph
  const margin = {top: 50, right: 100, bottom: 120, left: 100};
  const width = 900 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const svg = makeSvg('schedule_viz', width, height, margin);

  const {x, y} = makeAxes(
      svg,
      schedule,
      width,
      height,
      margin,
      'Monthly Payment',
      d3.sum,
  );

  // Add the area
  svg.append('g')
      .selectAll('path')
      .data(d3.stack()
                .keys(keys)
                .order(d3.stackOrderNone)
                .offset(d3.stackOffsetNone)(schedule))
      .join('path')
      .style('fill', (d) => fields[d.key].color)
      .attr(
          'd',
          d3.area()
              .x((d) => x(d.data.month))
              .y0((d) => y(d[0]))
              .y1((d) => y(d[1])),
      );

  makeTooltip(svg, schedule, x, (mouseY, datum) => {
    const yTarget = y.invert(mouseY);
    let cumulative = 0;
    for (const [idx, key] of keys.entries()) {
      if (cumulative + datum[key] >= yTarget) {
        return idx;
      }
      cumulative += datum[key];
    }
    return keys.length - 1;
  });

  makeLegend(svg, width, (d) => fields[d].color);
};

const buildCumulativeChart = (data) => {
  const margin = {top: 50, right: 100, bottom: 120, left: 100};
  const width = 900 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const svg = makeSvg('cumulative_viz', width, height, margin);

  const {x, y} = makeAxes(
      svg,
      data,
      width,
      height,
      margin,
      'Cumulative Payment',
      d3.max,
  );

  const area = d3.area()
                   .curve(d3.curveMonotoneX)
                   .x((d) => x(d.month))
                   .y0(y(0))
                   .y1((d) => y(d.value));

  const sources = keys.map(
      (key) => ({
        key,
        values: data.map((datum) => ({month: datum.month, value: datum[key]})),
      }));

  svg.selectAll('.area')
      .data(sources)
      .enter()
      .append('g')
      .attr('class', (d) => `area ${d.key}`)
      .append('path')
      .attr('d', (d) => area(d.values))
      .style('fill', (d) => transparent(fields[d.key].color));

  makeTooltip(svg, data, x, (mouseY, datum) => {
    const yTarget = y.invert(mouseY);
    const sorted = keys.map((key) => ({key, value: datum[key]}))
                       .sort((a, b) => a.value - b.value);
    const elt =
        sorted.find(
            (elt, idx, arr) => yTarget <= elt.value &&
                (idx === arr.length - 1 || arr[idx + 1].value >= yTarget),
            ) ??
        sorted[sorted.length - 1];
    return keys.indexOf(elt.key);
  });

  makeLegend(svg, width, (d) => transparent(fields[d].color));
};

const transparent = (color) => `${color}aa`;

const formatMonthNum = (m) =>
    (m >= 12 ? `${Math.floor(m / 12)}y ` : '') + `${m % 12}mo`;

const makeSvg = (divId, width, height, margin) => {
  d3.select(`#${divId}`).select('svg').remove();
  return d3.select(`#${divId}`)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
};

const makeAxes = (svg, data, width, height, margin, yLabel, yDomainFn) => {
  // Add X axis
  const x = d3.scaleLinear().domain(d3.extent(data, (d) => d.month)).range([
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

  const y = d3.scaleLinear()
                .domain([
                  0,
                  d3.max(data, (d) => yDomainFn(keys.map((k) => d[k])) * 1.25),
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

const makeTooltip = (svg, data, x, identifyPaymentType) => {
  const tooltip = svg.append('g');

  svg.on('touchmove mousemove', function(event) {
    // eslint-disable-next-line no-invalid-this
    const pointer = d3.pointer(event, this);
    const datum = bisectMonth(data, x, pointer[0]);
    const paymentTypeIdx = identifyPaymentType(pointer[1], datum);

    const value =
        keys.map(
                (k) => `${fields[k].display}: ${fmt.format(datum[k])}` +
                    '\n')
            .join('') +
        `Month: ${formatMonthNum(datum.month)}`;
    tooltip.attr('transform', `translate(${x(datum.month)},${pointer[1]})`)
        .call(callout, value, paymentTypeIdx);
  });

  svg.on('touchend mouseleave', () => tooltip.call(callout, null, null));

  const callout = (g, value, paymentTypeIdx) => {
    if (!value) return g.style('display', 'none');

    g.style('display', null)
        .style('pointer-events', 'none')
        .style('font', '12px sans-serif');

    const path = g.selectAll('path')
                     .data([null])
                     .join('path')
                     .attr('fill', 'white')
                     .attr('stroke', 'black');

    const text = g.selectAll('text').data([null]).join('text').call(
        (text) => text.selectAll('tspan')
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

    const {y, width: w, height: h} = text.node().getBBox();

    text.attr('transform', `translate(${- w / 2},${15 - y})`);
    path.attr(
        'd',
        `M${- w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`,
    );
  };
};

const makeLegend = (svg, width, color) => {
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
      .text((d) => fields[d].display)
      .attr('x', 18)
      .attr('y', (_, i) => i * 18)
      .attr('text-anchor', 'start')
      .attr('alignment-baseline', 'hanging');
};

const initFieldsFromUrl = () => {
  const url = new URL(location.href);
  let hasValue = false;
  for (const [name, elt] of [
           ['price', priceInput],
           ['home_value', homeValueInput],
           ['hoa', hoaInput],
           ['down_payment', downPaymentInput],
           ['interest_rate', interestRateInput],
           ['mortgage_insurance', mortgageInsuranceInput],
           ['property_tax', propertyTaxAbsoluteInput],
           ['property_tax_pct', propertyTaxPercentageInput],
           ['hoi', homeownersInsuranceInput],
           ['closing_cost', closingCostInput],
  ]) {
    const value = url.searchParams.get(name);
    elt.value = value ?? '';
    hasValue = hasValue || value !== null;
  }
  if (hasValue) {
    showAmountHints();
    setContents();
  }
};

const updateUrl = () => {
  const url = new URL(location.href);
  for (const [name, elt] of [
           ['price', priceInput],
           ['home_value', homeValueInput],
           ['hoa', hoaInput],
           ['down_payment', downPaymentInput],
           ['interest_rate', interestRateInput],
           ['mortgage_insurance', mortgageInsuranceInput],
           ['property_tax', propertyTaxAbsoluteInput],
           ['property_tax_pct', propertyTaxPercentageInput],
           ['hoi', homeownersInsuranceInput],
           ['closing_cost', closingCostInput],
  ]) {
    if (elt.value === '') {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, elt.value);
    }
  }
  history.pushState({}, '', url);
};

const cumulativeSumByFields = (data, fields) => {
  const results = new Array(data.length);
  const carriedValue = (idx, key) => {
    if (!fields.has(key)) return data[idx][key];
    if (idx === 0) return 0;
    return results[idx - 1][key] + data[idx][key];
  };
  for (const [idx, datum] of data.entries()) {
    results[idx] = Object.keys(datum).reduce((acc, key) => {
      acc[key] = carriedValue(idx, key);
      return acc;
    }, {});
  }
  return results;
};

initFieldsFromUrl();
attachListeners();
})();
