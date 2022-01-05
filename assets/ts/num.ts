
import Decimal from 'decimal.js';

type AnyNumber = number|Num|Decimal;

function toNum(x: AnyNumber): Num {
  if (x instanceof Num) return x;
  return new Literal(x);
}

function valueOf(x: AnyNumber): Decimal {
  if (x instanceof Decimal) return x;
  if (x instanceof Num) return x.value();
  return new Decimal(x);
}

export abstract class Num {
  constructor() {}

  abstract value(): Decimal;

  toNumber(): number {
    return this.value().toNumber();
  }

  static max(a: AnyNumber, b: AnyNumber): Num {
    a = toNum(a);
    b = toNum(b);
    if (a.gt(b)) return a;
    return b;
  }

  static floor(x: AnyNumber): Num {
    x = toNum(x);
    return new DerivedNum(Op.Floor, x);
  }

  clamp(min: AnyNumber, max: AnyNumber): Num {
    min = toNum(min);
    max = toNum(max);
    if (this.gt(max)) return max;
    if (this.lt(min)) return min;
    return this;
  }

  gte(b: AnyNumber): boolean {
    b = toNum(b);
    return this.value().gte(b.value());
  }
  gt(b: AnyNumber): boolean {
    b = toNum(b);
    return this.value().gt(b.value());
  }
  lte(b: AnyNumber): boolean {
    b = toNum(b);
    return this.value().lte(b.value());
  }
  lt(b: AnyNumber): boolean {
    b = toNum(b);
    return this.value().lt(b.value());
  }
  eq(b: AnyNumber): boolean {
    b = toNum(b);
    return this.value().eq(b.value());
  }
  cmp(b: AnyNumber): number {
    b = toNum(b);
    return this.value().cmp(b.value());
  }

  add(b: AnyNumber): Num {
    b = toNum(b);
    return new DerivedNum(Op.Plus, this, b)
  }
  sub(b: AnyNumber): Num {
    b = toNum(b);
    return new DerivedNum(Op.Minus, this, b);
  }
  mul(b: AnyNumber): Num {
    b = toNum(b);
    return new DerivedNum(Op.Mult, this, b);
  }
  static div(a: AnyNumber, b: AnyNumber): Num {
    return toNum(a).div(b);
  }
  div(b: AnyNumber): Num {
    b = toNum(b);
    return new DerivedNum(Op.Div, this, b);
  }
  pow(b: AnyNumber): Num {
    b = toNum(b);
    return new DerivedNum(Op.Pow, this, b);
  }

  // Implementation detail used in simplifying the expression tree when
  // stringifying.
  abstract merge(op: Op, simplify: boolean): string;

  // `parenthesized` returns a string representation of this number, with
  // parentheses around it (unless it's a single atom).
  abstract parenthesized(simplify: boolean): string;

  // `prettyPrint` is the top-level call to get the derivation.
  abstract prettyPrint(simplify: boolean): string;

  abstract printInternal(simplify: boolean): string;

  abstract includesNamedConstant(): boolean;

  static sum(...xs: readonly AnyNumber[]): Num {
    const ns = xs.map(x => toNum(x));
    return new DerivedNum(Op.Plus, ...ns);
  }
}

function isElidableIdentity(n: Num, op: Op): boolean {
  if (op != Op.Plus && op != Op.Mult) return false;
  const ident = identity(op);
  if (n instanceof NamedConstant && n.eq(ident)) {
    return true;
  }
  if (n.eq(ident) && !n.includesNamedConstant()) {
    return true;
  }

  return false;
}

function identity(op: Op): Num {
  return new Literal(op == Op.Plus ? 0 : 1);
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

  merge(_op: Op, _simplify: boolean): string {
    return this.toString();
  }
  parenthesized(_simplify: boolean): string {
    return this.toString();
  }

  prettyPrint(simplify: boolean): string {
    return this.printInternal(simplify);
  }

  printInternal(_simplify: boolean): string {
    return this.s;
  }

  includesNamedConstant(): boolean {
    return false;
  }

  toString(): string {
    return this.s;
  }
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

  merge(_op: Op, _simplify: boolean): string {
    return this.name;
  }
  parenthesized(_simplify: boolean): string {
    return this.name;
  }

  prettyPrint(_simplify: boolean): string {
    return this.name;
  }

  printInternal(_simplify: boolean): string {
    return this.name;
  }

  includesNamedConstant(): boolean {
    return true;
  }

  toString(): string {
    return this.name;
  }
}

