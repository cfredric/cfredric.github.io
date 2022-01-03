
import Decimal from 'decimal.js';

type AnyNumber = number|Num|Decimal;

export abstract class Num {
  constructor() {}

  abstract value(): Decimal;

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
    return new DerivedNum(Op.Floor, x);
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
    return this.value().gte(b.value());
  }
  gt(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.value().gt(b.value());
  }
  lte(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.value().lte(b.value());
  }
  lt(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.value().lt(b.value());
  }
  eq(b: AnyNumber): boolean {
    b = Num.toNum(b);
    return this.value().eq(b.value());
  }
  cmp(b: AnyNumber): number {
    b = Num.toNum(b);
    return this.value().cmp(b.value());
  }

  add(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new DerivedNum(Op.Plus, this, b)
  }
  sub(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new DerivedNum(Op.Minus, this, b);
  }
  mul(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new DerivedNum(Op.Mult, this, b);
  }
  static div(a: AnyNumber, b: AnyNumber): Num {
    a = Num.toNum(a);
    b = Num.toNum(b);
    return new DerivedNum(Op.Div, a, b);
  }
  div(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new DerivedNum(Op.Div, this, b);
  }
  pow(b: AnyNumber): Num {
    b = Num.toNum(b);
    return new DerivedNum(Op.Pow, this, b);
  }

  static sum(...xs: readonly AnyNumber[]): Num {
    return new DerivedNum(Op.Plus, ...xs.map(x => Num.toNum(x)));
  }

  static toNum(x: AnyNumber): Num {
    if (x instanceof Num) return x;
    return new Literal(x);
  }
}

export class Literal extends Num {
  private readonly v: Decimal;
  private readonly s: string;

  constructor(value: number|Decimal) {
    super();
    this.v = valueOf(value);
    this.s = value.toString();
  }

  value(): Decimal {
    return this.v;
  }

  toString(): string {
    return this.s;
  }
}

function valueOf(x: AnyNumber): Decimal {
  if (x instanceof Decimal) return x;
  if (x instanceof Num) return x.value();
  return new Decimal(x);
}

export class NamedConstant extends Num {
  private readonly v: Decimal;
  private readonly name: string;

  constructor(value: AnyNumber, name: string) {
    super();
    this.v = valueOf(value);
    this.name = name;
  }

  value(): Decimal {
    return this.v;
  }

  toString(): string {
    return this.name;
  }
}

export class DerivedNum extends Num {
  private readonly op: Op;
  private readonly v: Decimal;
  private readonly s: string;

  constructor(op: Op, ...ns: readonly Num[]) {
    super();
    this.op = op;

    switch (this.op) {
      case Op.Plus:
        this.v = Decimal.sum(...ns.map(n => n.value()));
        break;
      case Op.Minus:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.sub(n.value()), valueOf(ns[0]!));
        break;
      case Op.Mult:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.mul(n.value()), valueOf(ns[0]!));
        break;
      case Op.Div:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.div(n.value()), valueOf(ns[0]!));
        break;
      case Op.Floor:
        this.v = valueOf(ns[0]!).floor();
        break;
      case Op.Pow:
        this.v = valueOf(ns[0]!).pow(valueOf(ns[1]!));
        break;
    }

    this.s = 'todo';
  }

  value(): Decimal {
    return this.v;
  }

  toString(): string {
    return this.s;
  }
}

enum Op {
  Plus,
  Minus,
  Mult,
  Div,
  Floor,
  Pow,
}
