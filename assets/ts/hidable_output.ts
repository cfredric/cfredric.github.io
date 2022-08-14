import {FormatResult} from './formatter';
import {HidableContainer} from './types';
import * as utils from './utils';
import {getHtmlElt} from './utils';

export class HidableOutput {
  private readonly container: HidableContainer;
  private readonly formattedOrStr: FormatResult|string;

  constructor(
      container: HidableContainer, formattedOrStr: FormatResult|string) {
    this.formattedOrStr = formattedOrStr;
    this.container = container;
  }

  output(): string {
    if (typeof this.formattedOrStr === 'string') {
      return this.formattedOrStr;
    }
    return this.formattedOrStr.value;
  }

  display(elt: (c: HidableContainer) => HTMLElement): void {
    utils.setEltVisibility(getHtmlElt(this.container), !!this.output());
    utils.setEltContent(elt(this.container), this.formattedOrStr);
  }
}
