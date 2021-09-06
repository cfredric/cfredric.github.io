import * as d3 from 'd3';
import Decimal from 'decimal.js';

import {Margin, PaymentRecord, PaymentRecordWithMonth, PaymentType} from './types';
import * as utils from './utils';

const textColor = '#f0e7d5';

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
export const buildPaymentScheduleChart = (
    schedule: readonly PaymentRecordWithMonth[],
    formatter: Intl.NumberFormat,
    keys: readonly PaymentType[],
    ): void => {
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

  makeTooltip(svg, schedule, keys, x, formatter, (mouseY, datum) => {
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
export const buildCumulativeChart =
    (data: readonly PaymentRecordWithMonth[], formatter: Intl.NumberFormat,
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

      makeTooltip(svg, data, keys, x, formatter, (mouseY, datum) => {
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
     x: d3.ScaleLinear<number, number, never>, formatter: Intl.NumberFormat,
     identifyPaymentType: (yCoord: number, d: PaymentRecord) =>
         number): void => {
      const tooltip = svg.append('g');

      svg.on('touchmove mousemove', function(event) {
        // eslint-disable-next-line no-invalid-this
        const pointer = d3.pointer(event, this);
        const datum = bisectMonth(data, x, pointer[0]);
        const paymentTypeIdx = identifyPaymentType(pointer[1], datum.data);

        const value =
            keys.map(
                    k => `${fieldDisplay(k)}: ${
                             formatter.format(datum.data[k].toNumber())}` +
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