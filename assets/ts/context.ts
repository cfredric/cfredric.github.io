
// Clamps the input to within the interval [min, max] (inclusive on each end).
const clamp = (x: number, {min, max}: {min: number, max: number}): number =>
    Math.max(min, Math.min(max, x));

interface Input {
  price: number,                                  //
      homeValue: number,                          //
      hoa: number,                                //
      downPaymentPercent: number,                 //
      downPaymentAbsolute: number,                //
      interestRate: number,                       //
      pointValue: number,                         //
      pointsPurchased: number,                    //
      pmi: number,                                //
      pmiEquityPercent: number,                   //
      propertyTaxAbsolute: number,                //
      propertyTaxPercent: number,                 //
      residentialExemptionAnnualSavings: number,  //
      residentialExemptionDeduction: number,      //
      homeownersInsurance: number,                //
      closingCost: number,                        //
      mortgageTerm: number,                       //
      annualIncome: number,                       //
      monthlyDebt: number,                        //
      totalAssets: number,                        //
      alreadyClosed: boolean,                     //
      paymentsAlreadyMade: number,                //
}

export class Context {
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

  constructor(input: Input) {
    this.price = Math.max(0, input.price);
    this.homeValue = Math.max(0, input.homeValue) || this.price;
    this.hoa = Math.max(0, input.hoa);
    this.downPayment = clamp(input.downPaymentPercent, {min: 0, max: 100}) /
            100 * this.price ||
        clamp(input.downPaymentAbsolute, {min: 0, max: this.price});
    this.downPaymentPct = this.downPayment / this.price;
    this.interestRate = clamp(input.interestRate, {min: 0, max: 100}) / 100;
    this.pointValue = Math.max(0, input.pointValue / 100) || 0.0025;
    this.pointsPurchased = Math.max(0, input.pointsPurchased);
    if (this.interestRate && this.pointsPurchased) {
      this.interestRate = Math.max(
          0, this.interestRate - this.pointsPurchased * this.pointValue);
    }
    this.pmi = this.downPaymentPct >= 0.2 ? 0 : Math.max(0, input.pmi);
    this.pmiEquityPct =
        clamp(input.pmiEquityPercent, {min: 0, max: 100}) / 100 || 0.22;
    {
      const rawMonthlyAbsolute = Math.max(0, input.propertyTaxAbsolute);
      const rawAnnualRate =
          clamp(input.propertyTaxPercent, {min: 0, max: 100}) / 100;

      const rawExemptionAnnualSavings =
          Math.max(0, input.residentialExemptionAnnualSavings);
      const rawAnnualDeduction =
          clamp(input.residentialExemptionDeduction, {min: 0, max: this.price});

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
    this.homeownersInsurance = Math.max(0, input.homeownersInsurance);
    this.closingCost = Math.max(0, input.closingCost);
    // Assume a 30 year fixed loan.
    this.mortgageTerm = Math.max(0, input.mortgageTerm) || 30;
    this.n = 12 * this.mortgageTerm;
    this.annualIncome = Math.max(0, input.annualIncome);
    this.monthlyDebt = Math.max(0, input.monthlyDebt);
    this.totalAssets = Math.max(0, input.totalAssets);

    this.alreadyClosed = input.alreadyClosed;
    this.paymentsAlreadyMade =
        clamp(input.paymentsAlreadyMade, {min: 0, max: this.n});
  }
}