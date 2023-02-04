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

function isCollapsibleNaN(x: Num): boolean {
  return x instanceof Literal && Number.isNaN(x.toNumber());
}

/**
 * Simplifications are done by pattern-matching on the expression AST, and
 * potentially returning a mutated version of the expression. This is the
 * typical approach taken by computer algebra systems.  This particular
 * implementation is implemented using a simplified Visitor pattern.
 */
class SimplificationRule {
  constructor(
      readonly name: string, readonly f: (root: NumBase) => NumBase | null) {}

  visit(num: NumBase): NumBase|null {
    return (this.f)(num);
  }
}

/** Rewrites `x + 0` or `0 + x` into `0`. */
const additionIdentity = new SimplificationRule(
    'addition identity', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Plus) return null;
      const nontrivials =
          root.ns.filter(n => !n.eq(0) || !(n instanceof Literal));
      if (nontrivials.length === root.ns.length) return null;
      return Num.sum(...nontrivials);
    });

/** Rewrite `a + b` into `c`, where a, b, and c are all literals. */
const literalAddition = new SimplificationRule(
    'literal addition', (root: NumBase): NumBase|null => {
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
    });

/** Rewrite terms so that they end with a literal (if any). */
const reorderTerms =
    new SimplificationRule('reorder terms', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Plus) return null;

      const lastLiteralIdx = findIndexRight(root.ns, n => n instanceof Literal);
      if (lastLiteralIdx === -1 || lastLiteralIdx === root.ns.length - 1)
        return null;

      const lit = root.ns[lastLiteralIdx]!;
      const terms = root.ns.slice();
      terms.splice(lastLiteralIdx, 1);
      terms.push(lit);
      return new DerivedNum(Op.Plus, ...terms);
    });

/** Rewrites `x - 0` into `x`. */
const subtractionIdentity = new SimplificationRule(
    'subtraction identity', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Minus) return null;
      const subtrahend = root.ns[1]!;
      return subtrahend.eq(0) && (subtrahend instanceof Literal) ? root.ns[0]! :
                                                                   null;
    });

/** Rewrites `0 - x` into `-1 * x`. */
const subtractionFromZero = new SimplificationRule(
    'subtraction from zero', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Minus) return null;
      const minuend = root.ns[0]!;
      return minuend.eq(0) && (minuend instanceof Literal) ?
          Num.mul(-1, root.ns[1]!) :
          null;
    });

/** Rewrites `x - x` into `0`. */
const subtractionFromSelf = new SimplificationRule(
    'subtraction from self', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Minus) return null;
      return root.ns[0]!.eqSubtree(root.ns[1]!) ? Num.literal(0) : null;
    });

/** Rewrite `a - b` into `c`, where a, b, and c are all literals. */
const literalSubtraction = new SimplificationRule(
    'literal subtraction', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Minus) return null;
      if (!(root.ns[0] instanceof Literal) || !(root.ns[1] instanceof Literal))
        return null;
      return Num.literal(root.ns[0].toNumber() - root.ns[1].toNumber());
    });

/** Rewrites `1 * x` or `x * 1` into `x`. */
const multiplicationIdentity = new SimplificationRule(
    'multiplication identity', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Mult) return null;
      const nontrivials =
          root.ns.filter(n => !n.eq(1) || !(n instanceof Literal));
      if (nontrivials.length === root.ns.length) return null;
      return Num.product(...nontrivials);
    });

/** Rewrites `0 * x` or `x * 0` into `0`. */
const multiplicationCollapse = new SimplificationRule(
    'multiplication by zero', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Mult ||
          !root.ns.some(n => n.eq(0) && (n instanceof Literal))) {
        return null;
      }
      return Num.literal(0);
    });

/**
 * Rewrites products of fractions. Specifically:
 * `w/x * y/z` into `(w*y) / (x*z)`.
 * `x * y/z` or `y/z * x` into `(x * y)/z`.
 */
