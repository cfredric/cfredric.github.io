import Decimal from 'decimal.js';

export type AnyNumber = number|Num|Decimal;

function findIndexRight<T>(
    array: readonly T[], predicate: (t: T) => boolean): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i]!)) return i;
  }
  return -1;
}

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
  if (!(root instanceof DerivedNum) || root.op !== Op.Plus) return null;
  const nontrivials =
      root.ns.filter(n => !n.value().eq(0) || !isConstantOrLiteral(n));
  if (nontrivials.length === root.ns.length) return null;
  return Num.sum(...nontrivials);
}

/** Rewrite `a + b` into `c`, where a, b, and c are all literals. */
function literalAddition(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Plus) return null;

  const firstLiteralIndex = root.ns.findIndex(n => n instanceof Literal);
  if (firstLiteralIndex === -1) return null;
  const l1 = root.ns[firstLiteralIndex]! as Literal;
  const secondLiteralIndex = root.ns.findIndex(
      (n, i) => i > firstLiteralIndex && n instanceof Literal);
  if (secondLiteralIndex === -1) return null;
  const l2 = root.ns[secondLiteralIndex]! as Literal;
  const terms = root.ns.slice();
  terms[firstLiteralIndex] = Num.literal(l1.toNumber() + l2.toNumber());
  terms.splice(secondLiteralIndex, 1);
  return Num.sum(...terms);
}

/** Rewrite terms so that they end with a literal (if any). */
function reorderTerms(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Plus) return null;

  const lastLiteralIdx = findIndexRight(root.ns, n => n instanceof Literal);
  if (lastLiteralIdx === -1 || lastLiteralIdx === root.ns.length - 1)
    return null;

  const lit = root.ns[lastLiteralIdx]!;
  const terms = root.ns.slice();
  terms.splice(lastLiteralIdx, 1);
  terms.push(lit);
  return new DerivedNum(Op.Plus, ...terms);
}

/** Rewrites `x - 0` into `x`. */
function subtractionIdentity(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Minus) return null;
  const subtrahend = root.ns[1]!;
  return subtrahend.value().eq(0) && isConstantOrLiteral(subtrahend) ?
      root.ns[0]! :
      null;
}

/** Rewrites `0 - x` into `-1 * x`. */
function subtractionFromZero(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Minus) return null;
  const minuend = root.ns[0]!;
  return minuend.value().eq(0) && isConstantOrLiteral(minuend) ?
      Num.mul(-1, root.ns[1]!) :
      null;
}

/** Rewrites `x - x` into `0`. */
function subtractionFromSelf(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Minus) return null;
  return root.ns[0]!.eqSubtree(root.ns[1]!) ? Num.literal(0) : null;
}

/** Rewrite `a - b` into `c`, where a, b, and c are all literals. */
function literalSubtraction(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Minus) return null;
  if (!(root.ns[0] instanceof Literal) || !(root.ns[1] instanceof Literal))
    return null;
  return Num.literal(root.ns[0].toNumber() - root.ns[1].toNumber());
}

/** Rewrites `1 * x` or `x * 1` into `x`. */
function multiplicationIdentity(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Mult) return null;
  const nontrivials =
      root.ns.filter(n => !n.value().eq(1) || !isConstantOrLiteral(n));
  if (nontrivials.length === root.ns.length) return null;
  return Num.product(...nontrivials);
}

/** Rewrites `0 * x` or `x * 0` into `0`. */
function multiplicationCollapse(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Mult ||
      !root.ns.some(n => n.value().eq(0) && isConstantOrLiteral(n))) {
    return null;
  }
  return Num.literal(0);
}

/**
 * Rewrites products of fractions. Specifically:
 * `w/x * y/z` into `(w*y) / (x*z)`.
 * `x * y/z` or `y/z * x` into `(x * y)/z`.
 */
function multiplicationByFraction(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Mult) return null;
  const firstFractionIndex =
      root.ns.findIndex(n => n instanceof DerivedNum && n.op === Op.Div);
  if (firstFractionIndex === -1) return null;
  const f1 = root.ns[firstFractionIndex]! as DerivedNum;
  const factors = root.ns.slice();
  factors[firstFractionIndex] = f1.ns[0]!;
  let denominator = f1.ns[1]!;
  const secondFractionIndex = root.ns.findIndex(
      (n, i) =>
          i > firstFractionIndex && n instanceof DerivedNum && n.op === Op.Div);
  if (secondFractionIndex !== -1) {
    const f2 = root.ns[secondFractionIndex]! as DerivedNum;
    factors[secondFractionIndex] = f2.ns[0]!;
    denominator = denominator.mul(f2.ns[1]!);
  }
  return Num.product(...factors).div(denominator);
}

