
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

function isConstantOrLiteral(n: NumBase): boolean {
  return n instanceof Literal || n instanceof NamedConstant;
}

abstract class SimplificationRule {
  constructor() {}

  abstract apply(root: NumBase): NumBase|null;
}

class AdditionIdentity extends SimplificationRule {
  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op != Op.Plus) {
      return null;
    }
    const s = root as DerivedNum;
    const nontrivials =
        s.ns.filter(n => !n.value().eq(0) || !isConstantOrLiteral(n));
    if (nontrivials.length === s.ns.length) {
      return null;
    } else if (nontrivials.length === 1) {
      return nontrivials[0]!;
    } else if (nontrivials.length) {
      return new DerivedNum(Op.Plus, ...nontrivials);
    } else {
      return new Literal(0);
    }
  }
}

class SubtractionIdentity extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n.value().eq(0) && isConstantOrLiteral(n);
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op != Op.Minus ||
        !this.operandMatches(root.ns[1]!)) {
      return null;
    }
    const s = root as DerivedNum;
    return s.ns[0]!;
  }
}

class MultiplicationIdentity extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n.value().eq(1) && isConstantOrLiteral(n);
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Mult) {
      return null;
    }
    const s = root as DerivedNum;
    const nontrivials = s.ns.filter(n => !this.operandMatches(n));
    if (nontrivials.length === s.ns.length) {
      return null;
    } else if (nontrivials.length === 1) {
      return nontrivials[0]!;
    } else if (nontrivials.length) {
      return new DerivedNum(Op.Mult, ...nontrivials);
    } else {
      return new Literal(1);
    }
  }
}

class MultiplicationCollapse extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n.value().eq(0) && isConstantOrLiteral(n);
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Mult ||
        !root.ns.some(this.operandMatches)) {
      return null;
    }
    return new Literal(0);
  }
}

class MultiplicationByFraction extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n instanceof DerivedNum && n.op === Op.Div;
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Mult ||
        !root.ns.some(n => this.operandMatches(n))) {
      return null;
    }
    const s = root as DerivedNum;
    const nonfractionFactors = s.ns.slice();
    const fractionIndex = s.ns.findIndex(n => this.operandMatches(n));
    const fraction =
        nonfractionFactors.splice(fractionIndex, 1)[0]! as DerivedNum;
    return new DerivedNum(
        Op.Div,
        Num.product(
            ...nonfractionFactors.slice(0, fractionIndex), fraction.ns[0]!,
            ...nonfractionFactors.slice(fractionIndex)),
        fraction.ns[1]!,
    );
  }
}

class DivisionIdentity extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n.value().eq(1) && isConstantOrLiteral(n);
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Div ||
        !this.operandMatches(root.ns[1]!)) {
      return null;
    }
    const s = root as DerivedNum;
    return s.ns[0]!;
  }
}

class DivisionCollapse extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n.value().eq(0) && isConstantOrLiteral(n);
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Div ||
        !this.operandMatches(root.ns[0]!)) {
      return null;
    }
    return new Literal(0);
  }
}

class DenominatorIsFraction extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n instanceof DerivedNum && n.op === Op.Div;
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Div ||
        !this.operandMatches(root.ns[1]!)) {
      return null;
    }
    const s = root as DerivedNum;
    const denominator = s.ns[1]! as DerivedNum;

    return new DerivedNum(
        Op.Div,
        Num.product(s.ns[0]!, denominator.ns[1]!),
        denominator.ns[0]!,
    );
  }
}

class NumeratorIsFraction extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n instanceof DerivedNum && n.op === Op.Div;
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Div ||
        !this.operandMatches(root.ns[0]!)) {
      return null;
    }
    const s = root as DerivedNum;
    const numerator = s.ns[0]! as DerivedNum;
    const denominator = s.ns[1]!;

    return new DerivedNum(
        Op.Div, numerator.ns[0]!, Num.product(denominator, numerator.ns[1]!));
  }
}

class PowerIdentity extends SimplificationRule {
  private operandMatches(n: NumBase): boolean {
    return n.value().eq(1) && isConstantOrLiteral(n);
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Pow ||
        !this.operandMatches(root.ns[1]!)) {
      return null;
    }
    const s = root as DerivedNum;
    return s.ns[0]!;
  }
}

class PowerCollapse extends SimplificationRule {
  private operandMatches(n: NumBase, x: number): boolean {
    return n.value().eq(x) && isConstantOrLiteral(n);
  }

  override apply(root: NumBase): NumBase|null {
    if (!(root instanceof DerivedNum) || root.op !== Op.Pow ||
        (!this.operandMatches(root.ns[0]!, 1) &&
         !this.operandMatches(root.ns[0]!, 0) &&
         !this.operandMatches(root.ns[1]!, 0))) {
      return null;
    }
    const s = root as DerivedNum;
    const base = s.ns[0]!;
    const power = s.ns[1]!;
    if (power.eq(0)) {
      return new Literal(1);
    } else if (base.eq(0)) {
      return new Literal(0);
    } else if (base.eq(1)) {
      return new Literal(1);
    }
    throw new Error('unreachable');
  }
}