const multiplicationByFraction = new SimplificationRule(
    'combine products of fractions', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Mult) return null;
      const firstFractionIndex =
          root.ns.findIndex(n => n instanceof DerivedNum && n.op === Op.Div);
      if (firstFractionIndex === -1) return null;
      const f1 = root.ns[firstFractionIndex]! as DerivedNum;
      const factors = root.ns.slice();
      factors[firstFractionIndex] = f1.ns[0]!;
      let denominator = f1.ns[1]!;
      const secondFractionIndex = root.ns.findIndex(
          (n, i) => i > firstFractionIndex && n instanceof DerivedNum &&
              n.op === Op.Div);
      if (secondFractionIndex !== -1) {
        const f2 = root.ns[secondFractionIndex]! as DerivedNum;
        factors[secondFractionIndex] = f2.ns[0]!;
        denominator = denominator.mul(f2.ns[1]!);
      }
      return Num.product(...factors).div(denominator);
    });

/** Rewrite `a * b` into `c`, where a, b, and c are all literals. */
const literalMultiplication = new SimplificationRule(
    'multiplication of literals', (root: NumBase): NumBase|null => {
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
    });

/** Rewrite factors so that they start with a literal (if any). */
const reorderFactors =
    new SimplificationRule('reorder factors', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Mult) return null;

      const firstLiteralIdx = root.ns.findIndex(n => n instanceof Literal);
      if (firstLiteralIdx < 1) return null;

      const lit = root.ns[firstLiteralIdx]!;
      const factors = root.ns.slice();
      factors.splice(firstLiteralIdx, 1);
      factors.unshift(lit);
      return new DerivedNum(Op.Mult, ...factors);
    });

/** Rewrites `x / 1` into `x`. */
const divisionIdentity = new SimplificationRule(
    'division identity', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
      const divisor = root.ns[1]!;
      return divisor.eq(1) && (divisor instanceof Literal) ? root.ns[0]! : null;
    });

/** Rewrites `0 / x` into `0`, where x is nonzero. */
const divisionOfZero = new SimplificationRule(
    'division of zero', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
      const numerator = root.ns[0]!;
      const denominator = root.ns[1]!;

      if (!numerator.eq(0) || !(numerator instanceof Literal) ||
          denominator.eq(0) || !Number.isFinite(denominator.toNumber())) {
        return null;
      }

      return Num.literal(0);
    });

/** Rewrites `a / 0` into `NaN`, `Infinity`, or `-Infinity`. */
const divisionByZero = new SimplificationRule(
    'division by zero', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
      const numerator = root.ns[0]!;
      const denominator = root.ns[1]!;

      if (!denominator.eq(0) || !(denominator instanceof Literal) ||
          !(numerator instanceof Literal)) {
        return null;
      }

      if (numerator.gt(0)) {
        return Num.literal(Infinity);
      } else if (numerator.eq(0)) {
        return Num.literal(NaN);
      } else {
        return Num.literal(-Infinity);
      }
    });

const divisionWithNaN = new SimplificationRule(
    'division with NaN', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
      const numerator = root.ns[0]!;
      const denominator = root.ns[1]!;

      if (!isCollapsibleNaN(denominator) && !isCollapsibleNaN(numerator)) {
        return null;
      }

      return Num.literal(NaN);
    });

/** Rewrites `x / (y/z)` into `(x*z) / y`. */
const denominatorIsFraction = new SimplificationRule(
    'division by fraction', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
      const denominator = root.ns[1]!;
      return denominator instanceof DerivedNum && denominator.op === Op.Div ?
          Num.div(
              Num.product(root.ns[0]!, denominator.ns[1]!),
              denominator.ns[0]!,
              ) :
          null;
    });

