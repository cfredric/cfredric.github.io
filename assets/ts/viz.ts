import * as d3 from 'd3';

import {Context} from './context';
import {ExpandableElement} from './expandable_element';
import {Formatter} from './formatter';
import {Num} from './num';
import {Schedules} from './schedules';
import {loanPaymentTypes, Margin, NumericRecord, NumericRecordWithMonth, PaymentRecordWithMonth, PaymentType, paymentTypes, paymentTypesWithInitial, PaymentTypeWithInitial} from './types';
import * as utils from './utils';

const textColor = '#f0e7d5';

function fieldColor(input: PaymentTypeWithInitial): string {
  switch (input) {
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
    case 'initial':
      return '#17c3b2';
  }
}

/**
 * Given the X axis and an X mouse coordinate, finds the month that is being
 * hovered over.
 */
function bisectMonth<KeyType extends string>(
    data: readonly NumericRecordWithMonth<KeyType>[],
    x: d3.ScaleLinear<number, number>,
    mouseX: number): NumericRecordWithMonth<KeyType> {
  const month = x.invert(mouseX);
  const index = d3.bisector((d: NumericRecordWithMonth<KeyType>) => d.month)
                    .left(data, month, 1);
  const a = data[index - 1]!;
  const b = data[index];
  return b && month - a.month > b.month - month ? b : a;
}

function clearCharts() {
  document.querySelector('#schedule_viz > svg:first-of-type')?.remove();
  clearCumulativeCharts();
}

function clearCumulativeCharts() {
  document.querySelector('#cumulative_loan_viz > svg:first-of-type')?.remove();
  document.querySelector('#cumulative_viz > svg:first-of-type')?.remove();
}

function clearTables() {
  utils.removeChildren(utils.getHtmlEltWithId('schedule_tab'));
  utils.removeChildren(utils.getHtmlEltWithId('cumulative_tab'));
  utils.removeChildren(utils.getHtmlEltWithId('tax_year_tab'));
}

/** Builds the chart of monthly payments over time. */
function buildPaymentScheduleChart(
    ctx: Context,
    schedule: readonly PaymentRecordWithMonth[],
    fmt: Formatter,
    keys: readonly PaymentType[],
    ): void {
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
  addStackChart(svg, schedule, keys, x, y);

  if (ctx.paymentsAlreadyMade > 0) {
    addCurrentMonthLine(ctx, svg, x, y);
  }

  makeTooltip(
      ctx, svg, schedule, keys, x, y, fmt, makeStackTooltipIndentifier(keys));

  makeLegend(svg, width, fieldColor, keys);
}

/** Builds the chart of cumulative loan payments over time. */
function buildCumulativeLoanChart(
    ctx: Context, data: readonly PaymentRecordWithMonth[], fmt: Formatter,
    keys: readonly PaymentType[]): void {
  const margin = {top: 50, right: 100, bottom: 120, left: 100};
  const width = 900 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const svg = makeSvg('cumulative_loan_viz', width, height, margin);

  const {x, y} = makeAxes(
      svg,
      data,
      keys,
      width,
      height,
      margin,
      'Cumulative Loan Payments',
      d3.max,
  );

  const area = d3.area<{month: number, value: Num}>()
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

  if (ctx.paymentsAlreadyMade > 0) {
    addCurrentMonthLine(ctx, svg, x, y);
  }

  makeTooltip(ctx, svg, data, keys, x, y, fmt, (yTarget, datum) => {
    const elt = keys.map(key => ({key, value: datum[key]}))
                    .sort((a, b) => a.value.cmp(b.value))
                    .find((elt) => elt.value.gte(yTarget));

    return elt !== undefined ? keys.indexOf(elt.key) : undefined;
  });

  makeLegend(svg, width, d => transparent(fieldColor(d)), keys);
}

/** Builds the chart of cumulative loan payments over time. */
function buildCumulativeChart(
    ctx: Context, cumulatives: readonly PaymentRecordWithMonth[],
    fmt: Formatter): void {
  const margin = {top: 50, right: 100, bottom: 120, left: 100};
  const width = 900 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const svg = makeSvg('cumulative_viz', width, height, margin);

  const data =
      cumulatives.map((rec) => ({
                        month: rec.month,
                        data: {'initial': ctx.purchasePayment, ...rec.data},
                      }));
  const keys = paymentTypesWithInitial;

  const {x, y} = makeAxes(
      svg,
      data,
      keys,
      width,
      height,
      margin,
      'Cumulative Moneys Paid',
      d3.sum,
  );

  addStackChart(svg, data, keys, x, y);

  if (ctx.paymentsAlreadyMade > 0) {
    addCurrentMonthLine(ctx, svg, x, y);
  }

  makeTooltip(
      ctx, svg, data, keys, x, y, fmt, makeStackTooltipIndentifier(keys));

  makeLegend(svg, width, d => transparent(fieldColor(d)), keys);
}

