export class ExpandableElement {
  readonly parent: HTMLElement;

  readonly title: string;
  readonly titleElt: HTMLSpanElement;
  elt: (() => HTMLElement)|HTMLElement;
  showing: boolean = false;

  constructor(parent: HTMLElement, title: string, compute: () => HTMLElement) {
    this.parent = parent;
    this.elt = compute;

    this.title = title;
    this.titleElt = document.createElement('button');
    this.titleElt.innerText = this.makeTitle();
    this.parent.appendChild(this.titleElt);
    this.titleElt.addEventListener('click', () => void this.toggle())
  }

  /** Toggles whether this element is displayed or hidden. */
  toggle() {
    if (this.showing) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** Shows this element. */
  show() {
    if (typeof this.elt === 'function') {
      this.elt = this.elt();
      this.parent.appendChild(this.elt);
    }
    this.elt.style.display = '';
    this.showing = true;
    this.titleElt.innerText = this.makeTitle();
  }

  /** Hides this element. */
  hide() {
    if (typeof this.elt === 'function') return;
    this.elt.style.display = 'none';
    this.showing = false;
    this.titleElt.innerText = this.makeTitle();
  }

  /**
   * Generates the appropriate title for this element given its
   * displayed/hidden state.
   */
  makeTitle(): string {
    return (this.showing ? '-' : '+') + ` ${this.title}`;
  }
}
