/**
 * @jest-environment jsdom
 */

import * as d3 from 'd3';
import {Decimal} from 'decimal.js';

import * as utils from './utils';

test('countSatisfying no matches', () => {
  expect(utils.countSatisfying(new Array(10).fill(false), x => x)).toBe(0);
});

test('countSatisfying basic', () => {
  expect(utils.countSatisfying(d3.range(10), x => x % 3 == 0)).toBe(4);
});

test('orZero basic', () => {
  const elt = document.createElement('input');
  elt.value = '0';
  expect(utils.orZero(elt)).toStrictEqual(new Decimal(0));

  elt.value = '723';
  expect(utils.orZero(elt)).toStrictEqual(new Decimal(723));

  elt.value = 'foo';
  expect(utils.orZero(elt)).toStrictEqual(new Decimal(0));
});

test('monthDiff', () => {
  expect(utils.computeMonthDiff(new Date(2021, 4, 5), new Date(2021, 3, 1)))
      .toBe(0);

  expect(utils.computeMonthDiff(new Date(2021, 4, 5), new Date(2021, 4, 1)))
      .toBe(0);
  expect(utils.computeMonthDiff(new Date(2021, 4, 1), new Date(2021, 4, 31)))
      .toBe(0);

  expect(utils.computeMonthDiff(new Date(2021, 4, 5), new Date(2021, 5, 1)))
      .toBe(1);
  expect(utils.computeMonthDiff(new Date(2021, 4, 5), new Date(2021, 6, 1)))
      .toBe(2);
  expect(utils.computeMonthDiff(new Date(2021, 4, 5), new Date(2021, 7, 1)))
      .toBe(3);

  expect(utils.computeMonthDiff(new Date(2021, 4, 5), new Date(2022, 4, 1)))
      .toBe(12);

  expect(utils.computeMonthDiff(new Date(2021, 4, 1), new Date(2021, 5, 1)))
      .toBe(1);
  expect(utils.computeMonthDiff(new Date(2021, 4, 1), new Date(2021, 6, 1)))
      .toBe(2);
  expect(utils.computeMonthDiff(new Date(2021, 4, 1), new Date(2021, 7, 1)))
      .toBe(3);

  expect(utils.computeMonthDiff(new Date(2021, 4, 1), new Date(2022, 4, 1)))
      .toBe(12);
});

test('cumulativeSumByFields', () => {
  expect(utils.cumulativeSumByFields(
             [
               {
                 month: 1,
                 data: {
                   'principal': new Decimal(1),
                   'interest': new Decimal(0),
                   'hoa': new Decimal(0),
                   'property_tax': new Decimal(0),
                   'pmi': new Decimal(0),
                   'homeowners_insurance': new Decimal(0),
                 },
               },
               {
                 month: 2,
                 data: {
                   'principal': new Decimal(2),
                   'interest': new Decimal(0),
                   'hoa': new Decimal(0),
                   'property_tax': new Decimal(0),
                   'pmi': new Decimal(0),
                   'homeowners_insurance': new Decimal(0),
                 },
               },
               {
                 month: 3,
                 data: {
                   'principal': new Decimal(4),
                   'interest': new Decimal(0),
                   'hoa': new Decimal(0),
                   'property_tax': new Decimal(0),
                   'pmi': new Decimal(0),
                   'homeowners_insurance': new Decimal(0),
                 },
               },
             ],
             ['principal']))
      .toStrictEqual([
        {
          month: 0,
          data: {
            'principal': new Decimal(0),
          },
        },
        {
          month: 1,
          data: {
            'principal': new Decimal(1),
          },
        },
        {
          month: 2,
          data: {
            'principal': new Decimal(3),
          },
        },
        {
          month: 3,
          data: {
            'principal': new Decimal(7),
          },
        },
      ]);
});