/** Adds an alpha channel to a hex color string to make it translucent. */
function transparent(color: string): string {
  return `${color}aa`;
}

/** Creates a figure. */
function makeSvg(divId: string, width: number, height: number, margin: Margin):
    d3.Selection<SVGGElement, unknown, HTMLElement, unknown> {
  d3.select(`#${divId}`).select('svg').remove();
  return d3.select(`#${divId}`)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
}

/** Creates axes for the given figure. */
function makeAxes<KeyType extends string>(
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
    data: readonly NumericRecordWithMonth<KeyType>[], keys: readonly KeyType[],
    width: number, height: number, margin: Margin, yLabel: string,
    yDomainFn: (ys: readonly number[]) => number): {
  x: d3.ScaleLinear<number, number, never>,
  y: d3.ScaleLinear<number, number, never>,
} {
  // Add X axis
  const ext = d3.extent(data, d => d.month) as [number, number];
  const x = d3.scaleLinear().domain(ext).range([0, width]);
  d3.axisBottom(x).tickValues(d3.range(0, data.length, 12))(
      svg.append('g').attr('transform', `translate(0, ${height})`));

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
                d => yDomainFn(keys.map(k => d.data[k].toNumber())) * 1.25)!,
          ])
          .range([height, 0]);
  d3.axisLeft(y)(svg.append('g'));

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
}

function addStackChart<KeyType extends PaymentTypeWithInitial>(
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
    data: readonly NumericRecordWithMonth<KeyType>[], keys: readonly KeyType[],
    x: d3.ScaleLinear<number, number, never>,
    y: d3.ScaleLinear<number, number, never>) {
  svg.append('g')
      .selectAll('path')
      .data(d3.stack<unknown, NumericRecordWithMonth<KeyType>, KeyType>()
                .keys(keys)
                .value((d, key) => d.data[key].toNumber())(data))
      .join('path')
      .style('fill', d => fieldColor(d.key))
      .attr(
          'd',
          d3.area<d3.SeriesPoint<NumericRecordWithMonth<KeyType>>>()
              .x(d => x(d.data.month))
              .y0(d => y(d['0']))
              .y1(d => y(d['1'])));
}

function addCurrentMonthLine(
    ctx: Context, svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
    x: d3.ScaleLinear<number, number, never>,
    y: d3.ScaleLinear<number, number, never>) {
  svg.append('line')
      .attr('x1', x(ctx.paymentsAlreadyMade))
      .attr('x2', x(ctx.paymentsAlreadyMade))
      .attr('y1', y(0))
      .attr('y2', 0)
      .style('stroke', '#ff0000');
}

function makeStackTooltipIndentifier<KeyType extends PaymentTypeWithInitial>(
    keys: readonly KeyType[]):
    (yCoord: number, datum: NumericRecord<KeyType>) => number | undefined {
  return (yTarget, datum) => {
    let sum: Num = Num.literal(0);
    for (const [idx, key] of keys.entries()) {
      if (sum.add(datum[key]).gte(yTarget)) return idx;
      sum = sum.add(datum[key]);
    }
    return undefined;
  };
}

