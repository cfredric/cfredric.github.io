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