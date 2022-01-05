import {Literal, NamedConstant, NamedOutput, Num} from './num';

test('toString()', () => {
  expect(new Literal(1).toString()).toEqual('1');

  expect(new Literal(1).add(2).mul(3).toString()).toEqual('(1 + 2) * 3');
  expect(new Literal(1).add(new Literal(2).mul(3)).toString())
      .toEqual('1 + 2 * 3');

  expect(new Literal(1).add(2).add(3).toString()).toEqual('1 + 2 + 3');
  expect(new Literal(1).mul(2).mul(3).toString()).toEqual('1 * 2 * 3');

  expect(new Literal(1).sub(2).sub(3).toString()).toEqual('(1 - 2) - 3');
  expect(new Literal(1).sub(new Literal(2).sub(3)).toString())
      .toEqual('1 - (2 - 3)');

  expect(Num.sum(1, 2, 3).div(4).toString()).toEqual('(1 + 2 + 3) / 4');

  expect(new Literal(1).pow(new Literal(2).add(3)).toString())
      .toEqual('1 ^ (2 + 3)');
  expect(new Literal(1).add(new Literal(2).pow(3)).toString())
      .toEqual('1 + 2 ^ 3');

  expect(Num.floor(1.2).toString()).toEqual('floor(1.2)');
  expect(Num.floor(new Literal(1).add(2)).toString()).toEqual('floor(1 + 2)');

  expect(new Literal(1).div(2).div(3).toString()).toEqual('(1 / 2) / 3');
  expect(new Literal(1).mul(2).div(3).toString()).toEqual('(1 * 2) / 3');

  const out = new NamedOutput('outName', new Literal(1).add(2).add(3));
  expect(out.prettyPrint(false)).toEqual('1 + 2 + 3');
  expect(out.toString()).toEqual('outName');

  // Simplifying:

  expect(new Literal(0).add(2).mul(3).prettyPrint(true)).toEqual('2 * 3');
  expect(new Literal(0).add(new Literal(2).mul(3)).prettyPrint(true))
      .toEqual('2 * 3');

  expect(new Literal(1).add(2).mul(1).prettyPrint(true)).toEqual('1 + 2');
  expect(new Literal(1).add(new Literal(2).mul(1)).prettyPrint(true))
      .toEqual('1 + 2');

  const zero = new NamedConstant(0, 'zero');
  expect(zero.add(1).prettyPrint(false)).toEqual('zero + 1');
  expect(zero.add(1).prettyPrint(true)).toEqual('1');

  const one = new NamedConstant(1, 'one');
  expect(one.mul(2).prettyPrint(false)).toEqual('one * 2');
  expect(one.mul(2).prettyPrint(true)).toEqual('2');

  expect(new Literal(0).add(0).prettyPrint(false)).toEqual('0 + 0');
  expect(new Literal(0).add(0).prettyPrint(true)).toEqual('0');
  expect(new Literal(1).mul(1).prettyPrint(false)).toEqual('1 * 1');
  expect(new Literal(1).mul(1).prettyPrint(true)).toEqual('1');
});