const simplifications = [
  new AdditionIdentity(),
  new SubtractionIdentity(),
  new MultiplicationIdentity(),
  new MultiplicationCollapse(),
  new MultiplicationByFraction(),
  new DivisionIdentity(),
  new DivisionCollapse(),
  new DenominatorIsFraction(),
  new NumeratorIsFraction(),
  new PowerIdentity(),
  new PowerCollapse(),
];

function mergeSiblings(a: NumBase, b: NumBase, op: Op): NumBase {
  if (a instanceof DerivedNum && a.op === op && b instanceof DerivedNum &&
      b.op === op) {
    return new DerivedNum(op, ...a.ns, ...b.ns);
  } else if (a instanceof DerivedNum && a.op === op) {
    return new DerivedNum(op, ...a.ns, b);
  } else if (b instanceof DerivedNum && b.op === op) {
    return new DerivedNum(op, a, ...b.ns);
  }
  return new DerivedNum(op, a, b);
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
    return new DerivedNum(Op.Floor, toNumBase(x));
  }

  clamp(min: AnyNumber, max: AnyNumber): Num {
    min = toNumBase(min);
    max = toNumBase(max);
    if (this.gt(max)) return max;
    if (this.lt(min)) return min;
    return this;
  }

  gte(b: AnyNumber): boolean {
    return this.value().gte(toNumBase(b).value());
  }
  gt(b: AnyNumber): boolean {
    return this.value().gt(toNumBase(b).value());
  }
  lte(b: AnyNumber): boolean {
    return this.value().lte(toNumBase(b).value());
  }
  lt(b: AnyNumber): boolean {
    return this.value().lt(toNumBase(b).value());
  }
  eq(b: AnyNumber): boolean {
    return this.value().eq(toNumBase(b).value());
  }
  cmp(b: AnyNumber): number {
    return this.value().cmp(toNumBase(b).value());
  }

  add(b: AnyNumber): NumBase {
    return mergeSiblings(toNumBase(this), toNumBase(b), Op.Plus);
  }
  sub(b: AnyNumber): DerivedNum {
    return new DerivedNum(Op.Minus, toNumBase(this), toNumBase(b));
  }
  mul(b: AnyNumber): NumBase {
    return mergeSiblings(toNumBase(this), toNumBase(b), Op.Mult);
  }
  static div(a: AnyNumber, b: AnyNumber): Num {
    return toNumBase(a).div(b);
  }
  div(b: AnyNumber): DerivedNum {
    return new DerivedNum(Op.Div, toNumBase(this), toNumBase(b));
  }
  pow(b: AnyNumber): DerivedNum {
    return new DerivedNum(Op.Pow, toNumBase(this), toNumBase(b));
  }

  static sum(...xs: readonly AnyNumber[]): NumBase {
    const ns = xs.map(x => toNumBase(x));
    let result = ns[0]!;
    for (const n of ns.slice(1)) {
      result = result.add(n);
    }
    return result;
  }
  static product(...xs: readonly AnyNumber[]): NumBase {
    const ns = xs.map(x => toNumBase(x));
    let result = ns[0]!;
    for (const n of ns.slice(1)) {
      result = result.mul(n);
    }
    return result;
  }

  // `prettyPrint` is the top-level call to get the derivation.
  prettyPrint(simplify: boolean): string {
    const nb = toNumBase(this);
    return (simplify ? nb.simplify() : nb).printInternal();
  }

  // Returns a simplified version of the expression rooted at this node.
  simplify(): NumBase {
    let root = toNumBase(this);
    // Run a fixed-point algorithm: loop over rules repeatedly until we go
    // through all the rules and don't find anything to simplify.
    let keepGoing = true;
    while (keepGoing) {
      keepGoing = false;
      for (const rule of simplifications) {
        // Another fixed-point algorithm: simplify using this rule repeatedly,
        // until it doesn't match anything anymore.
        let lookForMatch = true;
        while (lookForMatch) {
          lookForMatch = false;
          const simplified = root.simplifyOne(rule);
          if (simplified) {
            root = simplified;
            lookForMatch = true;
            keepGoing = true;
          }
        }
      }
    }
    return root;
  }
}

abstract class NumBase extends Num {
  constructor() {
    super();
  }

  static literal(x: number|Decimal): NumBase {
    return new Literal(x);
  }

  // Implementation detail used in simplifying the expression tree when
  // stringifying.
  abstract parenOrUnparen(op: Op): string;

  abstract printInternal(): string;

  // Runs a single simplification rule on this subtree. Returns a new subtree if
  // simplification was successful, or null if it was a no-op.
  simplifyOne(rule: SimplificationRule): NumBase|null {
    return rule.apply(this);
  }
}

