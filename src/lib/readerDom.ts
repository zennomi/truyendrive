export const READER_STICKY_CLASS = 'stick';

export function getReaderStickyElements(main: ParentNode) {
  return {
    buffer: main.querySelector<HTMLElement>('.rdr-aside-buffer'),
    header: main.querySelector<HTMLElement>('header'),
    selector: main.querySelector<HTMLElement>('.rdr-selector'),
  };
}

export function getReaderStickyOffset(main: HTMLElement | null | undefined) {
  if (!main?.classList.contains(READER_STICKY_CLASS)) {
    return 0;
  }

  const { header, selector } = getReaderStickyElements(main);
  return (header?.offsetHeight ?? 0) + (selector?.offsetHeight ?? 0);
}
