
// Returns the numeric value of the input element, or 0 if the input was empty.
export const orZero = (elt: HTMLInputElement): number => {
  const num = Number.parseFloat(elt.value);
  return Number.isNaN(num) ? 0 : num;
};
// Returns the HTMLInputElement with the given ID, or throws an informative
// error.
export const getInputElt = (id: string): HTMLInputElement => {
  const elt = document.getElementById(id);
  if (!(elt instanceof HTMLInputElement))
    throw new Error(`${id} element is not an HTMLInputElement`);
  return elt;
};
// Returns the HTMLElement with the given ID, or throws an informative error.
export const getHtmlElt = (id: string): HTMLElement => {
  const elt = document.getElementById(id);
  if (!(elt instanceof HTMLElement))
    throw new Error(`${id} element is not an HTMLElement`);
  return elt;
};

// Counts the number of elements of `data` which satisfy `predicate`.
export const countSatisfying = <T,>(data: readonly T[], predicate: (t: T) => boolean): number => {
    let count = 0;
    for (const t of data)
      if (predicate(t))
        ++count;
    return count;
  };