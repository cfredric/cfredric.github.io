import Decimal from 'decimal.js';

export type AnyNumber = number|Num|Decimal;

function toNumBase(x: AnyNumber): NumBase {
  if (x instanceof NumBase) return x;
  if (x instanceof Num) {
    throw new Error('unreachable');
  }
  if (x instanceof Decimal) return Num.literal(x.toNumber());
  return Num.literal(x);
}

function valueOf(x: AnyNumber): Decimal {
  if (x instanceof Decimal) return x;
  if (x instanceof Num) return x.value();
  return new Decimal(x);
}

function assertLength<T>(n: number, ts: readonly T[]) {
  if (ts.length !== n) {
    throw new Error(`Expected length of ${n} but found ${ts.length}`);
  }
}

function computeValue(op: Op, ns: readonly NumBase[]): Decimal {
  switch (op) {
    case Op.Plus:
      return Decimal.sum(...ns.map(n => n.value()));
    case Op.Minus:
      assertLength(2, ns);
      return ns[0]!.value().sub(ns[1]!.value());
    case Op.Mult: {
      let result = ns[0]!.value();
      for (const n of ns.slice(1)) {
        result = result.mul(n.value());
      }
      return result;
    }
    case Op.Div:
      assertLength(2, ns);
      return ns[0]!.value().div(ns[1]!.value());
    case Op.Floor:
      assertLength(1, ns);
      return ns[0]!.value().floor();
    case Op.Pow: {
      assertLength(2, ns);
      return ns[0]!.value().pow(ns[1]!.value());
    }
  }
}

function isConstantOrLiteral(n: NumBase): boolean {
  return n instanceof Literal || n instanceof NamedConstant;
}

// Simplifications are done by pattern-matching on the expression AST, and
// potentially returning a mutated version of the expression. This is the
// typical approach taken by computer algebra systems.
type SimplificationRule = (root: NumBase) => NumBase|null;

/** Rewrites `x + 0` or `0 + x` into `0`. */
function additionIdentity(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Plus) {
    const nontrivials =
        root.ns.filter(n => !n.value().eq(0) || !isConstantOrLiteral(n));
    if (nontrivials.length === root.ns.length) {
      return null;
    } else if (nontrivials.length === 1) {
      return nontrivials[0]!;
    } else if (nontrivials.length) {
      return Num.sum(...nontrivials);
    } else {
      return Num.literal(0);
    }
  }
  return null;
}

/** Rewrites `x - 0` into `x`. */
function subtractionIdentity(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Minus) {
    const subtrahend = root.ns[1]!;
    if (subtrahend.value().eq(0) && isConstantOrLiteral(subtrahend)) {
      return root.ns[0]!;
    }
  }
  return null;
}

/** Rewrites `0 - x` into `-1 * x`. */
function subtractionFromZero(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Minus) {
    const minuend = root.ns[0]!;
    if (minuend.value().eq(0) && isConstantOrLiteral(minuend)) {
      return Num.literal(-1).mul(root.ns[1]!);
    }
  }
  return null;
}

/** Rewrites `1 * x` or `x * 1` into `x`. */
function multiplicationIdentity(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Mult) {
    const nontrivials =
        root.ns.filter(n => !n.value().eq(1) || !isConstantOrLiteral(n));
    if (nontrivials.length === root.ns.length) {
      return null;
    } else if (nontrivials.length === 1) {
      return nontrivials[0]!;
    } else if (nontrivials.length) {
      return Num.product(...nontrivials);
    } else {
      return Num.literal(1);
    }
  }
  return null;
}

/** Rewrites `0 * x` or `x * 0` into `0`. */
function multiplicationCollapse(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Mult &&
      root.ns.some(n => n.value().eq(0) && isConstantOrLiteral(n))) {
    return Num.literal(0);
  }
  return null;
}

/** Rewrites `x * y/z` or `y/z * x` into `(x * y)/z`. */
function multiplicationByFraction(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Mult) {
    for (const [i, n] of root.ns.entries()) {
      if (n instanceof DerivedNum && n.op === Op.Div) {
        return Num
            .product(...root.ns.slice(0, i), n.ns[0]!, ...root.ns.slice(i + 1))
            .div(n.ns[1]!);
      }
    }
  }
  return null;
}

/** Collapses `-1 * x` (where x is a literal) into `-x`. */
function negatedLiteral(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Mult) {
    const negativeOneIdx =
        root.ns.findIndex(n => n.value().eq(-1) && n instanceof Literal);
    if (negativeOneIdx === -1) {
      return null;
    }
    let literalIdx = root.ns.findIndex(
        (n, i) => n instanceof Literal && i !== negativeOneIdx);
    if (literalIdx === -1) {
      return null;
    }
    const literal = root.ns[literalIdx]!;

    const factors = root.ns.slice();
    factors.splice(negativeOneIdx, 1);
    if (negativeOneIdx < literalIdx) {
      literalIdx--;
    }

    return Num.product(
        ...factors.slice(0, literalIdx),
        Num.literal(-1 * literal.toNumber()),
        ...factors.slice(literalIdx + 1),
    );
  }
  return null;
}