export class DerivedNum extends Num {
  private readonly op: Op;
  private readonly v: Decimal;
  private readonly ns: readonly Num[];
  private readonly includesNamed: boolean;

  // Lazily compute the symoblic representation. We build some complicated
  // numbers, so if we don't have to care about the symoblic representation, we
  // shouldn't.
  private s: (simplify: boolean) => string;

  constructor(op: Op, ...ns: readonly Num[]) {
    super();
    this.op = op;

    switch (this.op) {
      case Op.Plus:
        this.v = Decimal.sum(...ns.map(n => n.value()));
        this.s = (simplify: boolean) => {
          if (simplify) {
            ns = ns.filter(n => !isElidableIdentity(n, this.op));
          }
          if (ns.length == 0) return new Literal(0).printInternal(simplify);
          if (ns.length == 1) return ns[0]!.printInternal(simplify);
          return ns.map(n => n.merge(this.op, simplify)).join(' + ');
        };
        break;
      case Op.Minus:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.sub(n.value()), valueOf(ns[0]!));
        this.s = (simplify: boolean) =>
            ns.map(n => n.merge(this.op, simplify)).join(' - ');
        break;
      case Op.Mult:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.mul(n.value()), valueOf(ns[0]!));
        this.s = (simplify: boolean) => {
          if (simplify) {
            ns = ns.filter(n => !isElidableIdentity(n, this.op));
          }
          if (ns.length == 0) return new Literal(1).printInternal(simplify);
          if (ns.length == 1) return ns[0]!.printInternal(simplify);
          return ns.map(n => n.merge(this.op, simplify)).join(' * ');
        };
        break;
      case Op.Div:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.div(n.value()), valueOf(ns[0]!));
        this.s = (simplify: boolean) =>
            ns.map(n => n.merge(this.op, simplify)).join(' / ');
        break;
      case Op.Floor:
        this.v = valueOf(ns[0]!).floor();
        this.s = (simplify: boolean) =>
            'floor(' + ns[0]!.printInternal(simplify) + ')';
        break;
      case Op.Pow:
        this.v = valueOf(ns[0]!).pow(valueOf(ns[1]!));
        this.s = (simplify: boolean) => ns[0]!.parenthesized(simplify) + ' ^ ' +
            ns[1]!.parenthesized(simplify);
        break;
    }
    this.ns = ns;

    this.includesNamed = ns.some(n => n.includesNamedConstant());
  }

  value(): Decimal {
    return this.v;
  }

  foo(): readonly Num[] {
    return this.ns;
  }

  merge(op: Op, simplify: boolean): string {
    if (simplify) {
      const ns = this.ns.filter(n => !isElidableIdentity(n, this.op));
      if (ns.length === 0) return identity(op).printInternal(simplify);
      if (ns.length === 1) return ns[0]!.printInternal(simplify);
    }
    if (precedence(op) < precedence(this.op)) {
      // The parent's precedence is lower than ours, so ours binds more
      // tightly and we don't need parens.
      return this.unparen(simplify);
    }
    if (op == this.op && commutative(this.op)) {
      // The parent op is the same as ours, *and* the op is commutative, so
      // order doesn't matter - so we don't need parens.
      return this.unparen(simplify);
    }
    // The parent op binds more tightly than ours, *or* it's the same op but
    // it isn't commutative, so we need parens.
    return this.parenthesized(simplify);
  }

  parenthesized(simplify: boolean): string {
    return `(${this.unparen(simplify)})`;
  }
  unparen(simplify: boolean): string {
    return this.printInternal(simplify);
  }

  toString(): string {
    return this.printInternal(false);
  }

  includesNamedConstant(): boolean {
    return this.includesNamed;
  }

  prettyPrint(simplify: boolean): string {
    return this.printInternal(simplify);
  }

  printInternal(simplify: boolean): string {
    return this.s(simplify);
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

  prettyPrint(simplify: boolean): string {
    // If this gets called at top level, we'll print the whole derivation.
    // Otherwise, we only use the name associated with this output.
    return this.num.prettyPrint(simplify);
  }

  printInternal(_simplify: boolean): string {
    return this.name;
  }

  includesNamedConstant(): boolean {
    return this.num.includesNamedConstant();
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