/** Reduces fractions. */
const reduceFraction = new SimplificationRule(
    'fraction reduction', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Div) {
        return null;
      }
      const numerator = root.ns[0]!;
      const denominator = root.ns[1]!;
      const nFactors =
          numerator instanceof DerivedNum && numerator.op === Op.Mult ?
          numerator.ns.slice() :
          [numerator];
      const dFactors =
          denominator instanceof DerivedNum && denominator.op === Op.Mult ?
          denominator.ns.slice() :
          [denominator];
      for (const [i, nf] of nFactors.entries()) {
        if (nf.eqSubtree(Num.literal(1)) || nf.eqSubtree(Num.literal(0)))
          continue;
        for (const [j, df] of dFactors.entries()) {
          if (df.eqSubtree(Num.literal(1)) || df.eqSubtree(Num.literal(0)))
            continue;
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
    });

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
const numeratorIsFraction = new SimplificationRule(
    'fractional numerator', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Div) return null;
      const numerator = root.ns[0]!;
      return numerator instanceof DerivedNum && numerator.op === Op.Div ?
          Num.div(
              numerator.ns[0]!,
              Num.product(numerator.ns[1]!, root.ns[1]!),
              ) :
          null;
    });

/** Rewrites `x ^ 1` into `x`. */
const powerIdentity =
    new SimplificationRule('power identity', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Pow) return null;
      const power = root.ns[1]!;
      return power.eq(1) && (power instanceof Literal) ? root.ns[0]! : null;
    });

/** Rewrites `x ^ 0` into `1`, `0 ^ x` to `0`, and `1 ^ x` to `1`. */
const powerCollapse =
    new SimplificationRule('power collapse', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Pow) return null;
      const base = root.ns[0]!;
      const power = root.ns[1]!;
      if (power.eq(0) && (power instanceof Literal)) {
        // X ^ 0 == 1
        return Num.literal(1);
      } else if (base.eq(0) && (base instanceof Literal)) {
        // 0 ^ X == 0
        return Num.literal(0);
      } else if (base.eq(1) && (base instanceof Literal)) {
        // 1 ^ X == 1
        return Num.literal(1);
      }
      return null;
    });

/** Rewrites `x ^ y * x ^ z` into `x ^ {y + z}`. */
const powerCondense = new SimplificationRule(
    'exponent addition', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Mult) {
        return null;
      }

      for (const [i, be1] of root.ns.entries()) {
        if (!(be1 instanceof DerivedNum) || be1.op !== Op.Pow) continue;
        for (const [j, be2] of root.ns.entries()) {
          if (i >= j || !(be2 instanceof DerivedNum) || be2.op != Op.Pow)
            continue;
          if (be1.ns[0]!.eqSubtree(be2.ns[0]!)) {
            const factors = root.ns.slice();
            factors[i] = be1.ns[0]!.pow(be1.ns[1]!.add(be2.ns[1]!));
            factors.splice(j, 1);
            return Num.product(...factors);
          }
        }
      }

      return null;
    });

/** Rewrite `a ^ b` into `c`, where a, b, and c are all literals. */
const literalExponentiation = new SimplificationRule(
    'literal exponentiation', (root: NumBase): NumBase|null => {
      if (!(root instanceof DerivedNum) || root.op !== Op.Pow) return null;
      if (!(root.ns[0] instanceof Literal) || !(root.ns[1] instanceof Literal))
        return null;
      return Num.literal(
          Math.pow(root.ns[0].toNumber(), root.ns[1].toNumber()));
    });

const simplifications = [
  additionIdentity,
  literalAddition,
  reorderTerms,
  subtractionIdentity,
  subtractionFromZero,
  literalSubtraction,
  multiplicationIdentity,
  multiplicationByFraction,
  literalMultiplication,
  reorderFactors,
  divisionIdentity,
  divisionWithNaN,
  numeratorIsFraction,
  powerIdentity,
  powerCollapse,
  powerCondense,
  literalExponentiation,

  // Simplifications that rely on numerators and denominators of fractions to
  // *eliminate* the fraction must be last, since they rely on the numerator and
  // denominator having been fully simplified already.
  divisionByZero,
  divisionOfZero,
  denominatorIsFraction,
  subtractionFromSelf,
  multiplicationCollapse,
  reduceFraction,
];

