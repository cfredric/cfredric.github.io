import {HidableContainer} from './types';
import {getHtmlElt} from './utils';

export class HidableOutput {
  private readonly container: HidableContainer;
  private readonly str?: string;

  constructor(container: HidableContainer, str?: string) {
    this.str = str;
    this.container = container;
  }

  output(): string {
    return this.str || '';
  }

  display(elt: (c: HidableContainer) => HTMLElement): void {
    getHtmlElt(this.container).style.display = this.str ? '' : 'none';
    elt(this.container).innerText = this.output();
  }
}
