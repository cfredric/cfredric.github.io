import {NamedConstant, NamedOutput, Num} from './num';

function expectExpression(
    n: Num, v: number, unsimplified: string, simplified: string) {
  expect(n.toNumber()).toEqual(v);
  expect(n.toString()).toEqual(unsimplified);
  expect(n.simplify().toString()).toEqual(simplified);
}

test('toString()', () => {
  expectExpression(Num.literal(1), 1, '1', '1');

  expectExpression(Num.literal(1).add(2).mul(3), 9, '{(1 + 2)} * 3', '9');
  expectExpression(
      Num.literal(1).add(Num.literal(2).mul(3)), 7, '1 + 2 * 3', '7');

  expectExpression(Num.literal(1).add(2).add(3), 6, '1 + 2 + 3', '6');
  expectExpression(
      Num.literal(1).add(Num.literal(2).add(3)), 6, '1 + 2 + 3', '6');
  expectExpression(Num.literal(1).mul(2).mul(3), 6, '1 * 2 * 3', '6');
  expectExpression(
      Num.literal(1).mul(Num.literal(2).mul(3)), 6, '1 * 2 * 3', '6');

  expectExpression(Num.literal(1).sub(2).sub(3), -4, '1 - 2 - 3', '-4');
  expectExpression(
      Num.literal(1).sub(Num.literal(2).sub(3)), 2, '1 - {(2 - 3)}', '2');
  expectExpression(Num.literal(1).add(2).sub(3), 0, '1 + 2 - 3', '0');
  expectExpression(
      Num.literal(1).add(Num.literal(2).sub(3)), 0, '1 + {(2 - 3)}', '0');

  expectExpression(Num.literal(1).sub(2).mul(3), -3, '{(1 - 2)} * 3', '-3');
  expectExpression(
      Num.literal(1).sub(Num.literal(2).mul(3)), -5, '1 - 2 * 3', '-5');

  expectExpression(
      Num.sum(1, 2, 3).div(4), 6 / 4, '\\frac{1 + 2 + 3}{4}', '\\frac{3}{2}');

  expectExpression(
      Num.literal(1).pow(Num.literal(2).add(3)), 1, '1 ^ {2 + 3}', '1');
  expectExpression(
      Num.literal(1).add(Num.literal(2).pow(3)), 9, '1 + 2 ^ {3}', '9');

  expectExpression(Num.floor(1.2), 1, 'floor(1.2)', 'floor(1.2)');
  expectExpression(
      Num.floor(Num.literal(1).add(2)), 3, 'floor(1 + 2)', 'floor(3)');

  expectExpression(
      Num.literal(1).div(2).div(3), 1 / 6, '\\frac{\\frac{1}{2}}{3}',
      '\\frac{1}{6}');
  expectExpression(
      Num.literal(1).mul(2).div(3), 2 / 3, '\\frac{1 * 2}{3}', '\\frac{2}{3}');

  const out = new NamedOutput('outName', Num.literal(1).add(2).add(3));
  expect(out.prettyPrint()).toEqual('1 + 2 + 3');
  expect(out.toString()).toEqual('outName');

  // Simplifying:

  expectExpression(Num.literal(0).add(2).mul(3), 6, '{(0 + 2)} * 3', '6');
  expectExpression(
      Num.literal(0).add(Num.literal(2).mul(3)), 6, '0 + 2 * 3', '6');

  expectExpression(Num.literal(1).add(2).mul(1), 3, '{(1 + 2)} * 1', '3');
  expectExpression(
      Num.literal(1).add(Num.literal(2).mul(1)), 3, '1 + 2 * 1', '3');

  const zero = new NamedConstant('zero', 0);
  expectExpression(zero.add(1), 1, 'zero + 1', '1');

  const one = new NamedConstant('one', 1);
  expectExpression(one.mul(2), 2, 'one * 2', '2');

  expectExpression(Num.literal(0).add(0), 0, '0 + 0', '0');
  expectExpression(Num.literal(1).mul(1), 1, '1 * 1', '1');

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
      '\\frac{a}{b} * e * \\frac{c}{d}', '\\frac{a * e * c}{b * d}');


  // Elide useless subtrees.
  expectExpression(Num.literal(1).add(zero), 1, '1 + zero', '1');
  expectExpression(
      Num.literal(1).add(Num.literal(1).mul(Num.literal(1))), 2, '1 + 1 * 1',
      '2');
  expectExpression(
      Num.literal(1).add(Num.literal(1).div(Num.literal(1))), 2,
      '1 + \\frac{1}{1}', '2');
  expectExpression(
      Num.sum(zero, Num.literal(0), Num.literal(1)), 1, 'zero + 0 + 1', '1');
  expectExpression(
      Num.literal(3).mul(Num.sum(zero, Num.literal(0), Num.literal(1))), 3,
      '3 * {(zero + 0 + 1)}', '3');

  expectExpression(
      Num.literal(1).div(Num.literal(2).div(3)), 3 / 2,
      '\\frac{1}{\\frac{2}{3}}', '\\frac{3}{2}');

  expectExpression(Num.literal(2).add(3).pow(4), 625, '{(2 + 3)} ^ {4}', '625');
  expectExpression(
      Num.literal(2).mul(3).pow(4), 1296, '{(2 * 3)} ^ {4}', '1296');
  expectExpression(
      Num.literal(2).pow(Num.literal(3).add(4)), 128, '2 ^ {3 + 4}', '128');
  expectExpression(
      Num.literal(2).pow(Num.literal(3).mul(4)), 4096, '2 ^ {3 * 4}', '4096');
});

