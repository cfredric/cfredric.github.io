'use strict';

(function() {
    const fmt = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});
    const orZero = (num) => Number.isNaN(num) ? 0 : num;

    const price_input = document.getElementById('price-input');
    const hoa_input = document.getElementById('hoa-input');
    const down_payment_input = document.getElementById('down-payment-input');
    const interest_rate_input = document.getElementById('interest-rate-input');
    const mortgage_insurance_input = document.getElementById('mortgage-insurance-input');
    const property_tax_input = document.getElementById('property-tax-input');
    const homeowners_insurance_input = document.getElementById('homeowners-insurance-input');
    const closing_cost_input = document.getElementById('closing-cost-input');

    const down_payment_hint_output = document.getElementById('down-payment-hint');
    const loan_amount_output = document.getElementById('loan-amount-output');
    const monthly_payment_output = document.getElementById('monthly-payment-output');
    const monthly_payment_pmi_output = document.getElementById('monthly-payment-pmi-output');
    const lifetime_payment_output = document.getElementById('lifetime-payment-output');
    const purchase_payment_output = document.getElementById('purchase-payment-output');

    const colors = {
        "principal": "#1f77b4",
        "interest": "#ff7f0e",
        "hoa": "#bcbd22",
        "property_tax": "#17becf",
        "homeowners_insurance": "#9467bd",
        "pmi": "#7f7f7f",
    };
    const keys = [
        "principal",
        "interest",
        "hoa",
        "property_tax",
        "homeowners_insurance",
        "pmi",
    ];
    const display_keys = {
        "principal": "Principal",
        "interest": "Interest",
        "hoa": "HOA",
        "property_tax": "Property Tax",
        "homeowners_insurance": "Homeowners Insurance",
        "pmi": "PMI",
    };

    const attachListeners = () => {
        const onChange = () => {
            showDownPaymentHint();
            updateUrl();
            setContents();
        };
        for (const elt of [
            price_input,
            hoa_input,
            down_payment_input,
            interest_rate_input,
            mortgage_insurance_input,
            property_tax_input,
            homeowners_insurance_input,
            closing_cost_input,
        ]) {
            elt.addEventListener('change', (event) => onChange());
            elt.addEventListener('input', (event) => onChange());
        }
    };

    // Assume a 30 year fixed loan.
    const years = 30;

    // Value getters.
    const price = () => orZero(Number.parseFloat(price_input.value));
    const hoa = () => orZero(Number.parseFloat(hoa_input.value));
    const down_payment_pct = () => orZero(Number.parseFloat(down_payment_input.value) / 100);
    const interest_rate = () => orZero(Number.parseFloat(interest_rate_input.value) / 100);
    const pmi = () => orZero(Number.parseFloat(mortgage_insurance_input.value));
    const property_tax = () => orZero(Number.parseFloat(property_tax_input.value));
    const homeowners_insurance = () => orZero(Number.parseFloat(homeowners_insurance_input.value));
    const closing_cost = () => orZero(Number.parseFloat(closing_cost_input.value));

    // For convenience.
    const n = 12 * years;
    const down_payment = () => price() * down_payment_pct();

    const setContents = () => {
        loan_amount_output.innerText = `${fmt.format(price() - down_payment())}`;
        const M = monthly_formula(
            price() * (1 - down_payment_pct()),
            interest_rate() / 12,
            n);
        const extras = hoa() + property_tax() + homeowners_insurance();

        monthly_payment_output.innerText = `${fmt.format(M + extras)}`;
        monthly_payment_pmi_output.innerText = `${fmt.format(M + extras + pmi())}`;
        const show_pmi = pmi() && down_payment_pct() < 0.2;
        document.querySelector("#monthly-payment-without-pmi-span").style.display = show_pmi ? "" : "none";
        document.querySelector("#monthly-payment-pmi-div").style.display = show_pmi ? "" : "none";

        if (interest_rate()) {
            const {sum: amortized_sum, schedule} = calculatePaymentSchedule(M);
            buildPaymentScheduleChart(schedule);
            lifetime_payment_output.innerText = `${fmt.format(amortized_sum)}`;
        }

        purchase_payment_output.innerText = `${fmt.format(down_payment() + closing_cost())}`;
    };

    const monthly_formula = (P, r, n) => {
        return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    };

    const calculatePaymentSchedule = (monthly_payment) => {
        let sum = 0;
        let equity = down_payment();
        const schedule = [];
        for (let i = 0; i < n; ++i) {
            const principal = price() - equity;
            const interest_payment = interest_rate() / 12 * principal;
            const pmi_payment = equity < 0.2 * price() ? pmi() : 0;
            sum += monthly_payment + pmi_payment;
            equity += (monthly_payment - interest_payment);
            schedule.push({
                month: i + 1,
                interest: interest_payment,
                principal: monthly_payment - interest_payment,
                principal_balance: price() - equity,
                pmi: pmi_payment,
                hoa: hoa(),
                property_tax: property_tax(),
                homeowners_insurance: homeowners_insurance(),
            });
        }
        return {sum, schedule};
    };

    const showDownPaymentHint = () => {
        down_payment_hint_output.innerText = `(${fmt.format(down_payment())})`;
    };

    const bisect_month = (data, x, mouse_x) => {
        const bisect = d3.bisector(d => d.month).left;
        const month = x.invert(mouse_x);
        const index = bisect(data, month, 1);
        const a = data[index - 1];
        const b = data[index];
        return b && (month - a.month > b.month - month) ? b : a;
    };

    const identify_payment_type = (y, mouse_y, datum) => {
        const y_target = y.invert(mouse_y);
        let cumulative = 0;
        for (const [idx, key] of keys.entries()) {
            if (cumulative + datum[key] >= y_target) {
                return idx;
            }
            cumulative += datum[key];
        }
        return keys.length - 1;
    };

    const buildPaymentScheduleChart = (schedule) => {
        // set the dimensions and margins of the graph
        const margin = {top: 50, right: 30, bottom: 70, left: 70};
        const width = 860 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        d3.select("#schedule_viz")
            .select('svg')
            .remove();
        const svg = d3.select("#schedule_viz")
            .append('svg')
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const stack = d3.stack()
            .keys(keys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone)
            (schedule);

        // Add X axis
        const x = d3.scaleLinear()
            .domain(d3.extent(schedule, (d) => d.month))
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x)
                .tickValues(d3.range(0, schedule.length, 12))
            );

        // text label for the x axis
        svg.append("text")
            .attr("transform", `translate(${width / 2}, ${height + margin.top})`)
            .style("text-anchor", "middle")
            .text("Month");

        const y = d3.scaleLinear()
            .domain([0, d3.max(schedule, (d) => d3.sum(keys.map((k) => d[k])))*1.25])
            .range([height, 0]);
        svg.append("g")
            .call(d3.axisLeft(y));

        // text label for the y axis
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Monthly Payment");

        // Add the area
        svg.append("g")
            .selectAll("path")
            .data(stack)
            .join("path")
            .style("fill", (d) => colors[d.key])
            .attr("d", d3.area()
                .x((d) => x(d.data.month))
                .y0((d) => y(d[0]))
                .y1((d) => y(d[1]))
            );

        const tooltip = svg.append("g");

        svg.on("touchmove mousemove", function(event) {
            const pointer = d3.pointer(event, this);
            const datum = bisect_month(schedule, x, pointer[0]);
            const payment_type_idx = identify_payment_type(y, pointer[1], datum);

            const value = keys.map((k) => `${display_keys[k]}: ${fmt.format(datum[k])}` + '\n').join('') +
                `Month: ${formatMonthNum(datum.month)}`;
            tooltip
                .attr("transform", `translate(${x(datum.month)},${pointer[1]})`)
                .call(callout, value, payment_type_idx);
        });

        svg.on("touchend mouseleave", () => tooltip.call(callout, null, null));

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
            .attr('fill', (d, i) => colors[d]);

        legend.selectAll('text')
            .data(keys)
            .enter()
            .append('text')
            .text((d) => display_keys[d])
            .attr('x', 18)
            .attr('y', (d, i) => i * 18)
            .attr('text-anchor', 'start')
            .attr('alignment-baseline', 'hanging');
    };

    const callout = (g, value, payment_type_idx) => {
        if (!value) return g.style("display", "none");

        g
            .style("display", null)
            .style("pointer-events", "none")
            .style("font", "12px sans-serif");

        const path = g.selectAll("path")
            .data([null])
            .join("path")
            .attr("fill", "white")
            .attr("stroke", "black");

        const text = g.selectAll("text")
            .data([null])
            .join("text")
            .call(text => text
                .selectAll("tspan")
                .data((value + "").split(/\n/))
                .join("tspan")
                .attr("x", 0)
                .attr("y", (d, i) => `${i * 1.1}em`)
                .style("font-weight", (_, i) => i === payment_type_idx ? "bold" : null)
                .text(d => d));

        const {x, y, width: w, height: h} = text.node().getBBox();

        text.attr("transform", `translate(${-w / 2},${15 - y})`);
        path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
    };

    const formatMonthNum = (m) => {
        const years = Math.floor(m / 12);
        const months = m % 12;
        return (years ? `${years}y ` : '') + `${months}mo`;
    };

    const initFieldsFromUrl = () => {
        const url = new URL(location.href);
        if ([
            ["price", price_input],
            ["hoa", hoa_input],
            ["down_payment", down_payment_input],
            ["interest_rate", interest_rate_input],
            ["mortgage_insurance", mortgage_insurance_input],
            ["property_tax", property_tax_input],
            ["hoi", homeowners_insurance_input],
            ["closing_cost", closing_cost_input],
        ].map(([name, elt]) => {
            const value = url.searchParams.get(name);
            elt.value = value ?? '';
            return value !== null;
        }).some((x) => x)) {
            setContents();
        }
    };

    const updateUrl = () => {
        const url = new URL(location.href);
        for (const [name, elt] of [
            ["price", price_input],
            ["hoa", hoa_input],
            ["down_payment", down_payment_input],
            ["interest_rate", interest_rate_input],
            ["mortgage_insurance", mortgage_insurance_input],
            ["property_tax", property_tax_input],
            ["hoi", homeowners_insurance_input],
            ["closing_cost", closing_cost_input],
        ]) {
            if (elt.value === '') {
                url.searchParams.delete(name);
            } else {
                url.searchParams.set(name, elt.value);
            }
        }
        history.pushState({}, '', url);
    };

    initFieldsFromUrl();
    attachListeners();
})();
