/**
 * Wraps every non-whitespace character in `root`'s text content with
 * `<span class="char" style="--i:N">`, preserving element structure (e.g. an
 * <em> inside a headline) so CSS can dissolve characters individually while
 * keeping their per-character stagger index in `--i`.
 */
export function wrapChars(root: HTMLElement): void {
  let index = 0;

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      const fragment = document.createDocumentFragment();
      for (const ch of text) {
        if (ch.trim() === '') {
          fragment.appendChild(document.createTextNode(ch));
          continue;
        }
        const span = document.createElement('span');
        span.className = 'char';
        span.style.setProperty('--i', String(index));
        span.textContent = ch;
        fragment.appendChild(span);
        index++;
      }
      node.parentNode?.replaceChild(fragment, node);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(walk);
    }
  }

  Array.from(root.childNodes).forEach(walk);
}
