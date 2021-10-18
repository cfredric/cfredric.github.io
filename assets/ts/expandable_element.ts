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

  toggle() {
    if (this.showing) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (typeof this.elt === 'function') {
      this.elt = this.elt();
      this.parent.appendChild(this.elt);
    }
    this.elt.style.display = '';
    this.showing = true;
    this.titleElt.innerText = this.makeTitle();
  }

  hide() {
    if (typeof this.elt === 'function') return;
    this.elt.style.display = 'none';
    this.showing = false;
    this.titleElt.innerText = this.makeTitle();
  }

  makeTitle(): string {
    return (this.showing ? '-' : '+') + ` ${this.title}`;
  }
}
