"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtmlElt = exports.getInputElt = exports.orZero = void 0;
var orZero = function (elt) {
    var num = Number.parseFloat(elt.value);
    return Number.isNaN(num) ? 0 : num;
};
exports.orZero = orZero;
var getInputElt = function (id) {
    var elt = document.getElementById(id);
    if (!(elt instanceof HTMLInputElement))
        throw new Error(id + " element is not an HTMLInputElement");
    return elt;
};
exports.getInputElt = getInputElt;
var getHtmlElt = function (id) {
    var elt = document.getElementById(id);
    if (!(elt instanceof HTMLElement))
        throw new Error(id + " element is not an HTMLElement");
    return elt;
};
exports.getHtmlElt = getHtmlElt;