/** Rewrites `x / 1` into `x`. */
function divisionIdentity(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Div) {
    const divisor = root.ns[1]!;
    if (divisor.value().eq(1) && isConstantOrLiteral(divisor)) {
      return root.ns[0]!;
    }
  }
  return null;
}

/** Rewrites `0 / x` into `0`. */
function divisionCollapse(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Div) {
    const numerator = root.ns[0]!;
    if (numerator.value().eq(0) && isConstantOrLiteral(numerator)) {
      return Num.literal(0);
    }
  }
  return null;
}

/** Rewrites `x / (y/z)` into `(x*z) / y`. */
function denominatorIsFraction(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Div) {
    const denominator = root.ns[1]!;
    if (denominator instanceof DerivedNum && denominator.op === Op.Div) {
      return Num.product(root.ns[0]!, denominator.ns[1]!)
          .div(denominator.ns[0]!);
    }
  }
  return null;
}

/** Rewrites `(x / y) / z` into `x / (y * z)`. */
function numeratorIsFraction(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Div) {
    const numerator = root.ns[0]!;
    if (numerator instanceof DerivedNum && numerator.op === Op.Div) {
      return numerator.ns[0]!.div(Num.product(root.ns[1]!, numerator.ns[1]!));
    }
  }
  return null;
}

/** Rewrites `x ^ 1` into `x`. */
function powerIdentity(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Pow) {
    const power = root.ns[1]!;
    if (power.value().eq(1) && isConstantOrLiteral(power)) {
      return root.ns[0]!;
    }
  }
  return null;
}

/** Rewrites `x ^ 0` into `1`, `0 ^ x` to `0`, and `1 ^ x` to `1`. */
function powerCollapse(root: NumBase): NumBase|null {
  if (root instanceof DerivedNum && root.op === Op.Pow) {
    const base = root.ns[0]!;
    const power = root.ns[1]!;
    if (power.eq(0) && isConstantOrLiteral(power)) {
      // X ^ 0 == 1
      return Num.literal(1);
    } else if (base.eq(0) && isConstantOrLiteral(base)) {
      // 0 ^ X == 0
      return Num.literal(0);
    } else if (base.eq(1) && isConstantOrLiteral(base)) {
      // 1 ^ X == 1
      return Num.literal(1);
    }
  }
  return null;
}

const simplifications = [
  additionIdentity,
  subtractionIdentity,
  subtractionFromZero,
  multiplicationIdentity,
  multiplicationCollapse,
  multiplicationByFraction,
  negatedLiteral,
  divisionIdentity,
  divisionCollapse,
  denominatorIsFraction,
  numeratorIsFraction,
  powerIdentity,
  powerCollapse,
];

/**
 * Given subtrees `a` and `b` and an operation `op`, returns a new tree with
 * top-level operation `op`, with `a` and `b` merged as needed. I.e., if `op` is
 * associative, and one or more of `a` and `b` uses the same op, then those
 * operands will be merged into the same level of the tree.
 *
 * This takes advantage of associativity to keep the tree flat. Operands are not
 * reordered (i.e. we don't care about commutativity).
 */
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
  private static literals: Map<number, WeakRef<Literal>> = new Map();

  constructor() {}

  abstract value(): Decimal;

  toNumber(): number {
    return this.value().toNumber();
  }

  static literal(x: number): NumBase {
    const ref = Num.literals.get(x);
    if (ref) {
      const lit = ref.deref();
      if (lit) return lit;
    }
    const lit = new Literal(x);
    Num.literals.set(x, new WeakRef(lit));
    return lit;
  }

  static prune(): void {
    const toRemove = new Set<number>();
    for (const [key, ref] of Num.literals.entries()) {
      if (!ref.deref()) {
        toRemove.add(key);
      }
    }
    for (const key of toRemove) {
      Num.literals.delete(key);
    }
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
  sub(b: AnyNumber): NumBase {
    return new DerivedNum(Op.Minus, toNumBase(this), toNumBase(b));
  }
  mul(b: AnyNumber): NumBase {
    return mergeSiblings(toNumBase(this), toNumBase(b), Op.Mult);
  }
  static div(a: AnyNumber, b: AnyNumber): NumBase {
    return toNumBase(a).div(b);
  }
  div(b: AnyNumber): NumBase {
    return new DerivedNum(Op.Div, toNumBase(this), toNumBase(b));
  }
  pow(b: AnyNumber): NumBase {
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
  prettyPrint(): string {
    return this.toString();
  }

  // Returns a simplified version of the expression rooted at this node.
  simplify(): NumBase {
    let current = toNumBase(this);
    // Run a fixed-point algorithm: loop over rules repeatedly until we go
    // through all the rules and don't find anything to simplify.
    let appliedSomeRule = false;
    do {
      appliedSomeRule = false;
      for (const rule of simplifications) {
        // Another fixed-point algorithm: simplify using this rule
        // repeatedly, until it doesn't match anything anymore.
        let appliedThisRule = false;
        do {
          appliedThisRule = false;
          const applied = current.simplifyOne(rule);
          if (applied) {
            current = applied;
            appliedThisRule = true;
            appliedSomeRule = true;
          }
        } while (appliedThisRule);
      }
    } while (appliedSomeRule);
    return current;
  }
}

abstract class NumBase extends Num {
  constructor() {
    super();
  }

  // Implementation detail used in simplifying the expression tree when
  // stringifying. Default behavior is to delegate to `toString`. Subclasses
  // that represent an expression tree (rather than a single leaf node) should
  // use `_op` to decide whether to return `(${this})` or `${this}`, depending
  // on the relative precedences of the operations (as well as their
  // associativities).
  parenOrUnparen(_op: Op): string {
    return this.toString();
  }

  // Runs a single simplification rule on this subtree. Returns a new subtree if
  // simplification was successful, or null if it was a no-op.
  simplifyOne(rule: SimplificationRule): NumBase|null {
    return rule(this);
  }
}

/** A numeric literal in a mathematical expression. */
class Literal extends NumBase {
  private readonly v: Decimal;

  constructor(value: number|Decimal) {
    super();
    this.v = valueOf(value);
  }

  override value(): Decimal {
    return this.v;
  }

  override toString(): string {
    return this.v.toString();
  }
}

/** A numeric constant (with an associated name) in some expression. */
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

  override toString(): string {
    return this.name;
  }
}

