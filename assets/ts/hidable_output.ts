import {FormatResult} from './formatter';
import {HidableContainer} from './types';
import * as utils from './utils';
import {getHtmlEltWithId} from './utils';

export class HidableOutput {
  private readonly formattedOrStr: FormatResult|string;

  constructor(formattedOrStr: FormatResult|string) {
    this.formattedOrStr = formattedOrStr;
  }

  display(c: HidableContainer, elt: HTMLElement): void {
    const visible =
        !!(typeof this.formattedOrStr === 'string' ? this.formattedOrStr :
                                                     this.formattedOrStr.value);
    utils.setEltVisibility(getHtmlEltWithId(c), visible);
    utils.setEltContent(elt, this.formattedOrStr);
  }
}
