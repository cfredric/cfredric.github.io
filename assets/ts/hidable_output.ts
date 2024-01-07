import {FormatResult} from './formatter';
import * as utils from './utils';

export class HidableOutput {
  private readonly formattedOrStr: FormatResult|string;

  constructor(formattedOrStr: FormatResult|string) {
    this.formattedOrStr = formattedOrStr;
  }

  display(elt: HTMLElement): void {
    const visible =
        !!(typeof this.formattedOrStr === 'string' ? this.formattedOrStr :
                                                     this.formattedOrStr.value);
    utils.setEltContent(elt, visible ? this.formattedOrStr : '---');
  }
}
