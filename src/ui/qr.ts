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

export async function qrToPngBlob(qr: SVGElement): Promise<Blob> {
  const size = 512;
  const padding = 32;
  const imageSize = size - padding * 2;
  const source = new XMLSerializer().serializeToString(qr);
  const sourceUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not render the QR image.'));
      image.src = sourceUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('Canvas is unavailable.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, padding, padding, imageSize, imageSize);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob === null) {
          reject(new Error('Could not encode the QR image.'));
        } else {
          resolve(blob);
        }
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
