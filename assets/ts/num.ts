
import Decimal from 'decimal.js';

type AnyNumber = number|Num|Decimal;

export class Num {
  private readonly v: Decimal;

  constructor(value: number|Decimal) {
    this.v = value instanceof Decimal ? value : new Decimal(value);
  }

  value(): Decimal {
    return this.v;
  }

  toNumber(): number {
    return this.value().toNumber();
  }

  static max(a: AnyNumber, b: AnyNumber): Num {
    a = Num.toNum(a);
    b = Num.toNum(b);
    if (a.gt(b)) return a;
    return b;
  }

  static floor(x: AnyNumber): Num {
    x = Num.toNum(x);
    return new Num(x.v.floor());
  }

  clamp(min: AnyNumber, max: AnyNumber): Num {
    min = Num.toNum(min);
    max = Num.toNum(max);
    if (this.gt(max)) return max;
    if (this.lt(min)) return min;
    return this;
  }

  gte(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.v.gte(b.v);
  }
  gt(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.v.gt(b.v);
  }
  lte(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.v.lte(b.v);
  }
  lt(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.v.lt(b.v);
  }
  eq(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.v.eq(b.v);
  }
  cmp(b: AnyNumber): number {
    b = Num.toNum(b);
    return this.v.cmp(b.v);
  }

  add(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new Num(this.v.add(b.v));
  }
  sub(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new Num(this.v.sub(b.v));
  }
  mul(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new Num(this.v.mul(b.v));
  }
  static div(a: AnyNumber, b: AnyNumber): Num {
    a = Num.toNum(a);
    b = Num.toNum(b);
    return new Num(a.v.div(b.v));
  }
  div(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new Num(this.v.div(b.v));
  }
  pow(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new Num(this.v.pow(b.v));
  }

  static sum(...xs: readonly AnyNumber[]): Num {
    return new Num(
        Decimal.sum(...xs.map((x: AnyNumber) => Num.toNum(x).value())));
  }

  static toNum(x: AnyNumber): Num {
    if (x instanceof Num) return x;
    return new Literal(x);
  }
}

export class Literal extends Num {
  private readonly s: string;

  constructor(value: number|Decimal) {
    super(value);
    this.s = value.toString();
  }

  toString(): string {
    return this.s;
  }
}

export class NamedConstant extends Num {
  private readonly name: string;

  constructor(value: AnyNumber, name: string) {
    super(Num.toNum(value).value());
    this.name = name;
  }

  toString(): string {
    return this.name;
  }
}

export class DerivedNum extends Num {
  private readonly derivation: string;

  constructor(value: Decimal, derivation: string) {
    super(value);
    this.derivation = derivation;
  }

  toString(): string {
    return this.derivation;
  }
}