/**
 * Given subtrees `a` and `b` and an operation `op`, returns a new tree with
 * top-level operation `op`, with `a` and `b` merged as needed. I.e., if one or
 * more of `a` and `b` uses the same op, then those operands will be merged into
 * the same level of the tree.
 *
 * This takes advantage of associativity to keep the tree flat (it assumes the
 * given op is associative). Operands are not reordered (i.e. we don't care
 * about commutativity).
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

  abstract value(): ReturnType<typeof valueOf>;

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
    b = toNumBase(b);
    return this.lt(b) ? -1 : this.gt(b) ? 1 : 0;
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
    for (let i = 1; i < ns.length; ++i) {
      result = result.add(ns[i]!);
    }
    return result;
  }
  static product(...xs: readonly AnyNumber[]): NumBase {
    if (!xs.length) return Num.literal(1);
    const ns = xs.map(x => toNumBase(x));
    let result = ns[0]!;
    for (let i = 1; i < ns.length; ++i) {
      result = result.mul(ns[i]!);
    }
    return result;
  }

  /** `prettyPrint` is the top-level call to get the derivation. */
  prettyPrint(): string {
    return this.toString();
  }

  /** Returns a simplified version of the expression rooted at this node. */
  simplify(): NumBase {
    const debug = false;
    let current = toNumBase(this);
    // We repeatedly loop over the list, starting over each time we've found a
    // matching rule, since the order of the rules matters.
    let loopAgain = true;
    const steps = [] if (debug) {
      steps.push({r: 'original', e: current.toString()});
    }
    while (loopAgain) {
      loopAgain = false;
      for (const rule of simplifications) {
        const applied = current.accept(rule);
        if (!applied) continue;
        current = applied;
        loopAgain = true;
        if (debug) {
          steps.push({r: rule.name, e: current.toString()});
        }
        break;
      }
    }
    if (debug) {
      console.log(steps);
    }
    return current;
  }
}

abstract class NumBase extends Num {
  constructor() {
    super();
  }

  /**
   * Implementation detail used in simplifying the expression tree when
   * stringifying.
   */
  parenOrUnparen(parentOp: Op): string {
    return this.is_leq_precedence_than(parentOp) ? `{(${this})}` : `${this}`;
  }

  /**
   * Subclasses that represent an expression subtree should compare the parent
   * op to their own op.
   */
  is_leq_precedence_than(_parentOp: Op): boolean {
    return false;
  }

  /**
   * Runs a single simplification rule on this subtree. Returns a new subtree
   * if simplification was successful, or null if it was a no-op.
   */
  accept(rule: SimplificationRule): NumBase|null {
    return rule.visit(this);
  }

  abstract eqSubtree(other: NumBase): boolean;
}

/** A numeric literal in a mathematical expression. */
class Literal extends NumBase {
  private readonly v: ReturnType<typeof valueOf>;

  constructor(value: number|Decimal) {
    super();
    this.v = valueOf(value);
  }

  override value() {
    return this.v;
  }

  override toString() {
    return this.v.toString();
  }

  override eqSubtree(other: NumBase) {
    // Literal instances are interned, so we can just test for equality.
    return other === this;
  }
}

/** A numeric constant (with an associated name) in some expression. */
export class NamedConstant extends NumBase {
  private readonly v: ReturnType<typeof valueOf>;
  private readonly name: string;

  constructor(name: string, value: AnyNumber) {
    super();
    this.name = name;
    this.v = valueOf(value);
  }

  override value() {
    return this.v;
  }

  override toString() {
    return this.name;
  }

  override eqSubtree(other: NumBase): boolean {
    return other === this;
  }
}

/**
 * A number whose value is derived from other numbers. I.e., at least one other
 * number, combined with an operation of some sort, to give a result.
 */
class DerivedNum extends NumBase {
  readonly op: Op;
  private readonly v: ReturnType<typeof valueOf>;
  readonly ns: readonly NumBase[];

