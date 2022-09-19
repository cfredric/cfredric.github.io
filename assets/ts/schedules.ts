import {Context} from './context';
import {Num} from './num';
import {PaymentRecordWithMonth} from './types';

// Returns an array where the ith element is an object with the amount paid of
// each type before (and excluding) the ith month.
function pointwiseFromContext(ctx: Context): readonly PaymentRecordWithMonth[] {
  let equityOwned = ctx.downPayment;
  const pointwise: PaymentRecordWithMonth[] = new Array(ctx.n.toNumber());

  const lastMonth = ctx.n.toNumber();
  for (let month = 0; month < lastMonth; ++month) {
    const principalRemaining = ctx.price.sub(equityOwned);
    const interestPayment = ctx.interestRate.div(12).mul(principalRemaining);
    const pmiPayment = equityOwned.lt(ctx.pmiEquityPct.mul(ctx.price)) ?
        ctx.pmi :
        Num.literal(0);
    const principalPaidThisMonth = ctx.monthlyLoanPayment.sub(interestPayment)
                                       .clamp(0, principalRemaining);
    const propertyTaxThisMonth =
        month % 3 == ctx.taxCollectionStartMonthOffset ?
        ctx.propertyTaxQuarterly :
        Num.literal(0);
    equityOwned = equityOwned.add(principalPaidThisMonth);
    pointwise[month] = {
      month: month + 1,
      data: {
        interest: interestPayment,
        principal: principalPaidThisMonth,
        pmi: pmiPayment,
        hoa: ctx.hoa,
        property_tax: propertyTaxThisMonth,
        homeowners_insurance: ctx.homeownersInsurance,
      },
    };
  }

  return pointwise;
}

// Returns an array where the ith element is an object with the amount paid of
// each type before (and excluding) the ith month.
function cumulativeSum(points: readonly PaymentRecordWithMonth[]):
    PaymentRecordWithMonth[] {
  const results = new Array<PaymentRecordWithMonth>(points.length + 1);
  results[0] = {
    month: 0,
    data: {
      principal: Num.literal(0),
      interest: Num.literal(0),
      hoa: Num.literal(0),
      homeowners_insurance: Num.literal(0),
      pmi: Num.literal(0),
      property_tax: Num.literal(0),
    },
  };
  for (const [idx, point] of points.entries()) {
    const previous = results[idx]!;
    results[idx + 1] = {
      month: point.month,
      data: {
        principal: point.data.principal.add(previous.data.principal),
        interest: point.data.interest.add(previous.data.interest),
        hoa: point.data.hoa.add(previous.data.hoa),
        homeowners_insurance: point.data.homeowners_insurance.add(
            previous.data.homeowners_insurance),
        pmi: point.data.pmi.add(previous.data.pmi),
        property_tax: point.data.property_tax.add(previous.data.property_tax),
      },
    };
  }
  return results;
}

export class Schedules {
  private points: readonly PaymentRecordWithMonth[];
  private cumulatives: readonly PaymentRecordWithMonth[];

  constructor(ctx: Context) {
    this.points = pointwiseFromContext(ctx);
    this.cumulatives = cumulativeSum(this.points);
  }

  pointwise(): readonly PaymentRecordWithMonth[] {
    return this.points;
  }

  cumulative(): readonly PaymentRecordWithMonth[] {
    return this.cumulatives;
  }
}