/** Rewrite `a * b` into `c`, where a, b, and c are all literals. */
function literalMultiplication(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Mult) return null;

  const firstLiteralIndex = root.ns.findIndex(n => n instanceof Literal);
  if (firstLiteralIndex === -1) return null;
  const l1 = root.ns[firstLiteralIndex]! as Literal;
  const secondLiteralIndex = root.ns.findIndex(
      (n, i) => i > firstLiteralIndex && n instanceof Literal);
  if (secondLiteralIndex === -1) return null;
  const l2 = root.ns[secondLiteralIndex]! as Literal;
  const factors = root.ns.slice();
  factors[firstLiteralIndex] = Num.literal(l1.toNumber() * l2.toNumber());
  factors.splice(secondLiteralIndex, 1);
  return Num.product(...factors);
}

/** Rewrite factors so that they start with a literal (if any). */
function reorderFactors(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Mult) return null;

  const firstLiteralIdx = root.ns.findIndex(n => n instanceof Literal);
  if (firstLiteralIdx < 1) return null;

  const lit = root.ns[firstLiteralIdx]!;
  const factors = root.ns.slice();
  factors.splice(firstLiteralIdx, 1);
  factors.unshift(lit);
  return new DerivedNum(Op.Mult, ...factors);
}

/** Rewrites `x / 1` into `x`. */
function divisionIdentity(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
  const divisor = root.ns[1]!;
  return divisor.value().eq(1) && isConstantOrLiteral(divisor) ? root.ns[0]! :
                                                                 null;
}

/** Rewrites `0 / x` into `0`. */
function divisionCollapse(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
  const numerator = root.ns[0]!;
  return numerator.value().eq(0) && isConstantOrLiteral(numerator) ?
      Num.literal(0) :
      null;
}

/** Rewrites `x / (y/z)` into `(x*z) / y`. */
function denominatorIsFraction(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
  const denominator = root.ns[1]!;
  return denominator instanceof DerivedNum && denominator.op === Op.Div ?
      Num.div(
          Num.product(root.ns[0]!, denominator.ns[1]!),
          denominator.ns[0]!,
          ) :
      null;
}

/** Reduces fractions. */
function reduceFraction(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Div) {
    return null;
  }
  const numerator = root.ns[0]!;
  const denominator = root.ns[1]!;
  const nFactors = numerator instanceof DerivedNum && numerator.op === Op.Mult ?
      numerator.ns.slice() :
      [numerator];
  const dFactors =
      denominator instanceof DerivedNum && denominator.op === Op.Mult ?
      denominator.ns.slice() :
      [denominator];
  for (const [i, nf] of nFactors.entries()) {
    if (nf.eqSubtree(Num.literal(1))) continue;
    for (const [j, df] of dFactors.entries()) {
      if (df.eqSubtree(Num.literal(1))) continue;
      if (nf.eqSubtree(df)) {
        nFactors.splice(i, 1);
        dFactors.splice(j, 1);
        return Num.div(
            Num.product(...nFactors),
            Num.product(...dFactors),
        );
      } else if (
          nf instanceof Literal && Number.isInteger(nf.toNumber()) &&
          df instanceof Literal && Number.isInteger(df.toNumber())) {
        const gcf = gcd(nf.toNumber(), df.toNumber());
        if (gcf !== 1) {
          nFactors[i] = Num.literal(nf.toNumber() / gcf);
          dFactors[j] = Num.literal(df.toNumber() / gcf);
          return Num.div(
              Num.product(...nFactors),
              Num.product(...dFactors),
          );
        }
      }
    }
  }

  return null;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  if (b > a) {
    const temp = a;
    a = b;
    b = temp;
  }
  while (true) {
    if (b == 0) return a;
    a %= b;
    if (a == 0) return b;
    b %= a;
  }
}

/** Rewrites `(x / y) / z` into `x / (y * z)`. */
function numeratorIsFraction(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
  const numerator = root.ns[0]!;
  return numerator instanceof DerivedNum && numerator.op === Op.Div ?
      Num.div(
          numerator.ns[0]!,
          Num.product(numerator.ns[1]!, root.ns[1]!),
          ) :
      null;
}

/** Rewrites `x ^ 1` into `x`. */
function powerIdentity(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Pow) return null;
  const power = root.ns[1]!;
  return power.value().eq(1) && isConstantOrLiteral(power) ? root.ns[0]! : null;
}