  constructor(op: Op, ...ns: readonly NumBase[]) {
    super();
    this.op = op;
    this.ns = ns;
    this.v = this.computeValue();
  }

  override value() {
    return this.v;
  }

  override is_leq_precedence_than(parentOp: Op) {
    // NB: LaTeX's syntax for a fraction is unambiguous, so we don't bother with
    // parens for fractions.
    return this.op !== Op.Div && precedence(parentOp) >= precedence(this.op);
  }

  override toString() {
    switch (this.op) {
      case Op.Plus:
        return this.ns.map(n => n.parenOrUnparen(this.op)).join(' + ');
      case Op.Minus: {
        // Note: we don't have to call parenOrUnparen for the left operand,
        // because expressions whose ops bind more tightly than - don't need
        // parens; and - itself is left-associative, as is +, so neither need
        // parens when they're the left operand; and there are no operations
        // that bind more loosely than -.
        const [minuend, subtrahend] = this.ns;
        return `${minuend} - ${subtrahend!.parenOrUnparen(this.op)}`;
      }
      case Op.Mult:
        return this.ns.map(n => n.parenOrUnparen(this.op)).join(' * ');
      case Op.Div: {
        const [numerator, denominator] = this.ns;
        return `\\frac{${numerator}}{${denominator}}`;
      }
      case Op.Floor:
        return `floor(${this.ns[0]})`;
      case Op.Pow: {
        const [base, power] = this.ns;
        return `${base!.parenOrUnparen(this.op)} ^ {${power}}`;
      }
    }
  }

  override accept(rule: SimplificationRule) {
    const s = rule.visit(this);
    if (s) {
      // If the subtree rooted here has a match, we apply the rule and return.
      return s;
    }

    // Next, apply the rule to all subtrees underneath us.
    let anyUpdated = false;
    const operands = [];
    for (const n of this.ns) {
      const u = n.accept(rule);
      if (u != null) {
        operands.push(u);
        anyUpdated = true;
      } else {
        operands.push(n);
      }
    }
    if (!anyUpdated) {
      // If no subtree can be updated, return early.
      return null;
    }

    // Otherwise, return a new node with the subtrees, updated as appropriate.
    return new DerivedNum(this.op, ...operands);
  }

  override eqSubtree(other: NumBase) {
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

  assertLength(n: number) {
    if (this.ns.length !== n) {
      throw new Error(`Expected length of ${n} but found ${this.ns.length}`);
    }
  }

  computeValue(): ReturnType<typeof valueOf> {
    switch (this.op) {
      case Op.Plus:
        return Decimal.sum(...this.ns.map(n => n.value()));
      case Op.Minus:
        this.assertLength(2);
        return this.ns[0]!.value().sub(this.ns[1]!.value());
      case Op.Mult: {
        let result = this.ns[0]!.value();
        for (let i = 1; i < this.ns.length; ++i) {
          result = result.mul(this.ns[i]!.value());
        }
        return result;
      }
      case Op.Div:
        this.assertLength(2);
        return this.ns[0]!.value().div(this.ns[1]!.value());
      case Op.Floor:
        this.assertLength(1);
        return Decimal.floor(this.ns[0]!.value());
      case Op.Pow: {
        this.assertLength(2);
        return Decimal.pow(this.ns[0]!.value(), this.ns[1]!.value());
      }
    }
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

  override value() {
    return this.num.value();
  }

  override prettyPrint() {
    // If this gets called at top level, we'll print the whole derivation.
    // Otherwise, we only use the name associated with this output.
    return this.num.prettyPrint();
  }

  override accept(rule: SimplificationRule) {
    // Simplify the underlying subtree via this rule, if it matches.
    const simp = this.num.accept(rule);
    if (simp) {
      return new NamedOutput(this.name, simp);
    }
    return null;
  }

  override toString() {
    return this.name;
  }

  override eqSubtree(other: NumBase) {
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
