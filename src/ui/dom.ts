export function requireElement<T extends Element>(id: string, ctor: abstract new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof ctor)) {
    throw new Error(`Missing #${id} element in index.html`);
  }
  return element;
}

export function setText(element: HTMLElement, text: string): void {
  element.textContent = text;
}
