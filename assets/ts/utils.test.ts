/**
 * @jest-environment jsdom
 */

import * as d3 from 'd3';
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
  expect(utils.orZero(elt)).toBe(0);

  elt.value = '723';
  expect(utils.orZero(elt)).toBe(723);

  elt.value = 'foo';
  expect(utils.orZero(elt)).toBe(0);
});

test('cumulativeSumByFields', () => {
  expect(utils.cumulativeSumByFields(
             [
               {
                 month: 0,
                 data: {
                   'principal': 1,
                   'interest': 0,
                   'hoa': 0,
                   'property_tax': 0,
                   'pmi': 0,
                   'homeowners_insurance': 0
                 },
               },
               {
                 month: 1,
                 data: {
                   'principal': 2,
                   'interest': 0,
                   'hoa': 0,
                   'property_tax': 0,
                   'pmi': 0,
                   'homeowners_insurance': 0
                 },
               },
               {
                 month: 2,
                 data: {
                   'principal': 4,
                   'interest': 0,
                   'hoa': 0,
                   'property_tax': 0,
                   'pmi': 0,
                   'homeowners_insurance': 0
                 },
               },
             ],
             ['principal']))
      .toStrictEqual([
        {
          month: 0,
          data: {
            'principal': 0,
          },
        },
        {
          month: 1,
          data: {
            'principal': 1,
          },
        },
        {
          month: 2,
          data: {
            'principal': 3,
          },
        },
        {
          month: 3,
          data: {
            'principal': 7,
          },
        },
      ]);
});

test('countBurndownMonths', () => {
  // Can pay off full loan, no recurring debts, no non-loan payments.
  expect(utils.countBurndownMonths(
             100,
             [
               {
                 'principal': 99,
                 'interest': 0,
                 'hoa': 0,
                 'property_tax': 0,
                 'pmi': 0,
                 'homeowners_insurance': 0
               },
             ],
             0))
      .toBe(Infinity);

  // Can pay off full loan, no recurring debts, but some non-loan payments.
  expect(utils.countBurndownMonths(
             100,
             [
               {
                 'principal': 95,
                 'interest': 0,
                 'hoa': 1,
                 'property_tax': 0,
                 'pmi': 0,
                 'homeowners_insurance': 0
               },
             ],
             0))
      .toBe(5);

  // Can't pay off full loan; no recurring debts; some non-loan payments.
  expect(utils.countBurndownMonths(
             100,
             [
               {
                 'principal': 95,
                 'interest': 0,
                 'hoa': 1,
                 'property_tax': 0,
                 'pmi': 0,
                 'homeowners_insurance': 0
               },
               {
                 'principal': 95,
                 'interest': 0,
                 'hoa': 1,
                 'property_tax': 0,
                 'pmi': 0,
                 'homeowners_insurance': 0
               },
             ],
             0))
      .toBe(1);

  // Can't pay off full loan; some recurring debts; some non-loan payments.
  expect(utils.countBurndownMonths(
             100,
             [
               {
                 'principal': 95,
                 'interest': 0,
                 'hoa': 1,
                 'property_tax': 0,
                 'pmi': 0,
                 'homeowners_insurance': 0
               },
               {
                 'principal': 95,
                 'interest': 0,
                 'hoa': 1,
                 'property_tax': 0,
                 'pmi': 0,
                 'homeowners_insurance': 0
               },
             ],
             2))
      .toBe(1);

  // Can pay off full loan; some recurring debts; some non-loan payments.  At
  // the end of the mortgage, assets will be 9; then return schedule.length + (9
  // / (2 + 4)) = 1 + 1 = 2
  expect(utils.countBurndownMonths(
             16,
             [
               {
                 'principal': 1,
                 'interest': 0,
                 'hoa': 2,
                 'property_tax': 0,
                 'pmi': 0,
                 'homeowners_insurance': 0
               },
             ],
             4))
      .toBe(2);
});

test('formatMonthNum', () => {
  expect(utils.formatMonthNum(0)).toBe('0mo');
  expect(utils.formatMonthNum(1)).toBe('1mo');
  expect(utils.formatMonthNum(11)).toBe('11mo');
  expect(utils.formatMonthNum(12)).toBe('1y');
  expect(utils.formatMonthNum(14)).toBe('1y 2mo');
  expect(utils.formatMonthNum(23)).toBe('1y 11mo');
  expect(utils.formatMonthNum(24)).toBe('2y');
  expect(utils.formatMonthNum(25)).toBe('2y 1mo');

  // Weird cases:
  expect(utils.formatMonthNum(-2)).toBe('0mo');
  expect(utils.formatMonthNum(Infinity)).toBe('forever');
  expect(utils.formatMonthNum(-Infinity)).toBe('0mo');
  expect(utils.formatMonthNum(NaN)).toBe('NaN');
  expect(utils.formatMonthNum(-NaN)).toBe('NaN');
});