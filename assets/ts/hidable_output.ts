import {HidableContainer} from './types';
import {getHtmlElt} from './utils';

export class HidableOutput {
  private readonly str?: string;

  constructor(str?: string) {
    this.str = str;
  }

  output(): string {
    return this.str || '';
  }

  display(container: HidableContainer): void {
    getHtmlElt(container).style.display = this.str ? '' : 'none';
  }
}