/** Creates a tooltip for the given figure. */
function makeTooltip<KeyType extends PaymentTypeWithInitial>(
    ctx: Context, svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
    data: readonly NumericRecordWithMonth<KeyType>[], keys: readonly KeyType[],
    x: d3.ScaleLinear<number, number, never>,
    y: d3.ScaleLinear<number, number, never>, fmt: Formatter,
    identifyPaymentType: (yCoord: number, d: NumericRecord<KeyType>) =>
        number | undefined): void {
  const hoverLine =
      svg.append('line').style('stroke', '#fff').attr('y1', 0).attr('y2', y(0));
  const tooltip = svg.append('g');

  svg.on('touchmove mousemove', (event) => {
    const pointer = d3.pointer(event);
    const datum = bisectMonth(data, x, pointer[0]);
    const paymentTypeIdx =
        identifyPaymentType(y.invert(pointer[1]), datum.data);

    if (paymentTypeIdx !== undefined) {
      hoverLine.style('display', null)
          .attr('x1', pointer[0])
          .attr('x2', pointer[0]);

      const text = keys.map(
                           k => `${utils.toCapitalized(k)}: ${
                                    fmt.formatCurrency(datum.data[k])}` +
                               '\n')
                       .join('') +
          `Month: ${fmt.formatMonthNum(datum.month, ctx.closingDate)}`;
      showHoverCard(
          tooltip.attr(
              'transform', `translate(${x(datum.month)},${pointer[1]})`),
          text, paymentTypeIdx);
    }
  });

  svg.on('touchend mouseleave', () => {
    hoverLine.style('display', 'none');
    tooltip.style('display', 'none');
  });
}

function showHoverCard(
    g: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>, text: string,
    paymentTypeIdx: number) {
  g.style('display', null)
      .style('pointer-events', 'none')
      .style('font', '12px sans-serif');

  const path = g.selectAll('path')
                   .data([null])
                   .join('path')
                   .attr('fill', 'white')
                   .attr('stroke', 'black');

  const textSelection = g.selectAll('text').data([null]).join('text');
  textSelection.selectAll('tspan')
      .data(text.split(/\n/))
      .join('tspan')
      .attr('x', 0)
      .attr('y', (_, i) => `${i * 1.1}em`)
      .style('font-weight', (_, i) => i === paymentTypeIdx ? 'bold' : null)
      .text(d => d);

  const {y, width: w, height: h} =
      (textSelection.node() as SVGGElement).getBBox();

  textSelection.attr('transform', `translate(${- w / 2},${15 - y})`);
  path.attr(
      'd',
      `M${- w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`,
  );
}

/**
 * Creates a legend for the given figure, with the given payment types and
 * corresponding colors.
 */
function makeLegend<KeyType extends PaymentTypeWithInitial>(
    svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
    width: number, color: (d: KeyType) => string,
    keys: readonly KeyType[]): void {
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
      .text(utils.toCapitalized)
      .attr('x', 18)
      .attr('y', (_, i) => i * 18)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'hanging')
      .attr('fill', textColor);
}

export function setChartsAndButtonsContent(
    ctx: Context, fmt: Formatter, schedules: Schedules|undefined): void {
  clearTables();

  if (!schedules) {
    clearCharts();
    return;
  }

  buildPaymentScheduleChart(ctx, schedules.pointwise(), fmt, paymentTypes);
  if (ctx.m.eq(0)) {
    clearCumulativeCharts();
    return;
  }

  buildCumulativeLoanChart(ctx, schedules.cumulative(), fmt, loanPaymentTypes);

  buildCumulativeChart(ctx, schedules.cumulative(), fmt);

  new ExpandableElement(
      utils.getHtmlEltWithId('schedule_tab'), 'Monthly payment table',
      () => utils.makeMonthlyTable(
          ctx, fmt, paymentTypes, schedules.pointwise()));
  new ExpandableElement(
      utils.getHtmlEltWithId('cumulative_tab'), 'Cumulative payments table',
      () => utils.makeMonthlyTable(
          ctx, fmt, loanPaymentTypes, schedules.cumulative()));

  if (ctx.closingDate) {
    const closingDate = ctx.closingDate;
    new ExpandableElement(
        utils.getHtmlEltWithId('tax_year_tab'), 'Moneys Paid by Tax Year',
        () => {
          const columnValueTypes = ['interest', 'property_tax'] as const;
          return utils.makeYearlyTable(
              closingDate, columnValueTypes, schedules.pointwise(),
              (year, payments) => {
                const sums: Record<typeof columnValueTypes[number], Num> = {
                  'interest': Num.literal(0),
                  'property_tax': Num.literal(0),
                };
                for (const payment of payments) {
                  for (const k of columnValueTypes) {
                    sums[k] = sums[k].add(payment.data[k]);
                  }
                }
                return [
                  year.toString(),
                  ...columnValueTypes.map(k => fmt.formatCurrency(sums[k])),
                  fmt.formatCurrency(
                      Num.sum(...columnValueTypes.map(k => sums[k]))),
                ];
              });
        });
  }
}
