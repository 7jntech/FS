/** Print only the given element (e.g. a paystub), not the entire page. */
export function printOnly(el: HTMLElement | null) {
  if (!el) return;
  el.classList.add('print-target');
  const cleanup = () => {
    el.classList.remove('print-target');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