test('countBurndownMonths', () => {
  // Can handle an empty schedule slice.
  expect(utils.countBurndownMonths(new Decimal(50), [], new Decimal(10)))
      .toBe(5);

  // Can handle an empty schedule slice and no monthly debts.
  expect(utils.countBurndownMonths(new Decimal(50), [], new Decimal(0)))
      .toBe(Infinity);

  // Can pay off full loan, no recurring debts, no non-loan payments.
  expect(utils.countBurndownMonths(
             new Decimal(100),
             [
               {
                 'principal': new Decimal(99),
                 'interest': new Decimal(0),
                 'hoa': new Decimal(0),
                 'property_tax': new Decimal(0),
                 'pmi': new Decimal(0),
                 'homeowners_insurance': new Decimal(0),
               },
             ],
             new Decimal(0)))
      .toBe(Infinity);

  // Can pay off full loan, no recurring debts, but some non-loan payments.
  expect(utils.countBurndownMonths(
             new Decimal(100),
             [
               {
                 'principal': new Decimal(95),
                 'interest': new Decimal(0),
                 'hoa': new Decimal(1),
                 'property_tax': new Decimal(0),
                 'pmi': new Decimal(0),
                 'homeowners_insurance': new Decimal(0),
               },
             ],
             new Decimal(0)))
      .toBe(5);

  // Can't pay off full loan; no recurring debts; some non-loan payments.
  expect(utils.countBurndownMonths(
             new Decimal(100),
             [
               {
                 'principal': new Decimal(95),
                 'interest': new Decimal(0),
                 'hoa': new Decimal(1),
                 'property_tax': new Decimal(0),
                 'pmi': new Decimal(0),
                 'homeowners_insurance': new Decimal(0),
               },
               {
                 'principal': new Decimal(95),
                 'interest': new Decimal(0),
                 'hoa': new Decimal(1),
                 'property_tax': new Decimal(0),
                 'pmi': new Decimal(0),
                 'homeowners_insurance': new Decimal(0),
               },
             ],
             new Decimal(0)))
      .toBe(1);

  // Can't pay off full loan; some recurring debts; some non-loan payments.
  expect(utils.countBurndownMonths(
             new Decimal(100),
             [
               {
                 'principal': new Decimal(95),
                 'interest': new Decimal(0),
                 'hoa': new Decimal(1),
                 'property_tax': new Decimal(0),
                 'pmi': new Decimal(0),
                 'homeowners_insurance': new Decimal(0),
               },
               {
                 'principal': new Decimal(95),
                 'interest': new Decimal(0),
                 'hoa': new Decimal(1),
                 'property_tax': new Decimal(0),
                 'pmi': new Decimal(0),
                 'homeowners_insurance': new Decimal(0),
               },
             ],
             new Decimal(2)))
      .toBe(1);

  // Can pay off full loan; some recurring debts; some non-loan payments.  At
  // the end of the mortgage, assets will be 9; then return schedule.length +
  // (9 / (2 + 4)) = 1 + 1 = 2
  expect(utils.countBurndownMonths(
             new Decimal(16),
             [
               {
                 'principal': new Decimal(1),
                 'interest': new Decimal(0),
                 'hoa': new Decimal(2),
                 'property_tax': new Decimal(0),
                 'pmi': new Decimal(0),
                 'homeowners_insurance': new Decimal(0),
               },
             ],
             new Decimal(4)))
      .toBe(2);
});

test('maxNonEmptyDate', () => {
  const early = new Date(2010);
  const mid = new Date(2015);
  const late = new Date(2020);
  expect(utils.maxNonEmptyDate()).toBe(undefined);
  expect(utils.maxNonEmptyDate(undefined)).toBe(undefined);
  expect(utils.maxNonEmptyDate(undefined, mid)).toBe(mid);
  expect(utils.maxNonEmptyDate(mid, undefined)).toBe(mid);
  expect(utils.maxNonEmptyDate(mid, early)).toBe(mid);
  expect(utils.maxNonEmptyDate(mid, late, undefined, early)).toBe(late);
});

