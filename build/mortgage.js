"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var d3 = require("d3");
(function () {
    var fmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });
    var pctFmt = new Intl.NumberFormat('en-US', {
        style: 'percent',
    });
    var orZero = function (elt) {
        var num = Number.parseFloat(elt.value);
        return Number.isNaN(num) ? 0 : num;
    };
    var priceInput = document.getElementById('price-input');
    var homeValueInput = document.getElementById('home-value-input');
    var homeValueHintOutput = document.getElementById('home-value-hint');
    var hoaInput = document.getElementById('hoa-input');
    var downPaymentPercentageInput = document.getElementById('down-payment-percentage-input');
    var downPaymentAbsoluteInput = document.getElementById('down-payment-absolute-input');
    var interestRateInput = document.getElementById('interest-rate-input');
    var mortgageInsuranceInput = document.getElementById('mortgage-insurance-input');
    var propertyTaxAbsoluteInput = document.getElementById('property-tax-absolute-input');
    var propertyTaxPercentageInput = document.getElementById('property-tax-percentage-input');
    var propertyTaxHintOutput = document.getElementById('property-tax-percentage-hint');
    var homeownersInsuranceInput = document.getElementById('homeowners-insurance-input');
    var closingCostInput = document.getElementById('closing-cost-input');
    var mortgageTermInput = document.getElementById('mortgage-term-input');
    var mortgageTermHintOutput = document.getElementById('mortgage-term-hint');
    var annualIncomeInput = document.getElementById('annual-income-input');
    var monthlyDebtInput = document.getElementById('monthly-debt-input');
    var downPaymentHintOutput = document.getElementById('down-payment-hint');
    var loanAmountOutput = document.getElementById('loan-amount-output');
    var principalAndInterestOutput = document.getElementById('principal-and-interest-output');
    var monthlyPaymentAmountOutput = document.getElementById('monthly-payment-output');
    var monthlyPaymentPmiOutput = document.getElementById('monthly-payment-pmi-output');
    var lifetimePaymentOutput = document.getElementById('lifetime-payment-output');
    var purchasePaymentOutput = document.getElementById('purchase-payment-output');
    var debtToIncomeOutput = document.getElementById('debt-to-income-ratio-output');
    var keys = [
        'principal',
        'interest',
        'hoa',
        'property_tax',
        'homeowners_insurance',
        'pmi',
    ];
    var fields = new Map([
        ['principal', {
                display: 'Principal',
                color: '#1f77b4',
            }],
        ['interest', {
                display: 'Interest',
                color: '#ff7f0e',
            }],
        ['hoa', {
                display: 'HOA',
                color: '#bcbd22',
            }],
        ['property_tax', {
                display: 'Property Tax',
                color: '#17becf',
            }],
        ['homeowners_insurance', {
                display: 'Homeowner\'s Insurance',
                color: '#9467bd',
            }],
        ['pmi', {
                display: 'PMI',
                color: '#7f7f7f',
            }],
    ]);
    var urlParamMap = new Map([
        ['price', priceInput],
        ['home_value', homeValueInput],
        ['hoa', hoaInput],
        ['down_payment', downPaymentPercentageInput],
        ['down_payment_amt', downPaymentAbsoluteInput],
        ['interest_rate', interestRateInput],
        ['mortgage_insurance', mortgageInsuranceInput],
        ['property_tax', propertyTaxAbsoluteInput],
        ['property_tax_pct', propertyTaxPercentageInput],
        ['hoi', homeownersInsuranceInput],
        ['closing_cost', closingCostInput],
        ['mortgage-term', mortgageTermInput],
        ['annual-income', annualIncomeInput],
        ['monthly-debt', monthlyDebtInput],
    ]);
    var attachListeners = function () {
        var e_1, _a;
        var onChange = function () {
            showAmountHints();
            updateUrl();
            setContents();
        };
        try {
            for (var _b = __values(urlParamMap.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var elt = _c.value;
                elt.addEventListener('change', function () { return onChange(); });
                elt.addEventListener('input', function () { return onChange(); });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    // Value getters.
    var price = function () { return orZero(priceInput); };
    var homeValue = function () { return orZero(homeValueInput) || price(); };
    var hoa = function () { return orZero(hoaInput); };
    var downPayment = function () { return orZero(downPaymentPercentageInput) / 100 * price() ||
        orZero(downPaymentAbsoluteInput); };
    var interestRate = function () { return orZero(interestRateInput) / 100; };
    var pmi = function () { return orZero(mortgageInsuranceInput); };
    var propertyTax = function () { return orZero(propertyTaxAbsoluteInput) ||
        (orZero(propertyTaxPercentageInput) / 100 * homeValue() / 12); };
    var homeownersInsurance = function () { return orZero(homeownersInsuranceInput); };
    var closingCost = function () { return orZero(closingCostInput); };
    // Assume a 30 year fixed loan.
    var mortgageTerm = function () { return orZero(mortgageTermInput) || 30; };
    var annualIncome = function () { return orZero(annualIncomeInput); };
    var monthlyDebt = function () { return orZero(monthlyDebtInput); };
    // For convenience.
    var n = function () { return 12 * mortgageTerm(); };
    var downPaymentPct = function () { return downPayment() / price(); };
    var setContents = function () {
        var _a;
        loanAmountOutput.innerText = "" + fmt.format(price() - downPayment());
        if (interestRate() || downPayment() === price()) {
            var M = downPayment() == price() ? 0 : monthlyFormula(price() * (1 - downPaymentPct()), interestRate() / 12, n());
            principalAndInterestOutput.innerText = "" + fmt.format(M);
            var extras = hoa() + propertyTax() + homeownersInsurance();
            monthlyPaymentAmountOutput.innerText = "" + fmt.format(M + extras);
            monthlyPaymentPmiOutput.innerText = "" + fmt.format(M + extras + pmi());
            var showPmi = pmi() && downPaymentPct() < 0.2;
            document
                .getElementById('monthly-payment-without-pmi-span')
                .style.display = showPmi ? '' : 'none';
            document.getElementById('monthly-payment-pmi-div').style.display =
                showPmi ? '' : 'none';
            var _b = calculatePaymentSchedule(M), amortizedSum = _b.sum, schedule = _b.schedule, cumulative = _b.cumulative;
            buildPaymentScheduleChart(schedule, keys);
            if (M) {
                buildCumulativeChart(cumulative, ['principal', 'interest']);
                lifetimePaymentOutput.innerText = "" + fmt.format(amortizedSum);
            }
            else {
                (_a = document.querySelector('#cumulative_viz > svg:first-of-type')) === null || _a === void 0 ? void 0 : _a.remove();
                lifetimePaymentOutput.innerText = "" + fmt.format(0);
            }
            if (annualIncome()) {
                debtToIncomeOutput.innerText = "" + pctFmt.format((monthlyDebt() + M + extras + pmi()) / annualIncome() * 12);
                document.getElementById('debt-to-income-ratio-div').style.display = '';
            }
            else {
                debtToIncomeOutput.innerText = '';
                document.getElementById('debt-to-income-ratio-div').style.display = 'none';
            }
        }
        else {
            clearMonthlyPaymentOutputs();
        }
        purchasePaymentOutput.innerText = "" + fmt.format(downPayment() + closingCost());
    };
    var monthlyFormula = function (P, r, n) {
        return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    };
    var calculatePaymentSchedule = function (monthlyPayment) {
        var e_2, _a;
        var equity = downPayment();
        var schedule = [];
        try {
            for (var _b = __values(d3.range(n())), _c = _b.next(); !_c.done; _c = _b.next()) {
                var month = _c.value;
                var principal = price() - equity;
                var interestPayment = (interestRate() / 12) * principal;
                var pmiPayment = equity < 0.2 * price() ? pmi() : 0;
                equity += monthlyPayment - interestPayment;
                schedule.push({
                    month: month + 1,
                    data: {
                        interest: interestPayment,
                        principal: monthlyPayment - interestPayment,
                        pmi: pmiPayment,
                        hoa: hoa(),
                        property_tax: propertyTax(),
                        homeowners_insurance: homeownersInsurance(),
                    },
                });
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return {
            sum: n() * monthlyPayment + d3.sum(schedule, function (d) { return d.data.pmi; }),
            schedule: schedule,
            cumulative: cumulativeSumByFields(schedule, new Set(keys)),
        };
    };
    var showAmountHints = function () {
        homeValueHintOutput.innerText = "(" + fmt.format(homeValue()) + ")";
        downPaymentHintOutput.innerText = "(" + fmt.format(downPayment()) + ")";
        propertyTaxHintOutput.innerText =
            "(" + fmt.format(propertyTax() * 12 / homeValue() * 1000) + " / $1000; " + fmt.format(propertyTax()) + "/mo)";
        mortgageTermHintOutput.innerText = "(" + mortgageTerm() + " yrs)";
    };
    var bisectMonth = function (data, x, mouseX) {
        var bisect = d3.bisector(function (d) { return d.month; }).left;
        var month = x.invert(mouseX);
        var index = bisect(data, month, 1);
        var a = data[index - 1];
        var b = data[index];
        return b && month - a.month > b.month - month ? b : a;
    };
    var buildPaymentScheduleChart = function (schedule, keys) {
        // set the dimensions and margins of the graph
        var margin = { top: 50, right: 100, bottom: 120, left: 100 };
        var width = 900 - margin.left - margin.right;
        var height = 450 - margin.top - margin.bottom;
        var svg = makeSvg('schedule_viz', width, height, margin);
        var _a = makeAxes(svg, schedule, keys, width, height, margin, 'Monthly Payment', d3.sum), x = _a.x, y = _a.y;
        // Add the area
        svg.append('g')
            .selectAll('path')
            .data(d3.stack()
            .keys(keys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone)
            .value(function (d, key) { return d.data[key]; })(schedule))
            .join('path')
            .style('fill', function (d) { return fields.get(d.key).color; })
            .attr('d', d3.area()
            .x(function (d) { return x(d.data.month); })
            .y0(function (d) { return y(d['0']); })
            .y1(function (d) { return y(d['1']); }));
        makeTooltip(svg, schedule, keys, x, function (mouseY, datum) {
            var e_3, _a;
            var yTarget = y.invert(mouseY);
            var cumulative = 0;
            try {
                for (var _b = __values(keys.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), idx = _d[0], key = _d[1];
                    if (cumulative + datum[key] >= yTarget) {
                        return idx;
                    }
                    cumulative += datum[key];
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return keys.length - 1;
        });
        makeLegend(svg, width, function (d) { return fields.get(d).color; }, keys);
    };
    var buildCumulativeChart = function (data, keys) {
        var margin = { top: 50, right: 100, bottom: 120, left: 100 };
        var width = 900 - margin.left - margin.right;
        var height = 450 - margin.top - margin.bottom;
        var svg = makeSvg('cumulative_viz', width, height, margin);
        var _a = makeAxes(svg, data, keys, width, height, margin, 'Cumulative Payment', d3.max), x = _a.x, y = _a.y;
        var area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d) { return x(d.month); })
            .y0(y(0))
            .y1(function (d) { return y(d.value); });
        var sources = keys.map(function (key) { return ({
            key: key,
            values: data.map(function (datum) { return ({ month: datum.month, value: datum.data[key] }); }),
        }); });
        svg.selectAll('.area')
            .data(sources)
            .enter()
            .append('g')
            .attr('class', function (d) { return "area " + d.key; })
            .append('path')
            .attr('d', function (d) { return area(d.values); })
            .style('fill', function (d) { return transparent(fields.get(d.key).color); });
        makeTooltip(svg, data, keys, x, function (mouseY, datum) {
            var _a;
            var yTarget = y.invert(mouseY);
            var sorted = keys.map(function (key) { return ({ key: key, value: datum[key] }); })
                .sort(function (a, b) { return a.value - b.value; });
            var elt = (_a = sorted.find(function (elt, idx, arr) { return yTarget <= elt.value &&
                (idx === arr.length - 1 || arr[idx + 1].value >= yTarget); })) !== null && _a !== void 0 ? _a : sorted[sorted.length - 1];
            return keys.indexOf(elt.key);
        });
        makeLegend(svg, width, function (d) { return transparent(fields.get(d).color); }, keys);
    };
    var transparent = function (color) { return color + "aa"; };
    var formatMonthNum = function (m) {
        return (m >= 12 ? Math.floor(m / 12) + "y " : '') + (m % 12 + "mo");
    };
    var makeSvg = function (divId, width, height, margin) {
        d3.select("#" + divId).select('svg').remove();
        return d3.select("#" + divId)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', "translate(" + margin.left + ", " + margin.top + ")");
    };
    var makeAxes = function (svg, data, keys, width, height, margin, yLabel, yDomainFn) {
        // Add X axis
        var x = d3.scaleLinear().domain(d3.extent(data, function (d) { return d.month; })).range([
            0,
            width,
        ]);
        svg.append('g')
            .attr('transform', "translate(0, " + height + ")")
            .call(d3.axisBottom(x).tickValues(d3.range(0, data.length, 12)));
        // text label for the x axis
        svg.append('text')
            .attr('transform', "translate(" + width / 2 + ", " + (height + margin.top) + ")")
            .style('text-anchor', 'middle')
            .text('Month');
        var y = d3.scaleLinear()
            .domain([
            0,
            d3.max(data, function (d) { return yDomainFn(keys.map(function (k) { return d.data[k]; })) * 1.25; }),
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
        return { x: x, y: y };
    };
    var makeTooltip = function (svg, data, keys, x, identifyPaymentType) {
        var tooltip = svg.append('g');
        svg.on('touchmove mousemove', function (event) {
            // eslint-disable-next-line no-invalid-this
            var pointer = d3.pointer(event, this);
            var datum = bisectMonth(data, x, pointer[0]);
            var paymentTypeIdx = identifyPaymentType(pointer[1], datum);
            var value = keys.map(function (k) { return fields.get(k).display + ": " + fmt.format(datum.data[k]) +
                '\n'; })
                .join('') +
                ("Month: " + formatMonthNum(datum.month));
            tooltip.attr('transform', "translate(" + x(datum.month) + "," + pointer[1] + ")")
                .call(callout, value, paymentTypeIdx);
        });
        svg.on('touchend mouseleave', function () { return tooltip.call(callout, null, null); });
        var callout = function (g, value, paymentTypeIdx) {
            if (!value) {
                g.style('display', 'none');
                return;
            }
            g.style('display', null)
                .style('pointer-events', 'none')
                .style('font', '12px sans-serif');
            var path = g.selectAll('path')
                .data([null])
                .join('path')
                .attr('fill', 'white')
                .attr('stroke', 'black');
            var text = g.selectAll('text').data([null]).join('text').call(function (text) { return text.selectAll('tspan')
                .data((value + '').split(/\n/))
                .join('tspan')
                .attr('x', 0)
                .attr('y', function (_, i) { return i * 1.1 + "em"; })
                .style('font-weight', function (_, i) { return i === paymentTypeIdx ? 'bold' : null; })
                .text(function (d) { return d; }); });
            var _a = text.node().getBBox(), y = _a.y, w = _a.width, h = _a.height;
            text.attr('transform', "translate(" + -w / 2 + "," + (15 - y) + ")");
            path.attr('d', "M" + (-w / 2 - 10) + ",5H-5l5,-5l5,5H" + (w / 2 + 10) + "v" + (h + 20) + "h-" + (w + 20) + "z");
        };
    };
    var makeLegend = function (svg, width, color, keys) {
        var legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', "translate(" + (width - 200) + ", -50)");
        legend.selectAll('rect')
            .data(keys)
            .enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', function (_, i) { return i * 18; })
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', color);
        legend.selectAll('text')
            .data(keys)
            .enter()
            .append('text')
            .text(function (d) { return fields.get(d).display; })
            .attr('x', 18)
            .attr('y', function (_, i) { return i * 18; })
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'hanging');
    };
    var clearMonthlyPaymentOutputs = function () {
        var _a, _b;
        principalAndInterestOutput.innerText = '';
        monthlyPaymentAmountOutput.innerText = '';
        monthlyPaymentPmiOutput.innerText = '';
        lifetimePaymentOutput.innerText = '';
        debtToIncomeOutput.innerText = '';
        document.getElementById('debt-to-income-ratio-div').style.display = 'none';
        (_a = document.querySelector('#schedule_viz > svg:first-of-type')) === null || _a === void 0 ? void 0 : _a.remove();
        (_b = document.querySelector('#cumulative_viz > svg:first-of-type')) === null || _b === void 0 ? void 0 : _b.remove();
    };
    var initFieldsFromUrl = function () {
        var e_4, _a;
        var url = new URL(location.href);
        var hasValue = false;
        try {
            for (var _b = __values(urlParamMap.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), name_1 = _d[0], elt = _d[1];
                var value = url.searchParams.get(name_1);
                elt.value = value !== null && value !== void 0 ? value : '';
                hasValue = hasValue || value !== null;
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        if (hasValue) {
            showAmountHints();
            setContents();
        }
    };
    var updateUrl = function () {
        var e_5, _a;
        var url = new URL(location.href);
        try {
            for (var _b = __values(urlParamMap.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), name_2 = _d[0], elt = _d[1];
                if (elt.value === '') {
                    url.searchParams.delete(name_2);
                }
                else {
                    url.searchParams.set(name_2, elt.value);
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        history.pushState({}, '', url.toString());
    };
    var cumulativeSumByFields = function (data, fields) {
        var e_6, _a, e_7, _b;
        var results = new Array(data.length);
        var carriedValue = function (idx, key) {
            if (!fields.has(key))
                return data[idx].data[key];
            if (idx === 0)
                return 0;
            return results[idx - 1].data[key] + data[idx].data[key];
        };
        try {
            for (var _c = __values(data.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), idx = _e[0], datum = _e[1];
                results[idx] = { month: datum.month, data: {} };
                try {
                    for (var fields_1 = (e_7 = void 0, __values(fields)), fields_1_1 = fields_1.next(); !fields_1_1.done; fields_1_1 = fields_1.next()) {
                        var field = fields_1_1.value;
                        results[idx].data[field] = carriedValue(idx, field);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (fields_1_1 && !fields_1_1.done && (_b = fields_1.return)) _b.call(fields_1);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return results;
    };
    initFieldsFromUrl();
    attachListeners();
})();