test('simplify', () => {
  expectExpression(Num.literal(0).add(0), 0, '0 + 0', '0');  // + identity
  expectExpression(Num.literal(1).add(0), 1, '1 + 0', '1');  // + identity
  expectExpression(Num.literal(0).add(1), 1, '0 + 1', '1');  // + identity

  expectExpression(Num.literal(1).sub(0), 1, '1 - 0', '1');    // - identity
  expectExpression(Num.literal(0).sub(1), -1, '0 - 1', '-1');  // - from zero
  expectExpression(Num.literal(0).sub(2), -2, '0 - 2', '-2');  // - from zero
  expectExpression(Num.literal(2).sub(2), 0, '2 - 2', '0');    // - from self

  expectExpression(
      Num.literal(-1).mul(2), -2, '-1 * 2', '-2');  // negated literal
  expectExpression(
      Num.literal(2).mul(-1), -2, '2 * -1', '-2');  // negated literal
  expectExpression(
      Num.literal(-1).mul(-1), 1, '-1 * -1', '1');  // negated literal

  expectExpression(Num.literal(2).mul(0), 0, '2 * 0', '0');  // * collapse
  expectExpression(Num.literal(0).mul(2), 0, '0 * 2', '0');  // * collapse
  expectExpression(Num.literal(1).mul(2), 2, '1 * 2', '2');  // * identity
  expectExpression(Num.literal(1).mul(1), 1, '1 * 1', '1');  // * identity
  expectExpression(Num.literal(2).mul(1), 2, '2 * 1', '2');  // * identity

  expectExpression(
      Num.literal(2).div(1), 2, '\\frac{2}{1}', '2');  // / identity
  expectExpression(
      Num.literal(0).div(2), 0, '\\frac{0}{2}', '0');  // / collapse
  expectExpression(
      Num.literal(2).div(2), 1, '\\frac{2}{2}',
      '1');  // / reduction: completely reduce both numerator and denominator.
  expectExpression(
      Num.literal(2).mul(3).div(2), 3, '\\frac{2 * 3}{2}',
      '3');  // / reduction: completely reduce the denominator.
  expectExpression(
      Num.literal(2).div(Num.literal(4).mul(2)), 1 / 4, '\\frac{2}{4 * 2}',
      '\\frac{1}{4}');  // completely reduce the numerator.
  expectExpression(
      Num.literal(2).mul(3).div(Num.literal(4).mul(2)), 3 / 4,
      '\\frac{2 * 3}{4 * 2}',
      '\\frac{3}{4}');  // some of both numerator and denominator remain.

  // division by fraction
  expectExpression(
      Num.literal(2).div(Num.literal(3).div(5)), 10 / 3,
      '\\frac{2}{\\frac{3}{5}}', '\\frac{10}{3}');
  // division by product involving a fraction
  expectExpression(
      Num.literal(2).div(Num.literal(3).mul(Num.literal(5).div(7))), 14 / 15,
      '\\frac{2}{3 * \\frac{5}{7}}', '\\frac{14}{15}');

  expectExpression(Num.literal(2).pow(1), 2, '2 ^ {1}', '2');  // ^ identity
  expectExpression(Num.literal(0).pow(2), 0, '0 ^ {2}', '0');  // ^ collapse
  expectExpression(Num.literal(2).pow(0), 1, '2 ^ {0}', '1');  // ^ collapse
  expectExpression(Num.literal(0).pow(0), 1, '0 ^ {0}', '1');  // ^ collapse
  expectExpression(Num.literal(1).pow(2), 1, '1 ^ {2}', '1');  // ^ collapse
  expectExpression(
      Num.literal(2).pow(3).mul(Num.literal(2).pow(2)), 32, '2 ^ {3} * 2 ^ {2}',
      '32');  // ^ condensing
});