class Literal extends NumBase {
  private readonly v: Decimal;

  constructor(value: number|Decimal) {
    super();
    this.v = valueOf(value);
  }

  override value(): Decimal {
    return this.v;
  }

  override parenOrUnparen(_op: Op): string {
    return this.toString();
  }

  override printInternal(): string {
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

  override value(): Decimal {
    return this.v;
  }

  override parenOrUnparen(_op: Op): string {
    return this.name;
  }

  override printInternal(): string {
    return this.name;
  }

  toString(): string {
    return this.name;
  }
}

class DerivedNum extends NumBase {
  readonly op: Op;
  private readonly v: Decimal;
  ns: readonly NumBase[];

  // Lazily compute the symoblic representation. We build some complicated
  // numbers, so if we don't have to care about the symoblic representation, we
  // shouldn't.
  private s: () => string;

  constructor(op: Op, ...ns: readonly NumBase[]) {
    super();
    this.op = op;
    this.ns = ns;

    switch (this.op) {
      case Op.Plus:
        this.v = Decimal.sum(...ns.map(n => n.value()));
        this.s = () => this.ns.map(n => n.printInternal()).join(' + ');
        break;
      case Op.Minus:
        if (this.ns.length !== 2) {
          throw new Error('Expected 2 operands for subtraction');
        }
        this.v = this.ns[0]!.value().sub(this.ns[1]!.value());
        this.s = () => `${this.ns[0]!.printInternal()} - ${
            this.ns[1]!.parenOrUnparen(this.op)}`;
        break;
      case Op.Mult:
        this.v = ns.slice(1).reduce(
            (acc: Decimal, n: Num) => acc.mul(n.value()), ns[0]!.value());
        this.s = () => this.ns.map(n => n.parenOrUnparen(this.op)).join(' * ');
        break;
      case Op.Div:
        if (this.ns.length !== 2) {
          throw new Error('Expected 2 operands for division');
        }
        this.v = ns[0]!.value().div(ns[1]!.value());
        this.s = () => `\\frac{${this.ns[0]!.printInternal()}}{${
            this.ns[1]!.printInternal()}}`;
        break;
      case Op.Floor:
        if (this.ns.length !== 1) {
          throw new Error('Expected 1 operand for floor');
        }
        this.v = ns[0]!.value().floor();
        this.s = () => 'floor(' + ns[0]!.printInternal() + ')';
        break;
      case Op.Pow: {
        if (this.ns.length !== 2) {
          throw new Error('Expected 2 operands for exponentiation');
        }
        this.v = ns[0]!.value().pow(ns[1]!.value());
        const [base, power] = this.ns;
        this.s = () =>
            `{${base!.parenOrUnparen(this.op)}} ^ {${power!.printInternal()}}`;
      } break;
    }
  }

  override value(): Decimal {
    return this.v;
  }

  override parenOrUnparen(op: Op): string {
    if (precedence(op) < precedence(this.op)) {
      // The parent's precedence is lower than ours, so ours binds more
      // tightly and we don't need parens.
      return this.printInternal();
    }
    if (op == Op.Mult && this.op == Op.Div) {
      // If the expression is some factor times a fraction, we don't need to
      // care about parens, since LaTeX already represents fractions in an
      // unambiguous way.
      return this.printInternal();
    }
    // The parent op binds more tightly than ours, *or* it's the same op but
    // it isn't associative, so we need parens.
    return `{(${this.printInternal()})}`;
  }

  toString(): string {
    return this.printInternal();
  }

  override printInternal(): string {
    return this.s();
  }

  override simplifyOne(rule: SimplificationRule): NumBase|null {
    const s = rule.apply(this);
    if (s) {
      // If the subtree rooted here has a match, we apply the rule and return.
      return s;
    }

    // Otherwise, we apply the rule to the first matching subtree underneath us,
    // and return a modified version of the subtree rooted at this node, if
    // there's a match.
    for (const [i, n] of this.ns.entries()) {
      const s = n.simplifyOne(rule);
      if (s) {
        const updated = this.ns.slice();
        updated[i] = s;
        return new DerivedNum(this.op, ...updated);
      }
    }

    // If there's no match, we indicate by returning null.
    return null;
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

  override value(): Decimal {
    return this.num.value();
  }

  override parenOrUnparen(_op: Op): string {
    return this.name;
  }

  override prettyPrint(simplify: boolean): string {
    // If this gets called at top level, we'll print the whole derivation.
    // Otherwise, we only use the name associated with this output.
    return this.num.prettyPrint(simplify);
  }

  override printInternal(): string {
    return this.name;
  }

  override simplifyOne(rule: SimplificationRule): NumBase|null {
    // Simplify the underlying subtree via this rule, if it matches.
    const simp = this.num.simplifyOne(rule);
    if (simp) {
      return new NamedOutput(this.name, simp);
    }
    return null;
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
