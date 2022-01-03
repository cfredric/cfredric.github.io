/**
 * @jest-environment jsdom
 */

 import {Literal, Num} from './num';

test('toString()', () => {
  expect(new Literal(1).add(2).mul(3).toString()).toBe('(1 + 2) * 3');
  expect(new Literal(1).add(new Literal(2).mul(3)).toString()).toBe('1 + 2 * 3');

  expect(new Literal(1).sub(2).sub(3).toString()).toBe('(1 - 2) - 3');
  expect(new Literal(1).sub(new Literal(2).sub(3)).toString()).toEqual('1 - (2 - 3)');

    expect(Num.sum(1, 2, 3).div(4).toString()).toEqual('(1 + 2 + 3) / 4');
});