test('deleteParam', () => {
  const withValue = 'https://example.test/page?foo=bar&baz=quux';
  const withChecked = 'https://example.test/page?foo=&baz=quux';
  const withoutParam = 'https://example.test/page?baz=quux';

  let url;

  // Deletes param when present.
  url = new URL(withValue);
  expect(utils.deleteParam(url, 'foo')).toBe(true);

  // Deletes checked when present.
  url = new URL(withChecked);
  expect(utils.deleteParam(url, 'foo')).toBe(true);

  // No-op when missing.
  url = new URL(withoutParam);
  expect(utils.deleteParam(url, 'foo')).toBe(false);
});

test('updateURLParam', () => {
  const blank = 'https://example.test/page';

  let url;

  // Text inputs.
  {
    const text = document.createElement('input');
    const withParam = 'https://example.test/page?foo=bar';
    const withParams = 'https://example.test/page?foo=bar&baz=quux';

    // Simple addition.
    url = new URL(blank);
    text.value = 'bar';
    expect(utils.updateURLParam(url, text, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page?foo=bar');

    // Replacement.
    url = new URL(withParam);
    text.value = 'baz';
    expect(utils.updateURLParam(url, text, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page?foo=baz');

    // Addition URI encodes.
    url = new URL(blank);
    text.value = 'bar&baz';
    expect(utils.updateURLParam(url, text, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page?foo=bar%2526baz');

    // Replacement URI encodes.
    url = new URL(withParam);
    text.value = 'bar&baz';
    expect(utils.updateURLParam(url, text, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page?foo=bar%2526baz');

    // Deletes text.
    url = new URL(withParam);
    text.value = '';
    expect(utils.updateURLParam(url, text, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page');

    // Coexists with others.
    url = new URL(withParams);
    text.value = 'baz';
    expect(utils.updateURLParam(url, text, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page?foo=baz&baz=quux');
  }

  // Checkbox inputs.
  {
    const withChecked = 'https://example.test/page?foo=';
    const withOthers = 'https://example.test/page?foo=&boo=far';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';

    // Simple addition.
    url = new URL(blank);
    checkbox.checked = true;
    expect(utils.updateURLParam(url, checkbox, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page?foo=');

    // Deletes.
    url = new URL(withChecked);
    checkbox.checked = false;
    expect(utils.updateURLParam(url, checkbox, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page');

    url = new URL(withOthers);
    checkbox.checked = false;
    expect(utils.updateURLParam(url, checkbox, {name: 'foo'})).toBe(true);
    expect(url.toString()).toBe('https://example.test/page?boo=far');
  }
});

test('computeStockAssets', () => {
  // Investing something during one month doesn't cause any growth, since
  // there's no time to compound.
  expect(utils.computeStockAssets([new Decimal(1)], new Decimal(1)).toNumber())
      .toBeCloseTo(1, 6);

  // Investing something for a year, with no expected annual return, should
  // have no effect.
  expect(utils
             .computeStockAssets(
                 [new Decimal(1)].concat(new Array(12).fill(new Decimal(0))),
                 new Decimal(0))
             .toNumber())
      .toBeCloseTo(1, 6);

  // Investing something for a year, with an expected annual return of 0.5,
  // should cause it to grow 1.5x (modulo rounding accuracy).
  expect(utils
             .computeStockAssets(
                 [new Decimal(10)].concat(new Array(12).fill(new Decimal(0))),
                 new Decimal(0.5))
             .toNumber())
      .toBeCloseTo(15, 6);

  // Investing something for a year, with an expected annual return of 1, should
  // cause it to double (modulo rounding accuracy).
  expect(utils
             .computeStockAssets(
                 [new Decimal(7)].concat(new Array(12).fill(new Decimal(0))),
                 new Decimal(1))
             .toNumber())
      .toBeCloseTo(14, 6);

  // Monthly investments over a year, with an expected annual return of 0,
  // should come out to their simple sum.
  expect(utils
             .computeStockAssets(
                 new Array(12).fill(new Decimal(1)), new Decimal(0))
             .toNumber())
      .toBeCloseTo(12, 6);

  // Monthly investments over a year, with an expected annual return of 0.1,
  // should compound.
  expect(utils
             .computeStockAssets(
                 new Array(12).fill(new Decimal(1)), new Decimal(0.1))
             .toNumber())
      .toBeGreaterThan(12.54);
});
