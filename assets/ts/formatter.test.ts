
/**
 * @jest-environment jsdom
 */
import {Formatter} from './formatter';

test('formatMonthNum', () => {
  const fmt = new Formatter(
      new Intl.NumberFormat(), new Intl.NumberFormat(), new Intl.NumberFormat(),
      new Intl.DateTimeFormat());
  expect(fmt.formatMonthNum(0)).toBe('0mo');
  expect(fmt.formatMonthNum(1)).toBe('1mo');
  expect(fmt.formatMonthNum(11)).toBe('11mo');
  expect(fmt.formatMonthNum(12)).toBe('1y');
  expect(fmt.formatMonthNum(14)).toBe('1y 2mo');
  expect(fmt.formatMonthNum(23)).toBe('1y 11mo');
  expect(fmt.formatMonthNum(24)).toBe('2y');
  expect(fmt.formatMonthNum(25)).toBe('2y 1mo');

  // Weird cases:
  expect(fmt.formatMonthNum(-2)).toBe('0mo');
  expect(fmt.formatMonthNum(Infinity)).toBe('forever');
  expect(fmt.formatMonthNum(-Infinity)).toBe('0mo');
  expect(fmt.formatMonthNum(NaN)).toBe('NaN');
  expect(fmt.formatMonthNum(-NaN)).toBe('NaN');
});