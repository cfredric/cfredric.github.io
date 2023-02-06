import * as fc from 'fast-check';

import {NamedConstant, NamedOutput, Num} from './num';

function expectExpression(
    n: Num, v: number, unsimplified: string, simplified: string) {
  expect({
    value: n.toNumber(),
    str: n.toString(),
    simplified: n.simplify().toString(),
  }).toEqual({
    value: v,
    str: unsimplified,
    simplified,
  });
}

test('toString()', () => {
  expectExpression(Num.literal(1), 1, '1', '1');

  expectExpression(Num.add(1, 2).mul(3), 9, '{(1 + 2)} * 3', '9');
  expectExpression(Num.add(1, Num.mul(2, 3)), 7, '1 + 2 * 3', '7');

  expectExpression(Num.add(1, 2).add(3), 6, '1 + 2 + 3', '6');
  expectExpression(Num.add(1, Num.add(2, 3)), 6, '1 + 2 + 3', '6');
  expectExpression(Num.mul(1, 2).mul(3), 6, '1 * 2 * 3', '6');
  expectExpression(Num.mul(1, Num.mul(2, 3)), 6, '1 * 2 * 3', '6');

  expectExpression(Num.sub(1, 2).sub(3), -4, '1 - 2 - 3', '-4');
  expectExpression(Num.sub(1, Num.sub(2, 3)), 2, '1 - {(2 - 3)}', '2');
  expectExpression(Num.add(1, 2).sub(3), 0, '1 + 2 - 3', '0');
  expectExpression(Num.add(1, Num.sub(2, 3)), 0, '1 + {(2 - 3)}', '0');

  expectExpression(Num.sub(1, 2).mul(3), -3, '{(1 - 2)} * 3', '-3');
  expectExpression(Num.sub(1, Num.mul(2, 3)), -5, '1 - 2 * 3', '-5');

  expectExpression(
      Num.sum(1, 2, 3).div(4), 6 / 4, '\\frac{1 + 2 + 3}{4}', '\\frac{3}{2}');

  expectExpression(Num.add(1, Num.pow(2, 3)), 9, '1 + 2 ^ {3}', '9');

  expectExpression(Num.floor(1.2), 1, 'floor(1.2)', 'floor(1.2)');
  expectExpression(Num.floor(Num.add(1, 2)), 3, 'floor(1 + 2)', 'floor(3)');

  expectExpression(
      Num.div(1, 2).div(3), 1 / 6, '\\frac{\\frac{1}{2}}{3}', '\\frac{1}{6}');
  expectExpression(
      Num.mul(1, 2).div(3), 2 / 3, '\\frac{1 * 2}{3}', '\\frac{2}{3}');

  const out = new NamedOutput('outName', Num.add(1, 2).add(3));
  expect(out.prettyPrint()).toEqual('1 + 2 + 3');
  expect(out.toString()).toEqual('outName');

  // Simplifying:

  expectExpression(Num.add(0, 2).mul(3), 6, '{(0 + 2)} * 3', '6');
  expectExpression(Num.add(0, Num.mul(2, 3)), 6, '0 + 2 * 3', '6');

  expectExpression(Num.add(1, 2).mul(1), 3, '{(1 + 2)} * 1', '3');
  expectExpression(Num.add(1, Num.mul(2, 1)), 3, '1 + 2 * 1', '3');

  const zero = new NamedConstant('zero', 0);
  expectExpression(zero.add(1), 1, 'zero + 1', 'zero + 1');

  const one = new NamedConstant('one', 1);
  expectExpression(one.mul(2), 2, 'one * 2', '2 * one');

  expectExpression(Num.add(0, 0), 0, '0 + 0', '0');
  expectExpression(Num.mul(1, 1), 1, '1 * 1', '1');

  const a = new NamedConstant('a', 2);
  const b = new NamedConstant('b', 3);
  const c = new NamedConstant('c', 5);
  const d = new NamedConstant('d', 7);
  const e = new NamedConstant('e', 11);
  // Denominator is a fraction: a / (c/d) == (a*d) / c
  expectExpression(
      a.div(c.div(d)), 14 / 5, '\\frac{a}{\\frac{c}{d}}', '\\frac{a * d}{c}');
  // Numerator is a fraction: (a/b) / d == a / (b * d).
  expectExpression(
      a.div(b).div(d), 2 / 21, '\\frac{\\frac{a}{b}}{d}', '\\frac{a}{b * d}');
  // Both numerator and denominator are fractions: (a/b) / (c/d) == (a*d) /
  // (b*c).
  expectExpression(
      a.div(b).div(c.div(d)), 14 / 15, '\\frac{\\frac{a}{b}}{\\frac{c}{d}}',
      '\\frac{a * d}{b * c}');

  // Multiplication is merged into the numerators/denominators.
  expectExpression(
      a.mul(c.div(d)), 10 / 7, 'a * \\frac{c}{d}', '\\frac{a * c}{d}');
  expectExpression(
      a.div(b).mul(e).mul(c.div(d)), 110 / 21,
      '\\frac{a}{b} * e * \\frac{c}{d}', '\\frac{a * c * e}{b * d}');


  // Elide useless subtrees.
  expectExpression(Num.add(1, zero), 1, '1 + zero', 'zero + 1');
  expectExpression(Num.add(1, Num.mul(1, 1)), 2, '1 + 1 * 1', '2');
  expectExpression(Num.add(1, Num.div(1, 1)), 2, '1 + \\frac{1}{1}', '2');
  expectExpression(Num.sum(zero, 0, 1), 1, 'zero + 0 + 1', 'zero + 1');
  expectExpression(
      Num.mul(3, Num.sum(zero, 0, 1)), 3, '3 * {(zero + 0 + 1)}',
      '3 * zero + 3');

  expectExpression(
      Num.div(1, Num.div(2, 3)), 3 / 2, '\\frac{1}{\\frac{2}{3}}',
      '\\frac{3}{2}');

  expectExpression(Num.add(2, 3).pow(4), 625, '{(2 + 3)} ^ {4}', '625');
  expectExpression(Num.mul(2, 3).pow(4), 1296, '{(2 * 3)} ^ {4}', '1296');
  expectExpression(Num.pow(2, Num.add(3, 4)), 128, '2 ^ {3 + 4}', '128');
  expectExpression(Num.pow(2, Num.mul(3, 4)), 4096, '2 ^ {3 * 4}', '4096');

  expectExpression(
      Num.product(a.add(b), c.add(d)), 60, '{(a + b)} * {(c + d)}',
      'a * c + a * d + b * c + b * d');
  expectExpression(
      Num.product(a.sub(b), c.sub(d)), 2, '{(a - b)} * {(c - d)}',
      'a * c - a * d - {(b * c - b * d)}');
});

