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
var data = [];
(function () {
    var fmt = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });
    var pctFmt = new Intl.NumberFormat('en-US', {
        style: 'percent',
    });
    var hundredthsPctFmt = new Intl.NumberFormat('en-US', {
        style: 'percent',
        maximumFractionDigits: 2,
    });
    var orZero = function (elt) {
        var num = Number.parseFloat(elt.value);
        return Number.isNaN(num) ? 0 : num;
    };
    var clamp = function (x, _a) {
        var min = _a.min, max = _a.max;
        return Math.max(min, Math.min(max, x));
    };
    var getInputElt = function (id) {
        var elt = document.getElementById(id);
        if (!(elt instanceof HTMLInputElement))
            throw new Error(id + " element is not an HTMLInputElement");
        return elt;
    };
    var getOutputElt = function (id) {
        var elt = document.getElementById(id);
        if (!(elt instanceof HTMLElement))
            throw new Error(id + " element is not an HTMLElement");
        return elt;
    };
    var priceInput = getInputElt('price-input');
    var homeValueInput = getInputElt('home-value-input');
    var hoaInput = getInputElt('hoa-input');
    var downPaymentPercentageInput = getInputElt('down-payment-percentage-input');
    var downPaymentAbsoluteInput = getInputElt('down-payment-absolute-input');
    var interestRateInput = getInputElt('interest-rate-input');
    var pointsPurchasedInput = getInputElt('points-purchased-input');
    var pointValueInput = getInputElt('point-value-input');
    var mortgageInsuranceInput = getInputElt('mortgage-insurance-input');
    var pmiEquityPercentageInput = getInputElt('mortgage-insurance-equity-percentage-input');
    var propertyTaxAbsoluteInput = getInputElt('property-tax-absolute-input');
    var propertyTaxPercentageInput = getInputElt('property-tax-percentage-input');
    var residentialExemptionSavingsInput = getInputElt('residential-exemption-savings-input');
    var residentialExemptionDeductionInput = getInputElt('residential-exemption-deduction-input');
    var homeownersInsuranceInput = getInputElt('homeowners-insurance-input');
    var closingCostInput = getInputElt('closing-cost-input');
    var mortgageTermInput = getInputElt('mortgage-term-input');
    var annualIncomeInput = getInputElt('annual-income-input');
    var monthlyDebtInput = getInputElt('monthly-debt-input');
    var totalAssetsInput = getInputElt('total-assets-input');
    var alreadyClosedInput = getInputElt('already-closed-input');
    var paymentsAlreadyMadeInput = getInputElt('payments-already-made-input');
    var homeValueHintOutput = getOutputElt('home-value-hint');
    var interestRateHintOutput = getOutputElt('interest-rate-hint');
    var pointValueHintOutput = getOutputElt('point-value-hint');
    var pmiEquityPercentageHintOutput = getOutputElt('mortgage-insurance-equity-percent-hint');
    var propertyTaxHintOutput = getOutputElt('property-tax-percentage-hint');
    var residentialExemptionHintOutput = getOutputElt('residential-exemption-hint');
    var mortgageTermHintOutput = getOutputElt('mortgage-term-hint');
    var downPaymentHintOutput = getOutputElt('down-payment-hint');
    var loanAmountOutput = getOutputElt('loan-amount-output');
    var principalAndInterestOutput = getOutputElt('principal-and-interest-output');
    var monthlyPaymentAmountOutput = getOutputElt('monthly-payment-output');
    var monthlyPaymentPmiOutput = getOutputElt('monthly-payment-pmi-output');
    var pmiPaymentTimelineOutput = getOutputElt('pmi-payment-timeline-output');
    var lifetimePaymentOutput = getOutputElt('lifetime-payment-output');
    var purchasePaymentOutput = getOutputElt('purchase-payment-output');
    var totalPaidSoFarOutput = getOutputElt('total-paid-so-far-output');
    var equityOwnedSoFarOutput = getOutputElt('equity-owned-so-far-output');
    var totalLoanOwedOutput = getOutputElt('total-loan-owed-output');
    var remainingEquityOutput = getOutputElt('remaining-equity-to-pay-for-output');
    var debtToIncomeOutput = getOutputElt('debt-to-income-ratio-output');
    var firedTomorrowCountdownOutput = getOutputElt('fired-tomorrow-countdown-output');
    var keys = [
        'principal',
        'interest',
        'hoa',
        'property_tax',
        'homeowners_insurance',
        'pmi',
    ];
    var COOKIE_ATTRIBUTES = [
        'Secure',
        'SameSite=Lax',
        "Domain=" + window.location.hostname,
        'Path=/Mortgage/',
    ];
    var COOKIE_SUFFIX = COOKIE_ATTRIBUTES
        .concat([
        "max-age=" + 60 * 60 * 24 * 365 * 10,
    ])
        .join(';');
    var COOKIE_SUFFIX_DELETE = COOKIE_ATTRIBUTES.concat([
        "max-age=0",
    ]);
    var fieldColor = function (pt) {
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
    var fieldDisplay = function (pt) {
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
    var urlParamMap = new Map([
        [priceInput, { name: 'price' }],
        [homeValueInput, { name: 'home_value' }],
        [hoaInput, { name: 'hoa' }],
        [downPaymentPercentageInput, { name: 'down_payment' }],
        [downPaymentAbsoluteInput, { name: 'down_payment_amt' }],
        [interestRateInput, { name: 'interest_rate' }],
        [pointsPurchasedInput, { name: 'points_purchased' }],
        [pointValueInput, { name: 'point_value' }],
        [mortgageInsuranceInput, { name: 'mortgage_insurance' }],
        [pmiEquityPercentageInput, { name: 'pmi_equity_pct' }],
        [propertyTaxAbsoluteInput, { name: 'property_tax' }],
        [propertyTaxPercentageInput, { name: 'property_tax_pct' }],
        [residentialExemptionSavingsInput, { name: 'resi_savings' }],
        [residentialExemptionDeductionInput, { name: 'resi_deduction' }],
        [homeownersInsuranceInput, { name: 'hoi' }],
        [closingCostInput, { name: 'closing_cost' }],
        [mortgageTermInput, { name: 'mortgage-term' }],
        [annualIncomeInput, { name: 'annual-income', deprecated: true }],
        [monthlyDebtInput, { name: 'monthly-debt' }],
        [totalAssetsInput, { name: 'total_assets', deprecated: true }],
        [alreadyClosedInput, { name: 'closed' }],
        [paymentsAlreadyMadeInput, { name: 'paid' }],
    ]);
    var cookieValueMap = new Map([
        [annualIncomeInput, { name: 'annual_income' }],
        [totalAssetsInput, { name: 'total_assets' }],
    ]);
    var attachListeners = function () {
        var e_1, _a;
        var onChange = function (elt) {
            var ctx = new Context();
            showAmountHints(ctx);
            saveFields(elt);
            setContents(ctx);
        };
        var _loop_1 = function (elt) {
            elt.addEventListener('input', function () { return onChange(elt); });
        };
        try {
            for (var _b = __values(urlParamMap.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var elt = _c.value;
                _loop_1(elt);
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
    var console_prompt = function () {
        console.log('Play around with the data! ' +
            'The payment schedule is in a variable called `data`. ' +
            'D3 is exposed as `d3`.');
    };
    var Context = (function () {
        function Context() {
            this.price = Math.max(0, orZero(priceInput));
            this.homeValue = Math.max(0, orZero(homeValueInput)) || this.price;
            this.hoa = Math.max(0, orZero(hoaInput));
            this.downPayment =
                clamp(orZero(downPaymentPercentageInput), { min: 0, max: 100 }) / 100 *
                    this.price ||
                    clamp(orZero(downPaymentAbsoluteInput), { min: 0, max: this.price });
            this.downPaymentPct = this.downPayment / this.price;
            this.interestRate =
                clamp(orZero(interestRateInput), { min: 0, max: 100 }) / 100;
            this.pointValue = Math.max(0, orZero(pointValueInput) / 100) || 0.0025;
            this.pointsPurchased = Math.max(0, orZero(pointsPurchasedInput));
            if (this.interestRate && this.pointsPurchased) {
                this.interestRate = Math.max(0, this.interestRate - this.pointsPurchased * this.pointValue);
            }
            this.pmi = this.downPaymentPct >= 0.2 ?
                0 :
                Math.max(0, orZero(mortgageInsuranceInput));
            this.pmiEquityPct =
                clamp(orZero(pmiEquityPercentageInput), { min: 0, max: 100 }) / 100 ||
                    0.22;
            {
                var rawMonthlyAbsolute = Math.max(0, orZero(propertyTaxAbsoluteInput));
                var rawAnnualRate = clamp(orZero(propertyTaxPercentageInput), { min: 0, max: 100 }) / 100;
                var rawExemptionAnnualSavings = Math.max(0, orZero(residentialExemptionSavingsInput));
                var rawAnnualDeduction = clamp(orZero(residentialExemptionDeductionInput), { min: 0, max: this.price });
                if (rawExemptionAnnualSavings) {
                    var monthlyAbsolute = rawMonthlyAbsolute || rawAnnualRate * this.homeValue / 12;
                    this.propertyTax = monthlyAbsolute - rawExemptionAnnualSavings / 12;
                    this.residentialExemptionPerMonth = rawExemptionAnnualSavings / 12;
                }
                else {
                    var annualRate = rawMonthlyAbsolute * 12 / this.homeValue || rawAnnualRate;
                    this.propertyTax =
                        annualRate * (this.homeValue - rawAnnualDeduction) / 12;
                    this.residentialExemptionPerMonth =
                        annualRate * rawAnnualDeduction / 12;
                }
            }
            this.homeownersInsurance = Math.max(0, orZero(homeownersInsuranceInput));
            this.closingCost = Math.max(0, orZero(closingCostInput));
            this.mortgageTerm = Math.max(0, orZero(mortgageTermInput)) || 30;
            this.n = 12 * this.mortgageTerm;
            this.annualIncome = Math.max(0, orZero(annualIncomeInput));
            this.monthlyDebt = Math.max(0, orZero(monthlyDebtInput));
            this.totalAssets = Math.max(0, orZero(totalAssetsInput));
            this.alreadyClosed = alreadyClosedInput.checked;
            this.paymentsAlreadyMade =
                clamp(orZero(paymentsAlreadyMadeInput), { min: 0, max: this.n });
        }
        return Context;
    }());
    var setContents = function (ctx) {
        var _a;
        loanAmountOutput.innerText = "" + fmt.format(ctx.price - ctx.downPayment);
        if (ctx.interestRate || ctx.downPayment === ctx.price) {
            var M_1 = ctx.downPayment === ctx.price ?
                0 :
                monthlyFormula(ctx.price * (1 - ctx.downPaymentPct), ctx.interestRate / 12, ctx.n);
            principalAndInterestOutput.innerText = "" + fmt.format(M_1);
            var extras_1 = ctx.hoa + ctx.propertyTax + ctx.homeownersInsurance;
            monthlyPaymentAmountOutput.innerText = "" + fmt.format(M_1 + extras_1);
            monthlyPaymentPmiOutput.innerText = "" + fmt.format(M_1 + extras_1 + ctx.pmi);
            var showPmi = ctx.pmi && ctx.downPaymentPct < ctx.pmiEquityPct;
            getOutputElt('monthly-payment-without-pmi-span')
                .style.display = showPmi ? '' : 'none';
            getOutputElt('monthly-payment-pmi-div').style.display =
                showPmi ? '' : 'none';
            var schedule_1 = calculatePaymentSchedule(ctx, M_1);
            data = schedule_1;
            buildPaymentScheduleChart(schedule_1, keys);
            var pmiMonths = countSatisfying(schedule_1, function (payment) { return payment.data.pmi !== 0; });
            pmiPaymentTimelineOutput.innerText = formatMonthNum(pmiMonths) + " (" + fmt.format(pmiMonths * ctx.pmi) + " total)";
            var cumulativeSums_1 = cumulativeSumByFields(schedule_1, keys);
            if (M_1) {
                buildCumulativeChart(cumulativeSums_1, ['principal', 'interest', 'pmi']);
                lifetimePaymentOutput.innerText =
                    "" + fmt.format(ctx.n * M_1 + d3.sum(schedule_1, function (d) { return d.data.pmi; }));
            }
            else {
                (_a = document.querySelector('#cumulative_viz > svg:first-of-type')) === null || _a === void 0 ? void 0 : _a.remove();
                lifetimePaymentOutput.innerText = "" + fmt.format(0);
            }
            showConditionalOutput(!!ctx.totalAssets, 'fired-tomorrow-countdown-div', firedTomorrowCountdownOutput, function () { return "" + formatMonthNum(countBurndownMonths(ctx, schedule_1)); });
            showConditionalOutput(!!ctx.paymentsAlreadyMade || ctx.alreadyClosed, 'total-paid-so-far-div', totalPaidSoFarOutput, function () { return "" + fmt.format((ctx.alreadyClosed ? ctx.closingCost + ctx.downPayment : 0) +
                sumAtIndex(cumulativeSums_1, keys, ctx.paymentsAlreadyMade)); });
            var absoluteEquityOwned_1 = (ctx.alreadyClosed ? ctx.downPayment : 0) +
                cumulativeSums_1[ctx.paymentsAlreadyMade].data['principal'];
            showConditionalOutput(!!ctx.paymentsAlreadyMade || ctx.alreadyClosed, 'equity-owned-so-far-div', equityOwnedSoFarOutput, function () {
                return pctFmt.format(absoluteEquityOwned_1 / ctx.homeValue) + " (" + fmt.format(absoluteEquityOwned_1) + ")";
            });
            showConditionalOutput(!!ctx.paymentsAlreadyMade || ctx.alreadyClosed, 'total-loan-owed-div', totalLoanOwedOutput, function () {
                var totalPrincipalAndInterestPaid = (ctx.alreadyClosed ? ctx.closingCost + ctx.downPayment : 0) +
                    sumAtIndex(cumulativeSums_1, ['principal', 'interest'], ctx.paymentsAlreadyMade);
                var totalPrincipalAndInterestToPay = ctx.closingCost +
                    sumAtIndex(cumulativeSums_1, ['principal', 'interest'], cumulativeSums_1.length - 1);
                return "" + fmt.format(totalPrincipalAndInterestToPay -
                    totalPrincipalAndInterestPaid);
            });
            showConditionalOutput(!!ctx.paymentsAlreadyMade || ctx.alreadyClosed, 'remaining-equity-to-pay-for-div', remainingEquityOutput, function () { return "" + fmt.format(ctx.price - absoluteEquityOwned_1); });
            showConditionalOutput(!!ctx.annualIncome, 'debt-to-income-ratio-div', debtToIncomeOutput, function () { return "" + pctFmt.format((ctx.monthlyDebt + M_1 + extras_1 + ctx.pmi) / ctx.annualIncome *
                12); });
        }
        else {
            data = [];
            clearMonthlyPaymentOutputs();
        }
        purchasePaymentOutput.innerText = "" + fmt.format(ctx.downPayment + ctx.closingCost +
            ctx.pointsPurchased * (ctx.price - ctx.downPayment) / 100);
    };
    var sumAtIndex = function (data, keys, idx) {
        return keys.reduce(function (sum, key) { return sum + data[idx].data[key]; }, 0);
    };
    var monthlyFormula = function (P, r, n) {
        return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    };
    var showConditionalOutput = function (condition, containerName, outputElt, generateOutput) {
        var container = getOutputElt(containerName);
        var text;
        var display;
        if (condition) {
            text = generateOutput();
            display = '';
        }
        else {
            text = '';
            display = 'none';
        }
        outputElt.innerText = text;
        container.style.display = display;
    };
    var calculatePaymentSchedule = function (ctx, monthlyPayment) {
        var e_2, _a;
        var equity = ctx.downPayment;
        var schedule = [];
        try {
            for (var _b = __values(d3.range(ctx.n)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var month = _c.value;
                var principal = ctx.price - equity;
                var interestPayment = (ctx.interestRate / 12) * principal;
                var pmiPayment = equity < ctx.pmiEquityPct * ctx.price ? ctx.pmi : 0;
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
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return schedule;
    };
    var showAmountHints = function (ctx) {
        homeValueHintOutput.innerText = "(" + fmt.format(ctx.homeValue) + ")";
        downPaymentHintOutput.innerText = "(" + fmt.format(ctx.downPayment) + ")";
        interestRateHintOutput.innerText =
            "(" + hundredthsPctFmt.format(ctx.interestRate) + ")";
        pointValueHintOutput.innerText =
            "(" + hundredthsPctFmt.format(ctx.pointValue) + ")";
        pmiEquityPercentageHintOutput.innerText =
            "(" + pctFmt.format(ctx.pmiEquityPct) + ")";
        propertyTaxHintOutput.innerText = "(Effective " + fmt.format(ctx.propertyTax * 12 / ctx.homeValue * 1000) + " / $1000; " + fmt.format(ctx.propertyTax) + "/mo)";
        residentialExemptionHintOutput.innerText =
            "(" + fmt.format(ctx.residentialExemptionPerMonth) + "/mo)";
        mortgageTermHintOutput.innerText = "(" + ctx.mortgageTerm + " yrs)";
    };
    var bisectMonth = function (data, x, mouseX) {
        var month = x.invert(mouseX);
        var index = d3.bisector(function (d) { return d.month; }).left(data, month, 1);
        var a = data[index - 1];
        var b = data[index];
        return b && month - a.month > b.month - month ? b : a;
    };
    var buildPaymentScheduleChart = function (schedule, keys) {
        var margin = { top: 50, right: 100, bottom: 120, left: 100 };
        var width = 900 - margin.left - margin.right;
        var height = 450 - margin.top - margin.bottom;
        var svg = makeSvg('schedule_viz', width, height, margin);
        var _a = makeAxes(svg, schedule, keys, width, height, margin, 'Monthly Payment', d3.sum), x = _a.x, y = _a.y;
        svg.append('g')
            .selectAll('path')
            .data(d3.stack()
            .keys(keys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone)
            .value(function (d, key) { return d.data[key]; })(schedule))
            .join('path')
            .style('fill', function (d) { return fieldColor(d.key); })
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
                    if (cumulative + datum.data[key] >= yTarget) {
                        return idx;
                    }
                    cumulative += datum.data[key];
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
        makeLegend(svg, width, function (d) { return fieldColor(d); }, keys);
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
        svg.selectAll('.area')
            .data(keys.map(function (key) { return ({
            key: key,
            values: data.map(function (datum) { return ({
                month: datum.month,
                value: datum.data[key],
            }); }),
        }); }))
            .enter()
            .append('g')
            .attr('class', function (d) { return "area " + d.key; })
            .append('path')
            .attr('d', function (d) { return area(d.values); })
            .style('fill', function (d) { return transparent(fieldColor(d.key)); });
        makeTooltip(svg, data, keys, x, function (mouseY, datum) {
            var _a;
            var yTarget = y.invert(mouseY);
            var sorted = keys.map(function (key) { return ({ key: key, value: datum.data[key] }); })
                .sort(function (a, b) { return a.value - b.value; });
            var elt = (_a = sorted.find(function (elt, idx, arr) { return yTarget <= elt.value &&
                (idx === arr.length - 1 || arr[idx + 1].value >= yTarget); })) !== null && _a !== void 0 ? _a : sorted[sorted.length - 1];
            return keys.indexOf(elt.key);
        });
        makeLegend(svg, width, function (d) { return transparent(fieldColor(d)); }, keys);
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
        var ext = d3.extent(data, function (d) { return d.month; });
        var x = d3.scaleLinear().domain(ext).range([
            0,
            width,
        ]);
        svg.append('g')
            .attr('transform', "translate(0, " + height + ")")
            .call(d3.axisBottom(x).tickValues(d3.range(0, data.length, 12)));
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
            var pointer = d3.pointer(event, this);
            var datum = bisectMonth(data, x, pointer[0]);
            var paymentTypeIdx = identifyPaymentType(pointer[1], datum);
            var value = keys.map(function (k) { return fieldDisplay(k) + ": " + fmt.format(datum.data[k]) +
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
            .text(function (d) { return fieldDisplay(d); })
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
        getOutputElt('debt-to-income-ratio-div').style.display = 'none';
        (_a = document.querySelector('#schedule_viz > svg:first-of-type')) === null || _a === void 0 ? void 0 : _a.remove();
        (_b = document.querySelector('#cumulative_viz > svg:first-of-type')) === null || _b === void 0 ? void 0 : _b.remove();
    };
    var initFields = function () {
        var e_4, _a, e_5, _b;
        var url = new URL(location.href);
        var hasValue = false;
        try {
            for (var _c = __values(urlParamMap.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), elt = _e[0], name_1 = _e[1].name;
                switch (elt.type) {
                    case 'text':
                        var value = url.searchParams.get(name_1);
                        hasValue = hasValue || value !== null;
                        if (value !== null) {
                            elt.value = decodeURIComponent(value);
                        }
                        break;
                    case 'checkbox':
                        var checked = url.searchParams.has(name_1);
                        hasValue = hasValue || checked;
                        if (checked) {
                            elt.checked = checked;
                        }
                        break;
                    default:
                        throw new Error('unreachable');
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_4) throw e_4.error; }
        }
        var cookies = document.cookie.split(';').map(function (x) {
            var _a;
            var parts = x.split('=');
            return { name: (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.trim(), value: decodeURIComponent(parts[1]) };
        });
        var _loop_2 = function (elt, name_2) {
            var savedCookie = cookies.find(function (_a) {
                var cookieName = _a.name;
                return name_2 === cookieName;
            });
            switch (elt.type) {
                case 'text':
                    hasValue = hasValue || savedCookie !== undefined;
                    if (savedCookie !== undefined) {
                        elt.value = savedCookie ? savedCookie.value : '';
                    }
                    break;
                case 'checkbox':
                    var checked = !!savedCookie;
                    hasValue = hasValue || checked;
                    if (!!savedCookie) {
                        elt.checked = checked;
                    }
                    break;
                default:
                    throw new Error('unreachable');
            }
        };
        try {
            for (var _f = __values(cookieValueMap.entries()), _g = _f.next(); !_g.done; _g = _f.next()) {
                var _h = __read(_g.value, 2), elt = _h[0], name_2 = _h[1].name;
                _loop_2(elt, name_2);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_5) throw e_5.error; }
        }
        if (hasValue) {
            var ctx = new Context();
            showAmountHints(ctx);
            setContents(ctx);
        }
    };
    var saveFields = function (changed) {
        var e_6, _a, e_7, _b;
        var url = new URL(location.href);
        var urlChanged = false;
        if (changed) {
            if (urlParamMap.has(changed)) {
                urlChanged =
                    urlChanged || updateURLParam(url, changed, urlParamMap.get(changed));
            }
            if (cookieValueMap.has(changed))
                updateCookie(changed, cookieValueMap.get(changed));
        }
        else {
            try {
                for (var _c = __values(urlParamMap.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var _e = __read(_d.value, 2), elt = _e[0], entry = _e[1];
                    urlChanged = urlChanged || updateURLParam(url, elt, entry);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_6) throw e_6.error; }
            }
            try {
                for (var _f = __values(cookieValueMap.entries()), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var _h = __read(_g.value, 2), elt = _h[0], entry = _h[1];
                    updateCookie(elt, entry);
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_7) throw e_7.error; }
            }
        }
        if (urlChanged)
            history.pushState({}, '', url.toString());
    };
    var updateURLParam = function (url, elt, entry) {
        if (entry.deprecated)
            return false;
        var value;
        var hasValue;
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
        var result;
        if (hasValue) {
            result = !url.searchParams.has(entry.name) ||
                url.searchParams.get(entry.name) !== value;
            url.searchParams.set(entry.name, value);
        }
        else {
            result = url.searchParams.has(entry.name);
            deleteParam(url, entry.name);
        }
        return result;
    };
    var updateCookie = function (elt, entry) {
        if (entry.deprecated)
            return;
        var value;
        var hasValue;
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
                entry.name + "=" + encodeURIComponent(value) + ";" + COOKIE_SUFFIX;
        }
        else {
            deleteCookie(entry.name);
        }
    };
    var clearDeprecatedStorage = function () {
        var e_8, _a, e_9, _b;
        var url = new URL(location.href);
        try {
            for (var _c = __values(urlParamMap.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = _d.value, name_3 = _e.name, deprecated = _e.deprecated;
                if (deprecated) {
                    deleteParam(url, name_3);
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_8) throw e_8.error; }
        }
        history.pushState({}, '', url.toString());
        try {
            for (var _f = __values(cookieValueMap.values()), _g = _f.next(); !_g.done; _g = _f.next()) {
                var _h = _g.value, name_4 = _h.name, deprecated = _h.deprecated;
                if (deprecated) {
                    deleteCookie(name_4);
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_9) throw e_9.error; }
        }
    };
    var deleteParam = function (url, name) {
        url.searchParams.delete(name);
    };
    var deleteCookie = function (name) {
        document.cookie = name + "=0;" + COOKIE_SUFFIX_DELETE;
    };
    var cumulativeSumByFields = function (data, fields) {
        var e_10, _a, e_11, _b, e_12, _c;
        var results = new Array(data.length + 1);
        results[0] = { month: 0, data: {} };
        try {
            for (var fields_1 = __values(fields), fields_1_1 = fields_1.next(); !fields_1_1.done; fields_1_1 = fields_1.next()) {
                var k = fields_1_1.value;
                results[0].data[k] = 0;
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (fields_1_1 && !fields_1_1.done && (_a = fields_1.return)) _a.call(fields_1);
            }
            finally { if (e_10) throw e_10.error; }
        }
        try {
            for (var _d = __values(data.entries()), _e = _d.next(); !_e.done; _e = _d.next()) {
                var _f = __read(_e.value, 2), idx = _f[0], datum = _f[1];
                var newData = {};
                try {
                    for (var fields_2 = (e_12 = void 0, __values(fields)), fields_2_1 = fields_2.next(); !fields_2_1.done; fields_2_1 = fields_2.next()) {
                        var field = fields_2_1.value;
                        newData[field] = data[idx].data[field] + results[idx].data[field];
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (fields_2_1 && !fields_2_1.done && (_c = fields_2.return)) _c.call(fields_2);
                    }
                    finally { if (e_12) throw e_12.error; }
                }
                results[idx + 1] = {
                    data: newData,
                    month: datum.month,
                };
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
            }
            finally { if (e_11) throw e_11.error; }
        }
        return results;
    };
    var countSatisfying = function (data, predicate) {
        var e_13, _a;
        var count = 0;
        try {
            for (var data_1 = __values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
                var t = data_1_1.value;
                if (predicate(t)) {
                    ++count;
                }
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
            }
            finally { if (e_13) throw e_13.error; }
        }
        return count;
    };
    var countBurndownMonths = function (ctx, schedule) {
        var e_14, _a;
        var assets = ctx.totalAssets;
        if (!ctx.alreadyClosed) {
            assets -= ctx.downPayment + ctx.closingCost;
        }
        var _loop_3 = function (i, record) {
            if (i < ctx.paymentsAlreadyMade) {
                return "continue";
            }
            var data_2 = record.data;
            var due = d3.sum(keys.map(function (k) { return data_2[k]; })) + ctx.monthlyDebt;
            if (due >= assets)
                return { value: i };
            assets -= due;
        };
        try {
            for (var _b = __values(schedule.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), i = _d[0], record = _d[1];
                var state_1 = _loop_3(i, record);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        }
        catch (e_14_1) { e_14 = { error: e_14_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_14) throw e_14.error; }
        }
        return schedule.length;
    };
    initFields();
    saveFields();
    clearDeprecatedStorage();
    attachListeners();
    console_prompt();
})();
