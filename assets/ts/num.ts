
import Decimal from 'decimal.js';

export type AnyNumber = number|Num|Decimal;

function toNumBase(x: AnyNumber): NumBase {
  if (x instanceof NumBase) return x;
  if (x instanceof Num) {
    throw new Error('unreachable');
  }
  return NumBase.literal(x);
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

  static literal(x: number|Decimal): Num {
    return NumBase.literal(x);
  }

  static max(a: AnyNumber, b: AnyNumber): Num {
    a = toNumBase(a);
    b = toNumBase(b);
    if (a.gt(b)) return a;
    return b;
  }

  static floor(x: AnyNumber): Num {
    const xb = toNumBase(x);
    return new DerivedNum(Op.Floor, xb);
  }

  clamp(min: AnyNumber, max: AnyNumber): Num {
    min = toNumBase(min);
    max = toNumBase(max);
    if (this.gt(max)) return max;
    if (this.lt(min)) return min;
    return this;
  }

  gte(b: AnyNumber): boolean {
    b = toNumBase(b);
    return this.value().gte(b.value());
  }
  gt(b: AnyNumber): boolean {
    b = toNumBase(b);
    return this.value().gt(b.value());
  }
  lte(b: AnyNumber): boolean {
    b = toNumBase(b);
    return this.value().lte(b.value());
  }
  lt(b: AnyNumber): boolean {
    b = toNumBase(b);
    return this.value().lt(b.value());
  }
  eq(b: AnyNumber): boolean {
    b = toNumBase(b);
    return this.value().eq(b.value());
  }
  cmp(b: AnyNumber): number {
    b = toNumBase(b);
    return this.value().cmp(b.value());
  }

  add(b: AnyNumber): DerivedNum {
    const bb = toNumBase(b);
    return new DerivedNum(Op.Plus, toNumBase(this), bb)
  }
  sub(b: AnyNumber): DerivedNum {
    const bb = toNumBase(b);
    return new DerivedNum(Op.Minus, toNumBase(this), bb);
  }
  mul(b: AnyNumber): DerivedNum {
    const bb = toNumBase(b);
    return new DerivedNum(Op.Mult, toNumBase(this), bb);
  }
  static div(a: AnyNumber, b: AnyNumber): Num {
    return toNumBase(a).div(b);
  }
  div(b: AnyNumber): DerivedNum {
    const bb = toNumBase(b);
    return new DerivedNum(Op.Div, toNumBase(this), bb);
  }
  pow(b: AnyNumber): DerivedNum {
    const bb = toNumBase(b);
    return new DerivedNum(Op.Pow, toNumBase(this), bb);
  }

  static sum(...xs: readonly AnyNumber[]): NumBase {
    const ns = xs.map(x => toNumBase(x));
    if (ns.length == 1) {
      return ns[0]!;
    }
    return new DerivedNum(Op.Plus, ...ns);
  }
  static product(...xs: readonly AnyNumber[]): NumBase {
    const ns = xs.map(x => toNumBase(x));
    if (ns.length == 1) {
      return ns[0]!;
    }
    return new DerivedNum(Op.Mult, ...ns);
  }

  // `prettyPrint` is the top-level call to get the derivation.
  abstract prettyPrint(simplify: boolean): string;
}

abstract class NumBase extends Num {
  constructor() {
    super();
  }

  static literal(x: number|Decimal): NumBase {
    return new Literal(x);
  }

  abstract numerators(): NumBase[];
  abstract denominators(): NumBase[];

  // Implementation detail used in simplifying the expression tree when
  // stringifying.
  abstract parenOrUnparen(op: Op, simplify: boolean): string;

  // Flattens the tree rooted at this Num, where adjacent subtrees with the same
  // associative operator have been merged.
  abstract flatten(): void;
  // Returns a list of all operands, if the subtree rooted at this NumBase
  // instance uses the same operator and the operator is associative. Otherwise,
  // returns a singleton list of [this].
  abstract mergeWith(op: Op): readonly NumBase[];

  abstract isElidable(ident: number): boolean;

  abstract printInternal(simplify: boolean): string;
}

function identity(op: Op): number {
  return op == Op.Plus ? 0 : 1;
}

class Literal extends NumBase {
  private readonly v: Decimal;

  constructor(value: number|Decimal) {
    super();
    this.v = valueOf(value);
  }

  value(): Decimal {
    return this.v;
  }

  numerators(): NumBase[] {
    return [this];
  }
  denominators(): NumBase[] {
    return [];
  }

