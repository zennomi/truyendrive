export function cyrb128(str: string): number {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let i = 0; i < str.length; i += 1) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;

  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image blob'));
    img.src = src;
  });
}

async function fetchImageBlob(imageUrl: string, signal?: AbortSignal) {
  const response = await fetch(imageUrl, {
    credentials: 'include',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  return response.blob();
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.92),
  );
  if (webp) {
    return webp;
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
    ),
  );
}

export async function decryptImageBuffer(
  imageUrl: string,
  password: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const blob = await fetchImageBlob(imageUrl, signal);
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create image canvas context');
    }

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const rand = mulberry32(cyrb128(password));

    for (let i = 0; i < data.length; i += 4) {
      data[i] ^= Math.floor(rand() * 256);
      data[i + 1] ^= Math.floor(rand() * 256);
      data[i + 2] ^= Math.floor(rand() * 256);
    }

    ctx.putImageData(imageData, 0, 0);

    return canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
