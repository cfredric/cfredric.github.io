"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
var clamp = function (x, _a) {
    var min = _a.min, max = _a.max;
    return Math.max(min, Math.min(max, x));
};
var Context = (function () {
    function Context(input) {
        this.price = Math.max(0, input.price);
        this.homeValue = Math.max(0, input.homeValue) || this.price;
        this.hoa = Math.max(0, input.hoa);
        this.downPayment =
            clamp(input.downPaymentPercent, { min: 0, max: 100 }) / 100 *
                this.price ||
                clamp(input.downPaymentAbsolute, { min: 0, max: this.price });
        this.downPaymentPct = this.downPayment / this.price;
        this.interestRate =
            clamp(input.interestRate, { min: 0, max: 100 }) / 100;
        this.pointValue = Math.max(0, input.pointValue / 100) || 0.0025;
        this.pointsPurchased = Math.max(0, input.pointsPurchased);
        if (this.interestRate && this.pointsPurchased) {
            this.interestRate = Math.max(0, this.interestRate - this.pointsPurchased * this.pointValue);
        }
        this.pmi = this.downPaymentPct >= 0.2 ?
            0 :
            Math.max(0, input.pmi);
        this.pmiEquityPct =
            clamp(input.pmiEquityPercent, { min: 0, max: 100 }) / 100 ||
                0.22;
        {
            var rawMonthlyAbsolute = Math.max(0, input.propertyTaxAbsolute);
            var rawAnnualRate = clamp(input.propertyTaxPercent, { min: 0, max: 100 }) / 100;
            var rawExemptionAnnualSavings = Math.max(0, input.residentialExemptionAnnualSavings);
            var rawAnnualDeduction = clamp(input.residentialExemptionDeduction, { min: 0, max: this.price });
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
        this.homeownersInsurance = Math.max(0, input.homeownersInsurance);
        this.closingCost = Math.max(0, input.closingCost);
        this.mortgageTerm = Math.max(0, input.mortgageTerm) || 30;
        this.n = 12 * this.mortgageTerm;
        this.annualIncome = Math.max(0, input.annualIncome);
        this.monthlyDebt = Math.max(0, input.monthlyDebt);
        this.totalAssets = Math.max(0, input.totalAssets);
        this.alreadyClosed = input.alreadyClosed;
        this.paymentsAlreadyMade = clamp(input.paymentsAlreadyMade, { min: 0, max: this.n });
    }
    return Context;
}());
exports.Context = Context;