/** Rewrites `x ^ 0` into `1`, `0 ^ x` to `0`, and `1 ^ x` to `1`. */
function powerCollapse(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Pow) return null;
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
  return null;
}

/** Rewrites `x ^ y * x ^ z` into `x ^ {y + z}`. */
function powerCondense(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Mult) {
    return null;
  }

  for (const [i, be1] of root.ns.entries()) {
    if (!(be1 instanceof DerivedNum) || be1.op !== Op.Pow) continue;
    for (const [j, be2] of root.ns.entries()) {
      if (i >= j || !(be2 instanceof DerivedNum) || be2.op != Op.Pow) continue;
      if (be1.ns[0]!.eqSubtree(be2.ns[0]!)) {
        const factors = root.ns.slice();
        factors[i] = be1.ns[0]!.pow(be1.ns[1]!.add(be2.ns[1]!));
        factors.splice(j, 1);
        return Num.product(...factors);
      }
    }
  }

  return null;
}

/** Rewrite `a ^ b` into `c`, where a, b, and c are all literals. */
function literalExponentiation(root: NumBase): NumBase|null {
  if (!(root instanceof DerivedNum) || root.op !== Op.Pow) return null;
  if (!(root.ns[0] instanceof Literal) || !(root.ns[1] instanceof Literal))
    return null;
  return Num.literal(Math.pow(root.ns[0].toNumber(), root.ns[1].toNumber()));
}

const simplifications = [
  additionIdentity,       literalAddition,
  reorderTerms,           subtractionIdentity,
  subtractionFromZero,    subtractionFromSelf,
  literalSubtraction,     multiplicationIdentity,
  multiplicationCollapse, multiplicationByFraction,
  literalMultiplication,  reorderFactors,
  divisionIdentity,       divisionCollapse,
  denominatorIsFraction,  numeratorIsFraction,
  reduceFraction,         powerIdentity,
  powerCollapse,          powerCondense,
  literalExponentiation,
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

  static add(a: AnyNumber, b: AnyNumber): NumBase {
    return toNumBase(a).add(b);
  }
  add(b: AnyNumber): NumBase {
    return mergeSiblings(toNumBase(this), toNumBase(b), Op.Plus);
  }
  static sub(a: AnyNumber, b: AnyNumber): NumBase {
    return toNumBase(a).sub(b);
  }
  sub(b: AnyNumber): NumBase {
    return new DerivedNum(Op.Minus, toNumBase(this), toNumBase(b));
  }
  static mul(a: AnyNumber, b: AnyNumber): NumBase {
    return toNumBase(a).mul(b);
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
  static pow(a: AnyNumber, b: AnyNumber): NumBase {
    return toNumBase(a).pow(b);
  }
  pow(b: AnyNumber): NumBase {
    return new DerivedNum(Op.Pow, toNumBase(this), toNumBase(b));
  }

  static sum(...xs: readonly AnyNumber[]): NumBase {
    if (!xs.length) return Num.literal(0);
    const ns = xs.map(x => toNumBase(x));
    let result = ns[0]!;
    for (const n of ns.slice(1)) {
      result = result.add(n);
    }
    return result;
  }
  static product(...xs: readonly AnyNumber[]): NumBase {
    if (!xs.length) return Num.literal(1);
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

  abstract eqSubtree(other: NumBase): boolean;
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

  eqSubtree(other: NumBase): boolean {
    // Literal instances are interned, so we can just test for equality.
    return other === this;
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

  eqSubtree(other: NumBase): boolean {
    return other === this;
  }
}

/**
 * A number whose value is derived from other numbers. I.e., at least one other
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
    if (this.op === op && (op === Op.Mult || op === Op.Plus)) {
      // We've already merged associative ops (i.e. addition and
      // multiplication).
      throw new Error('unreachable');
    }
    // NB: LaTeX's syntax for a fraction is unambiguous, so we don't bother with
    // parens for fractions.
    return this.op !== Op.Div && precedence(op) >= precedence(this.op) ?
        `{(${this})}` :
        `${this}`;
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

  eqSubtree(other: NumBase): boolean {
    if (other === this) return true;
    if (!(other instanceof DerivedNum)) {
      return false;
    }
    if (this.op !== other.op) return false;
    if (other.ns.length !== this.ns.length) {
      return false;
    }
    for (let i = 0; i < this.ns.length; ++i) {
      if (!this.ns[i]!.eqSubtree(other.ns[i]!)) {
        return false;
      }
    }
    return true;
  }
}

/**
 * A number that is derived from other numbers, but is meaningful/important
 * enough to give a name.
 */
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

  eqSubtree(other: NumBase): boolean {
    return other === this;
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
