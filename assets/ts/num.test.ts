import {NamedConstant, NamedOutput, Num} from './num';

test('toString()', () => {
  expect(Num.literal(1).toString()).toEqual('1');

  expect(Num.literal(1).add(2).mul(3).toString()).toEqual('{(1 + 2)} * 3');
  expect(Num.literal(1).add(Num.literal(2).mul(3)).toString())
      .toEqual('1 + 2 * 3');

  expect(Num.literal(1).add(2).add(3).toString()).toEqual('1 + 2 + 3');
  expect(Num.literal(1).mul(2).mul(3).toString()).toEqual('1 * 2 * 3');

  expect(Num.literal(1).sub(2).sub(3).toString()).toEqual('1 - 2 - 3');
  expect(Num.literal(1).sub(Num.literal(2).sub(3)).toString())
      .toEqual('1 - {(2 - 3)}');

  expect(Num.literal(1).sub(2).mul(3).toString()).toEqual('{(1 - 2)} * 3');
  expect(Num.literal(1).sub(Num.literal(2).mul(3)).toString())
      .toEqual('1 - 2 * 3');

  expect(Num.sum(1, 2, 3).div(4).toString()).toEqual('\\frac{1 + 2 + 3}{4}');

  expect(Num.literal(1).pow(Num.literal(2).add(3)).toString())
      .toEqual('{1} ^ {2 + 3}');
  expect(Num.literal(1).add(Num.literal(2).pow(3)).toString())
      .toEqual('1 + {2} ^ {3}');

  expect(Num.floor(1.2).toString()).toEqual('floor(1.2)');
  expect(Num.floor(Num.literal(1).add(2)).toString()).toEqual('floor(1 + 2)');

  expect(Num.literal(1).div(2).div(3).toString()).toEqual('\\frac{1}{2 * 3}');
  expect(Num.literal(1).mul(2).div(3).toString()).toEqual('\\frac{1 * 2}{3}');

  const out = new NamedOutput('outName', Num.literal(1).add(2).add(3));
  expect(out.prettyPrint(false)).toEqual('1 + 2 + 3');
  expect(out.toString()).toEqual('outName');

  // Simplifying:

  expect(Num.literal(0).add(2).mul(3).prettyPrint(true)).toEqual('2 * 3');
  expect(Num.literal(0).add(Num.literal(2).mul(3)).prettyPrint(true))
      .toEqual('2 * 3');

  expect(Num.literal(1).add(2).mul(1).prettyPrint(true)).toEqual('1 + 2');
  expect(Num.literal(1).add(Num.literal(2).mul(1)).prettyPrint(true))
      .toEqual('1 + 2');

  const zero = new NamedConstant('zero', 0);
  expect(zero.add(1).prettyPrint(false)).toEqual('zero + 1');
  expect(zero.add(1).prettyPrint(true)).toEqual('1');

  const one = new NamedConstant('one', 1);
  expect(one.mul(2).prettyPrint(false)).toEqual('one * 2');
  expect(one.mul(2).prettyPrint(true)).toEqual('2');

  expect(Num.literal(0).add(0).prettyPrint(false)).toEqual('0 + 0');
  expect(Num.literal(0).add(0).prettyPrint(true)).toEqual('0');
  expect(Num.literal(1).mul(1).prettyPrint(false)).toEqual('1 * 1');
  expect(Num.literal(1).mul(1).prettyPrint(true)).toEqual('1');

  const a = new NamedConstant('a', 2);
  const b = new NamedConstant('b', 3);
  const c = new NamedConstant('c', 5);
  const d = new NamedConstant('d', 7);
  // Denominator is a fraction: a / (c/d) == (a*d) / c
  expect(a.div(c.div(d)).prettyPrint(false)).toEqual('\\frac{a * d}{c}');
  // Numerator is a fraction: (a/b) / d == a / (b * d).
  expect(a.div(b).div(d).prettyPrint(false)).toEqual('\\frac{a}{b * d}');
  // Both numerator and denominator are fractions: (a/b) / (c/d) == (a*d) /
  // (b*c).
  expect(a.div(b).div(c.div(d)).prettyPrint(false))
      .toEqual('\\frac{a * d}{b * c}');

  // Multiplication is merged into the numerators/denominators.
  expect(a.mul(c.div(d)).prettyPrint(false)).toEqual('\\frac{a * c}{d}');
  expect(a.div(b).mul(c.div(d)).prettyPrint(false))
      .toEqual('\\frac{a * c}{b * d}');


  // Elide useless subtrees.
  expect(Num.literal(1).add(zero).prettyPrint(false)).toEqual('1 + zero');
  expect(Num.literal(1).add(zero).prettyPrint(true)).toEqual('1');
  expect(
      Num.literal(1).add(Num.literal(1).mul(Num.literal(1))).prettyPrint(false))
      .toEqual('1 + 1 * 1');
  expect(
      Num.literal(1).add(Num.literal(1).mul(Num.literal(1))).prettyPrint(true))
      .toEqual('1 + 1');
  expect(
      Num.literal(1).add(Num.literal(1).div(Num.literal(1))).prettyPrint(false))
      .toEqual('1 + \\frac{1}{1}');
  expect(
      Num.literal(1).add(Num.literal(1).div(Num.literal(1))).prettyPrint(true))
      .toEqual('1 + 1');
  expect(Num.sum(zero, Num.literal(0), Num.literal(1)).prettyPrint(true))
      .toEqual('1');
  expect(Num.literal(3)
             .mul(Num.sum(zero, Num.literal(0), Num.literal(1)))
             .prettyPrint(true))
      .toEqual('3');

  expect(
      Num.literal(1).div(Num.literal(2).div(Num.literal(3))).prettyPrint(false))
      .toEqual('\\frac{1 * 3}{2}');
  expect(
      Num.literal(1).div(Num.literal(2).div(Num.literal(3))).prettyPrint(true))
      .toEqual('\\frac{3}{2}');
});

test('Sum', () => {
  expect(Num.sum(1, 2, 4).toNumber()).toEqual(7);
});