test('simplifyWithNamedConstants', () => {
  const a = new NamedConstant('a', 2);
  const b = new NamedConstant('b', 4);
  const c = new NamedConstant('c', 8);
  const d = new NamedConstant('d', 16);
  expectExpression(a.add(0), 2, 'a + 0', 'a');               // + identity
  expectExpression(Num.literal(0).add(a), 2, '0 + a', 'a');  // + identity

  expectExpression(a.sub(0), 2, 'a - 0', 'a');  // - identity
  expectExpression(
      Num.literal(0).sub(a), -2, '0 - a', '-1 * a');  // - from zero
  expectExpression(a.sub(a), 0, 'a - a', '0');        // - from self

  expectExpression(a.mul(0), 0, 'a * 0', '0');               // * collapse
  expectExpression(Num.literal(0).mul(a), 0, '0 * a', '0');  // * collapse
  expectExpression(Num.literal(1).mul(a), 2, '1 * a', 'a');  // * identity
  expectExpression(a.mul(1), 2, 'a * 1', 'a');               // * identity

  expectExpression(a.div(1), 2, '\\frac{a}{1}', 'a');  // / identity
  expectExpression(
      Num.literal(0).div(a), 0, '\\frac{0}{a}', '0');  // / collapse
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

  // division by fraction
  expectExpression(
      a.div(b.div(c)), 4, '\\frac{a}{\\frac{b}{c}}', '\\frac{a * c}{b}');
  // division by product involving a fraction
  expectExpression(
      a.div(b.mul(c.div(d))), 1, '\\frac{a}{b * \\frac{c}{d}}',
      '\\frac{a * d}{b * c}');

  expectExpression(a.pow(1), 2, 'a ^ {1}', 'a');               // ^ identity
  expectExpression(Num.literal(0).pow(a), 0, '0 ^ {a}', '0');  // ^ collapse
  expectExpression(a.pow(0), 1, 'a ^ {0}', '1');               // ^ collapse
  expectExpression(Num.literal(1).pow(a), 1, '1 ^ {a}', '1');  // ^ collapse
  expectExpression(
      a.pow(3).mul(a.pow(2)), 32, 'a ^ {3} * a ^ {2}',
      'a ^ {5}');  // ^ condensing
});

test('Sum', () => {
  expect(Num.sum(1, 2, 4).toNumber()).toEqual(7);
});