/** A number whose value is derived from other numbers. I.e., at least one other
 * number, combined with an operation of some sort, to give a result.
 */
class DerivedNum extends NumBase {
  readonly op: Op;
  private readonly v: Decimal;
  readonly ns: readonly NumBase[];

  constructor(op: Op, ...ns: readonly NumBase[]) {
    super();
    this.op = op;
    this.ns = ns;
    this.v = computeValue(this.op, this.ns);
  }

  override value(): Decimal {
    return this.v;
  }

  override parenOrUnparen(op: Op): string {
    if (this.op === Op.Div) {
      // If the child subexpression is a fraction, we don't need to add extra
      // parens, since LaTeX already represents fractions in an unambiguous way.
      return this.toString();
    }

    const pp = precedence(op);
    const pc = precedence(this.op);
    if (pp < pc) {
      // The parent's precedence is lower than ours, so ours binds more
      // tightly and we don't need parens.
      return this.toString();
    }
    if (pp > pc) {
      // The parent op binds more tightly than ours, so we need parens for the
      // child node.
      return `{(${this})}`;
    }

    // The parent op is the same precedence but it isn't associative, so we need
    // parens. (Note: we've already merged adjacent associated ops into a single
    // common node via `mergeSiblings`, so if we're here, then the operations
    // are either different, or they're the same *and* non-associative.
    // Therefore it is an error if the operations are both the same associative
    // op.)
    if (this.op === op && (op === Op.Mult || op === Op.Plus)) {
      throw new Error('unreachable');
    }

    return `{(${this})}`;
  }

  override toString(): string {
    switch (this.op) {
      case Op.Plus:
        return this.ns.map(n => n.parenOrUnparen(this.op)).join(' + ');
      case Op.Minus:
        // Note: we don't have to call parenOrUnparen for the left operand,
        // because expressions whose ops bind more tightly than - don't need
        // parens; and - itself is left-associative, as is +, so neither need
        // parens when they're the left operand; and there are no operations
        // that bind more loosely than -.
        return `${this.ns[0]} - ${this.ns[1]!.parenOrUnparen(this.op)}`;
      case Op.Mult:
        return this.ns.map(n => n.parenOrUnparen(this.op)).join(' * ');
      case Op.Div:
        return `\\frac{${this.ns[0]}}{${this.ns[1]}}`;
      case Op.Floor:
        return `floor(${this.ns[0]})`;
      case Op.Pow: {
        const [base, power] = this.ns;
        return `${base!.parenOrUnparen(this.op)} ^ {${power}}`;
      }
    }
  }

  override simplifyOne(rule: SimplificationRule): NumBase|null {
    const s = rule(this);
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
        return new DerivedNum(
            this.op,
            ...this.ns.slice(0, i),
            s,
            ...this.ns.slice(i + 1),
        );
      }
    }

    // If there's no match, we indicate by returning null.
    return null;
  }
}

/** A number that is derived from other numbers, but is meaningful/important
 * enough to give a name. */
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

  override prettyPrint(): string {
    // If this gets called at top level, we'll print the whole derivation.
    // Otherwise, we only use the name associated with this output.
    return this.num.prettyPrint();
  }

  override simplifyOne(rule: SimplificationRule): NumBase|null {
    // Simplify the underlying subtree via this rule, if it matches.
    const simp = this.num.simplifyOne(rule);
    if (simp) {
      return new NamedOutput(this.name, simp);
    }
    return null;
  }

  override toString(): string {
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