test('simplify literals', () => {
  expectExpression(Num.add(0, 0), 0, '0 + 0', '0');  // + identity
  expectExpression(Num.add(1, 0), 1, '1 + 0', '1');  // + identity
  expectExpression(Num.add(0, 1), 1, '0 + 1', '1');  // + identity

  expectExpression(Num.sub(1, 0), 1, '1 - 0', '1');    // - identity
  expectExpression(Num.sub(0, 1), -1, '0 - 1', '-1');  // - from zero
  expectExpression(Num.sub(0, 2), -2, '0 - 2', '-2');  // - from zero
  expectExpression(Num.sub(2, 2), 0, '2 - 2', '0');    // - from self

  expectExpression(Num.mul(-1, 2), -2, '-1 * 2', '-2');  // negated literal
  expectExpression(Num.mul(2, -1), -2, '2 * -1', '-2');  // negated literal
  expectExpression(Num.mul(-1, -1), 1, '-1 * -1', '1');  // negated literal

  expectExpression(Num.mul(2, 0), 0, '2 * 0', '0');  // * collapse
  expectExpression(Num.mul(0, 2), 0, '0 * 2', '0');  // * collapse
  expectExpression(Num.mul(1, 2), 2, '1 * 2', '2');  // * identity
  expectExpression(Num.mul(1, 1), 1, '1 * 1', '1');  // * identity
  expectExpression(Num.mul(2, 1), 2, '2 * 1', '2');  // * identity

  expectExpression(Num.div(2, 1), 2, '\\frac{2}{1}', '2');  // / identity
  expectExpression(Num.div(0, 2), 0, '\\frac{0}{2}', '0');  // / collapse
  expectExpression(
      Num.div(2, 2), 1, '\\frac{2}{2}',
      '1');  // / reduction: completely reduce both numerator and denominator.
  expectExpression(
      Num.mul(2, 3).div(2), 3, '\\frac{2 * 3}{2}',
      '3');  // / reduction: completely reduce the denominator.
  expectExpression(
      Num.div(2, Num.mul(4, 2)), 1 / 4, '\\frac{2}{4 * 2}',
      '\\frac{1}{4}');  // completely reduce the numerator.
  expectExpression(
      Num.mul(2, 3).div(Num.mul(4, 2)), 3 / 4, '\\frac{2 * 3}{4 * 2}',
      '\\frac{3}{4}');  // some of both numerator and denominator remain.
  expectExpression(Num.div(0, 0), NaN, '\\frac{0}{0}', 'NaN');  // / collapse
  expectExpression(
      Num.div(-1, 0), -Infinity, '\\frac{-1}{0}',
      '-Infinity');  // / by zero
  expectExpression(
      Num.div(Num.div(0, 0), 0), NaN, '\\frac{\\frac{0}{0}}{0}',
      'NaN');  // / by zero
  expectExpression(
      Num.div(3, Num.div(Num.mul(1, 0), 2)), Infinity,
      '\\frac{3}{\\frac{1 * 0}{2}}',
      'Infinity');  // / by zero

  // division by fraction
  expectExpression(
      Num.div(2, Num.div(3, 5)), 10 / 3, '\\frac{2}{\\frac{3}{5}}',
      '\\frac{10}{3}');
  // division by product involving a fraction
  expectExpression(
      Num.div(2, Num.mul(3, Num.div(5, 7))), 14 / 15,
      '\\frac{2}{3 * \\frac{5}{7}}', '\\frac{14}{15}');

  expectExpression(Num.pow(2, 1), 2, '2 ^ {1}', '2');  // ^ identity
  expectExpression(Num.pow(0, 2), 0, '0 ^ {2}', '0');  // ^ collapse
  expectExpression(Num.pow(2, 0), 1, '2 ^ {0}', '1');  // ^ collapse
  expectExpression(Num.pow(0, 0), 1, '0 ^ {0}', '1');  // ^ collapse
  expectExpression(Num.pow(1, 2), 1, '1 ^ {2}', '1');  // ^ collapse
  expectExpression(
      Num.pow(2, 3).mul(Num.pow(2, 2)), 32, '2 ^ {3} * 2 ^ {2}',
      '32');  // ^ condensing

  // 0 * (0 / 0) is weird because it should be NaN, but the simplifications
  // might choose to evaluate the `0 * x` perspective first, which would lead to
  // `0`. The same problem exists with other operators that can "collapse" an
  // expression and eliminate things that ought to introduce NaN.
  expectExpression(Num.mul(0, Num.div(0, 0)), NaN, '0 * \\frac{0}{0}', 'NaN');
  expectExpression(
      Num.sub(Num.div(0, 0), Num.div(0, 0)), NaN, '\\frac{0}{0} - \\frac{0}{0}',
      'NaN');
  expectExpression(
      Num.div(Num.mul(3, Num.div(0, 0)), Num.div(0, 0)), NaN,
      '\\frac{3 * \\frac{0}{0}}{\\frac{0}{0}}', 'NaN');
  expectExpression(
      Num.mul(3, Num.div(Num.div(0, 0), Num.div(0, 0))), NaN,
      '3 * \\frac{\\frac{0}{0}}{\\frac{0}{0}}', 'NaN');
  expectExpression(Num.pow(3, Num.div(0, 0)), NaN, '3 ^ {\\frac{0}{0}}', 'NaN');

  expectExpression(Num.sum(3, NaN, 4), NaN, '3 + NaN + 4', 'NaN');
  expectExpression(Num.sub(3, NaN), NaN, '3 - NaN', 'NaN');
  expectExpression(Num.sub(NaN, 3), NaN, 'NaN - 3', 'NaN');
  expectExpression(Num.mul(3, NaN), NaN, '3 * NaN', 'NaN');
  expectExpression(Num.div(NaN, 3), NaN, '\\frac{NaN}{3}', 'NaN');
  expectExpression(Num.div(3, NaN), NaN, '\\frac{3}{NaN}', 'NaN');
  expectExpression(Num.pow(3, NaN), NaN, '3 ^ {NaN}', 'NaN');
  expectExpression(Num.pow(NaN, 3), NaN, 'NaN ^ {3}', 'NaN');
});