  parenOrUnparen(_op: Op, _simplify: boolean): string {
    return this.toString();
  }

  flatten() {}
  mergeWith(_op: Op): readonly NumBase[] {
    return [this];
  }

  isElidable(ident: number): boolean {
    return this.value().eq(ident);
  }

  prettyPrint(simplify: boolean): string {
    return this.printInternal(simplify);
  }

  printInternal(_simplify: boolean): string {
    return this.v.toString();
  }

  toString(): string {
    return this.v.toString();
  }
}

export class NamedConstant extends NumBase {
  private readonly v: Decimal;
  private readonly name: string;

  constructor(name: string, value: AnyNumber) {
    super();
    this.name = name;
    this.v = valueOf(value);
  }

  value(): Decimal {
    return this.v;
  }

  numerators(): NumBase[] {
    return [this];
  }

  denominators(): NumBase[] {
    return [];
  }

  parenOrUnparen(_op: Op, _simplify: boolean): string {
    return this.name;
  }

  flatten() {}
  mergeWith(_op: Op): readonly NumBase[] {
    return [this];
  }
  isElidable(ident: number): boolean {
    // Elide named constants if their values are equal to the relevant identity.
    return this.value().eq(ident);
  }

  prettyPrint(_simplify: boolean): string {
    return this.name;
  }

  printInternal(_simplify: boolean): string {
    return this.name;
  }

  toString(): string {
    return this.name;
  }
}

class DerivedNum extends NumBase {
  readonly op: Op;
  private readonly v: Decimal;
  private ns: readonly NumBase[];

  // Lazily compute the symoblic representation. We build some complicated
  // numbers, so if we don't have to care about the symoblic representation, we
  // shouldn't.
  private s: (simplify: boolean) => string;

