
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

  // Implementation detail used in simplifying the expression tree when
  // stringifying.
  abstract merge(op: Op): string;

  // `parenthesized` returns a string representation of this number, with
  // parentheses around it (unless it's a single atom).
  abstract parenthesized(): string;

  // `prettyPrint` is the top-level call to get the derivation.
  abstract prettyPrint(): string;

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

  merge(_: Op): string {
    return this.toString();
  }
  parenthesized(): string {
    return this.toString();
  }

  prettyPrint(): string {
    return this.toString();
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

  merge(_: Op): string {
    return this.toString();
  }
  parenthesized(): string {
    return this.toString();
  }

  prettyPrint(): string {
    return this.toString();
  }

  toString(): string {
    return this.name;
  }
}

export class DerivedNum extends Num {
  private readonly op: Op;
  private readonly v: Decimal;

  // Lazily compute the symoblic representation. We build some complicated
  // numbers, so if we don't have to care about the symoblic representation, we
  // shouldn't.
  private s: string|(() => string);

  constructor(op: Op, ...ns: readonly Num[]) {
    super();
    this.op = op;

    switch (this.op) {
      case Op.Plus:
        this.v = Decimal.sum(...ns.map(n => n.value()));
        this.s = () => ns.map(n => n.merge(this.op)).join(' + ');
        break;
      case Op.Minus:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.sub(n.value()), valueOf(ns[0]!));
        this.s = () => ns.map(n => n.merge(this.op)).join(' - ');
        break;
      case Op.Mult:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.mul(n.value()), valueOf(ns[0]!));
        this.s = () => ns.map(n => n.merge(this.op)).join(' * ');
        break;
      case Op.Div:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.div(n.value()), valueOf(ns[0]!));
        this.s = () => ns.map(n => n.merge(this.op)).join(' / ');
        break;
      case Op.Floor:
        this.v = valueOf(ns[0]!).floor();
        this.s = () => 'floor(' + ns[0]!.toString() + ')';
        break;
      case Op.Pow:
        this.v = valueOf(ns[0]!).pow(valueOf(ns[1]!));
        this.s = () => ns[0]!.parenthesized() + ' ^ ' + ns[1]!.parenthesized();
        break;
    }
  }

  value(): Decimal {
    return this.v;
  }

  merge(op: Op): string {
    if (precedence(op) < precedence(this.op)) {
      // The parent's precedence is lower than ours, so ours binds more
      // tightly and we don't need parens.
      return this.unparen();
    }
    if (op == this.op && commutative(this.op)) {
      // The parent op is the same as ours, *and* the op is commutative, so
      // order doesn't matter - so we don't need parens.
      return this.unparen();
    }
    // The parent op binds more tightly than ours, *or* it's the same op but
    // it isn't commutative, so we need parens.
    return this.parenthesized();
  }

  parenthesized(): string {
    return `(${this.unparen()})`;
  }
  unparen(): string {
    return this.toString();
  }

  toString(): string {
    if (typeof this.s === 'function') {
      this.s = this.s();
    }

    return this.s;
  }

  prettyPrint(): string {
    return this.toString();
  }
}

export class NamedOutput extends Num {
  private readonly name: string;
  private readonly num: Num;

  constructor(name: string, num: Num) {
    super();
    this.name = name;
    this.num = num;
  }

  value(): Decimal {
    return this.num.value();
  }

  merge(_op: Op): string {
    return this.name;
  }

  parenthesized(): string {
    return this.name;
  }

  prettyPrint(): string {
    // If this gets called at top level, we'll print the whole derivation.
    // Otherwise, we only use the name associated with this output.
    return this.num.prettyPrint();
  }

  toString(): string {
    return this.name;
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

enum Precedence {
  Term,
  Factor,
  Expo,
  Call,
}

function precedence(op: Op): Precedence {
  switch (op) {
    case Op.Plus:
      return Precedence.Term;
    case Op.Minus:
      return Precedence.Term;
    case Op.Mult:
      return Precedence.Factor;
    case Op.Div:
      return Precedence.Factor;
    case Op.Pow:
      return Precedence.Expo;
    case Op.Floor:
      return Precedence.Call;
  }
}

function commutative(op: Op): boolean {
  return op == Op.Plus || op == Op.Mult;
}
