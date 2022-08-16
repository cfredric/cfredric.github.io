import {FormatResult} from './formatter';
import {HidableContainer} from './types';
import * as utils from './utils';
import {getHtmlElt} from './utils';

export class HidableOutput {
  private readonly formattedOrStr: FormatResult|string;

  constructor(formattedOrStr: FormatResult|string) {
    this.formattedOrStr = formattedOrStr;
  }

  output(): string {
    if (typeof this.formattedOrStr === 'string') {
      return this.formattedOrStr;
    }
    return this.formattedOrStr.value;
  }

  display(c: HidableContainer, elt: HTMLElement): void {
    utils.setEltVisibility(getHtmlElt(c), !!this.output());
    utils.setEltContent(elt, this.formattedOrStr);
  }
}
