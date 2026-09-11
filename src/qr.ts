import qrcode from 'qrcode-generator';

const CELL_SIZE = 4;
const MARGIN = 2;

export function createQrElement(url: string): SVGElement | null {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();

  const markup = qr.createSvgTag({ cellSize: CELL_SIZE, margin: MARGIN, scalable: true });
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = parsed.documentElement;

  if (!(root instanceof SVGElement)) {
    return null;
  }

  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', 'QR code for the share link');
  return root;
}