test('simplifyWithNamedConstants', () => {
  const a = new NamedConstant('a', 2);
  const b = new NamedConstant('b', 4);
  const c = new NamedConstant('c', 8);
  const d = new NamedConstant('d', 16);
  const x = new NamedConstant('x', 0);
  const y = new NamedConstant('y', -2);
  expectExpression(a.add(0), 2, 'a + 0', 'a');           // + identity
  expectExpression(Num.add(0, a), 2, '0 + a', 'a');      // + identity
  expectExpression(Num.sum(2, a), 4, '2 + a', 'a + 2');  // * ordering
  expectExpression(Num.sum(a, 2), 4, 'a + 2', 'a + 2');  // * ordering

  expectExpression(a.sub(0), 2, 'a - 0', 'a');             // - identity
  expectExpression(Num.sub(0, a), -2, '0 - a', '-1 * a');  // - from zero
  expectExpression(a.sub(a), 0, 'a - a', '0');             // - from self

  expectExpression(a.mul(0), 0, 'a * 0', '0');               // * collapse
  expectExpression(Num.mul(0, a), 0, '0 * a', '0');          // * collapse
  expectExpression(Num.mul(1, a), 2, '1 * a', 'a');          // * identity
  expectExpression(a.mul(1), 2, 'a * 1', 'a');               // * identity
  expectExpression(Num.product(2, a), 4, '2 * a', '2 * a');  // * ordering
  expectExpression(Num.product(a, 2), 4, 'a * 2', '2 * a');  // * ordering

  expectExpression(a.div(1), 2, '\\frac{a}{1}', 'a');       // / identity
  expectExpression(Num.div(0, a), 0, '\\frac{0}{a}', '0');  // / collapse
  expectExpression(
      a.div(a), 1, '\\frac{a}{a}',
      '1');  // / reduction: completely reduce both numerator and denominator.
  expectExpression(
      a.mul(b).div(a), 4, '\\frac{a * b}{a}',
      'b');  // / reduction: completely reduce the denominator.
  expectExpression(
      a.div(b.mul(a)), 1 / 4, '\\frac{a}{b * a}',
      '\\frac{1}{b}');  // completely reduce the numerator.
  expectExpression(
      a.mul(b).div(c.mul(a)), 1 / 2, '\\frac{a * b}{c * a}',
      '\\frac{b}{c}');  // some of both numerator and denominator remain.
  expectExpression(
      Num.div(y, 0), -Infinity, '\\frac{y}{0}',
      '\\frac{y}{0}');  // / by zero
  expectExpression(
      Num.div(Num.div(x, 0), 0), NaN, '\\frac{\\frac{x}{0}}{0}',
      '\\frac{x}{0}');  // / by zero
  expectExpression(
      Num.div(3, Num.div(Num.mul(1, x), 2)), Infinity,
      '\\frac{3}{\\frac{1 * x}{2}}',
      '\\frac{6}{x}');  // / by zero

  // division by fraction
  expectExpression(
      a.div(b.div(c)), 4, '\\frac{a}{\\frac{b}{c}}', '\\frac{a * c}{b}');
  // division by product involving a fraction
  expectExpression(
      a.div(b.mul(c.div(d))), 1, '\\frac{a}{b * \\frac{c}{d}}',
      '\\frac{a * d}{b * c}');

  expectExpression(a.pow(1), 2, 'a ^ {1}', 'a');       // ^ identity
  expectExpression(Num.pow(0, a), 0, '0 ^ {a}', '0');  // ^ collapse
  expectExpression(a.pow(0), 1, 'a ^ {0}', '1');       // ^ collapse
  expectExpression(Num.pow(1, a), 1, '1 ^ {a}', '1');  // ^ collapse
  expectExpression(
      a.pow(b).mul(a.pow(c)), 4096, 'a ^ {b} * a ^ {c}',
      'a ^ {b + c}');  // ^ condensing
});

