/**
 * @jest-environment jsdom
 */

import {Literal, NamedOutput, Num} from './num';

test('toString()', () => {
  expect(new Literal(1).add(2).mul(3).toString()).toBe('(1 + 2) * 3');
  expect(new Literal(1).add(new Literal(2).mul(3)).toString())
      .toBe('1 + 2 * 3');

  expect(new Literal(1).add(2).add(3).toString()).toBe('1 + 2 + 3');
  expect(new Literal(1).mul(2).mul(3).toString()).toBe('1 * 2 * 3');

  expect(new Literal(1).sub(2).sub(3).toString()).toBe('(1 - 2) - 3');
  expect(new Literal(1).sub(new Literal(2).sub(3)).toString())
      .toEqual('1 - (2 - 3)');

  expect(Num.sum(1, 2, 3).div(4).toString()).toEqual('(1 + 2 + 3) / 4');

  expect(new Literal(1).pow(new Literal(2).add(3)).toString())
      .toEqual('1 ^ (2 + 3)');
  expect(new Literal(1).add(new Literal(2).pow(3)).toString())
      .toEqual('1 + 2 ^ 3');

  expect(Num.floor(1.2).toString()).toEqual('floor(1.2)');
  expect(Num.floor(new Literal(1).add(2)).toString()).toEqual('floor(1 + 2)');

  expect(new Literal(1).div(2).div(3).toString()).toBe('(1 / 2) / 3');
  expect(new Literal(1).mul(2).div(3).toString()).toBe('(1 * 2) / 3');

  const out = new NamedOutput('outName', new Literal(1).add(2).add(3));
  expect(out.prettyPrint()).toEqual('1 + 2 + 3');
  expect(out.toString()).toEqual('outName');
});