  constructor(op: Op, ...ns: readonly NumBase[]) {
    super();
    this.op = op;
    this.ns = ns;

    switch (this.op) {
      case Op.Plus:
        this.v = Decimal.sum(...ns.map(n => n.value()));
        this.s = (simplify: boolean) =>
            this.ns.map(n => n.printInternal(simplify)).join(' + ');
        break;
      case Op.Minus:
        if (this.ns.length !== 2) {
          throw new Error('Expected 2 operands for subtraction');
        }
        this.v = this.ns[0]!.value().sub(this.ns[1]!.value());
        this.s = (simplify: boolean) =>
            `${this.ns[0]!.printInternal(simplify)} - ${
                this.ns[1]!.parenOrUnparen(this.op, simplify)}`;
        break;
      case Op.Mult:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.mul(n.value()), ns[0]!.value());
        this.s = (simplify: boolean) => {
          const numerators = this.numerators();
          const denominators = this.denominators();
          if (denominators.length) {
            const numerator = Num.product(...numerators);
            const denominator = Num.product(...denominators);
            return numerator.div(denominator).printInternal(simplify);
          }
          // Base case: no quotients involved.
          return numerators.map(n => n.parenOrUnparen(this.op, simplify))
              .join(' * ');
        };
        break;
      case Op.Div:
        if (this.ns.length !== 2) {
          throw new Error('Expected 2 operands for division');
        }
        this.v = ns[0]!.value().div(ns[1]!.value());
        this.s = (simplify: boolean) => {
          const numerator = Num.product(...this.numerators());
          const denominators = this.denominators();
          if (!denominators.length) {
            throw new Error('unreachable');
          }
          const denominator = Num.product(...denominators);
          return `\\frac{${numerator.printInternal(simplify)}}{${
              denominator.printInternal(simplify)}}`;
        };
        break;
      case Op.Floor:
        if (this.ns.length !== 1) {
          throw new Error('Expected 1 operand for floor');
        }
        this.v = ns[0]!.value().floor();
        this.s = (simplify: boolean) =>
            'floor(' + ns[0]!.printInternal(simplify) + ')';
        break;
      case Op.Pow: {
        if (this.ns.length !== 2) {
          throw new Error('Expected 2 operands for exponentiation');
        }
        this.v = ns[0]!.value().pow(ns[1]!.value());
        const [base, power] = this.ns;
        this.s = (simplify: boolean) =>
            `{${base!.parenOrUnparen(this.op, simplify)}} ^ {${
                power!.printInternal(simplify)}}`;
      } break;
    }
  }

  value(): Decimal {
    return this.v;
  }

  numerators(): NumBase[] {
    if (this.op == Op.Div) {
      return [...this.ns[0]!.numerators(), ...this.ns[1]!.denominators()];
    } else if (this.op == Op.Mult) {
      return this.ns.flatMap(n => n.numerators());
    } else {
      return [this];
    }
  }

  denominators(): NumBase[] {
    if (this.op == Op.Div) {
      return [...this.ns[0]!.denominators(), ...this.ns[1]!.numerators()];
    } else if (this.op == Op.Mult) {
      return this.ns.flatMap(n => n.denominators());
    } else {
      return [];
    }
  }

  simplify(): NumBase|null {
    switch (this.op) {
      case Op.Mult:
      case Op.Plus: {
        if (this.op === Op.Mult && this.ns.some(n => n.isElidable(0))) {
          // 0 times anything is 0.
          return NumBase.literal(0);
        }
        const ident = identity(this.op);
        this.ns = this.ns.filter(n => !n.isElidable(ident));
        if (this.ns.length === 0) return NumBase.literal(ident);
        if (this.ns.length === 1) return this.ns[0]!;
        break;
      }
      case Op.Minus:
        if (this.ns[1]!.isElidable(0)) {
          // X - 0 is X.
          return this.ns[0]!;
        }
        break;
      case Op.Div:
        if (this.ns[1]!.isElidable(1)) {
          // X / 1 is X.
          return this.ns[0]!;
        }
        if (this.ns[0]!.isElidable(0)) {
          // 0 / X is 0.
          return NumBase.literal(0);
        }
        break;
      case Op.Pow:
        if (this.ns[0]!.isElidable(0)) {
          // 0 ^ X is 0.
          return NumBase.literal(0);
        }
        if (this.ns[0]!.isElidable(1)) {
          // 1 ^ X is 1.
          return NumBase.literal(1);
        }
        if (this.ns[1]!.isElidable(0)) {
          // X ^ 0 is 1.
          return NumBase.literal(1);
        }
        if (this.ns[1]!.isElidable(1)) {
          // X ^ 1 is X.
          return this.ns[0]!;
        }
        break;
      default:
    }
    return null;
  }

  parenOrUnparen(op: Op, simplify: boolean): string {
    if (simplify) {
      const simp = this.simplify();
      if (simp) return simp.printInternal(simplify);
    }
    if (precedence(op) < precedence(this.op)) {
      // The parent's precedence is lower than ours, so ours binds more
      // tightly and we don't need parens.
      return this.printInternal(simplify);
    }
    if (op == this.op && associative(this.op)) {
      // The parent op is the same as ours, *and* the op is associative, so
      // order doesn't matter - so we don't need parens.
      return this.printInternal(simplify);
    }
    // The parent op binds more tightly than ours, *or* it's the same op but
    // it isn't associative, so we need parens.
    return `{(${this.printInternal(simplify)})}`;
  }

  mergeWith(op: Op): readonly NumBase[] {
    if (this.op == op && associative(op)) return this.ns;
    return [this];
  }

  flatten() {
    for (const n of this.ns) {
      n.flatten();
    }

    this.ns = this.ns.flatMap((n) => n.mergeWith(this.op));
  }

  isElidable(ident: number): boolean {
    return this.value().eq(ident);
  }

  toString(): string {
    return this.printInternal(false);
  }

  prettyPrint(simplify: boolean): string {
    if (simplify) this.flatten();
    return this.printInternal(simplify);
  }

  printInternal(simplify: boolean): string {
    if (simplify) {
      const simp = this.simplify();
      if (simp) return simp.printInternal(simplify);
    }
    return this.s(simplify);
  }
}

export class NamedOutput extends NumBase {
  private readonly name: string;
  private readonly num: NumBase;

  constructor(name: string, num: Num) {
    super();
    this.name = name;
    this.num = toNumBase(num);
  }

  value(): Decimal {
    return this.num.value();
  }

  numerators(): NumBase[] {
    return [this];
  }

  denominators(): NumBase[] {
    return [];
  }

  parenOrUnparen(_op: Op): string {
    return this.name;
  }

  flatten() {}
  mergeWith(_op: Op): readonly NumBase[] {
    return [this];
  }
  isElidable(_ident: number): boolean {
    // Never elide named outputs.
    return false;
  }

  prettyPrint(simplify: boolean): string {
    // If this gets called at top level, we'll print the whole derivation.
    // Otherwise, we only use the name associated with this output.
    if (simplify) this.num.flatten();
    return this.num.prettyPrint(simplify);
  }

  printInternal(_simplify: boolean): string {
    return this.name;
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

function associative(op: Op): boolean {
  return op == Op.Plus || op == Op.Mult;
}