test('Sum', () => {
  expect(Num.sum(1, 2, 4).toNumber()).toEqual(7);
});

// No simplifcations involve floor, so we don't bother to generate expressions
// involving floors.
export enum BinaryOp {
  Plus,
  Minus,
  Mult,
  Div,
  Pow,
}

const boundedInt = fc.integer({min: -20, max: 20});

const {expr} = fc.letrec(
    (tie) => ({
      expr: fc.oneof(
                  {depthSize: 'small'}, tie('namedConstant'), tie('literal'),
                  tie('binaryExpr'))
                .map((e) => e as Num),
      namedConstant:
          fc.record({name: fc.lorem({maxCount: 1}), value: boundedInt})
              .map(({name,
                     value}) => new NamedConstant(`${name}: ${value}`, value)),
      literal: boundedInt.map((l) => Num.literal(l)),
      binaryExpr:
          fc.record({
              op: fc.constantFrom(
                  BinaryOp.Plus, BinaryOp.Minus, BinaryOp.Mult, BinaryOp.Div),
              left: tie('expr') as fc.Arbitrary<Num>,
              right: tie('expr') as fc.Arbitrary<Num>,
            }).map(({op, left, right}) => {
            switch (op) {
              case BinaryOp.Plus:
                return Num.add(left, right);
              case BinaryOp.Minus:
                return Num.sub(left, right);
              case BinaryOp.Mult:
                return Num.mul(left, right);
              case BinaryOp.Div:
                return Num.div(left, right);
              case BinaryOp.Pow:
                return Num.pow(left, right);
            }
          }),
    }));

test('simplify doesn\'t change value', () => {
  fc.assert(fc.property(expr, fc.context(), (e, ctx) => {
    ctx.log(`${e} ==> ${e.simplify()}`);

    const originalValue = e.toNumber();
    const simplifiedValue = e.simplify().toNumber();
    expect(e.toNumber()).toEqual(originalValue);

    if (originalValue == 0) {
      // Have to assert this separately, since 0 and -0 are considered
      // distinct by jest, even though they are == to each other.
      expect(simplifiedValue == originalValue).toBe(true);
    } else if (!Number.isFinite(originalValue)) {
      if (Number.isNaN(originalValue)) {
        expect(simplifiedValue).toEqual(originalValue);
      } else {
        // Expressions like `1 / (0 * -1)` can arguably be simplified to `1 / 0`
        // which has value Infinity, while the original has value -Infinity.
        // We're going to ignore sign issues due to manipulating infinity, since
        // weird stuff happens.
        expect(Number.isFinite(simplifiedValue)).toBe(false);
      }
    } else {
      expect(simplifiedValue).toEqual(originalValue);
    }
  }), {verbose: true});
});