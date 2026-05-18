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

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    try {
      // JPEG encoding is significantly faster than WebP and perfectly fine for comics
      return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    } catch (e) {
      return await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
    }
  }

  const htmlCanvas = canvas as HTMLCanvasElement;
  const jpeg = await new Promise<Blob | null>((resolve) =>
    htmlCanvas.toBlob(resolve, 'image/jpeg', 0.9),
  );
  if (jpeg) {
    return jpeg;
  }

  return new Promise<Blob>((resolve, reject) =>
    htmlCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/webp',
    ),
  );
}

export async function decryptImageBuffer(
  imageUrl: string,
  password: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const blob = await fetchImageBlob(imageUrl, signal);

  let imgBitmap: ImageBitmap | undefined;
  let objectUrl: string | undefined;
  let img: HTMLImageElement | undefined;

  // Check Worker availability once, upfront — NOT inside a try/catch around
  // the transfer.  Once the buffer is transferred to a worker it is detached
  // and cannot be used for a main-thread fallback.
  let workerModule: typeof import('./decryptWorker') | null = null;
  try {
    if (typeof Worker !== 'undefined') {
      workerModule = await import('./decryptWorker');
    }
  } catch {
    // Worker import/creation failed (CSP, etc.) — will use main-thread path
  }

  try {
    if (typeof createImageBitmap !== 'undefined') {
      imgBitmap = await createImageBitmap(blob);
    } else {
      objectUrl = URL.createObjectURL(blob);
      img = await loadImage(objectUrl);
    }

    const width = imgBitmap ? imgBitmap.width : img!.naturalWidth || img!.width;
    const height = imgBitmap
      ? imgBitmap.height
      : img!.naturalHeight || img!.height;

    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx:
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;

    // willReadFrequently: true here because we need getImageData right after drawImage
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d', {
        willReadFrequently: true,
      }) as OffscreenCanvasRenderingContext2D;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d', {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D;
    }

    if (!ctx) {
      throw new Error('Failed to create image canvas context');
    }

    if (imgBitmap) {
      ctx.drawImage(imgBitmap, 0, 0);
    } else {
      ctx.drawImage(img!, 0, 0);
    }

    const imageData = ctx.getImageData(0, 0, width, height);

    // ── XOR decryption ──────────────────────────────────────────────────
    let decryptedBuffer: ArrayBuffer;

    if (workerModule) {
      // Worker path — buffer is transferred (zero-copy) and returned
      decryptedBuffer = await workerModule.xorDecryptInWorker(
        imageData.data.buffer,
        password,
        signal,
      );
    } else {
      // Main-thread fallback
      decryptedBuffer = xorDecryptMainThread(imageData.data.buffer, password);
    }

    // Put the decrypted pixels back onto the canvas
    const decryptedData = new ImageData(
      new Uint8ClampedArray(decryptedBuffer),
      width,
      height,
    );
    ctx.putImageData(decryptedData, 0, 0);
    const resultBlob = await canvasToBlob(canvas);

    return resultBlob;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (imgBitmap) imgBitmap.close();
  }
}

/**
 * Main-thread fallback for XOR decryption.
 * Used only when Web Workers are unavailable (e.g. CSP restrictions).
 *
 * MUST use the same PRNG as the original mulberry32:
 * - `a += 0x6d2b79f5` (float, no `| 0`)
 * - `Math.floor(rand() * 256)` for each byte
 */
function xorDecryptMainThread(
  buffer: ArrayBuffer,
  password: string,
): ArrayBuffer {
  const data = new Uint8Array(buffer);
  const rand = mulberry32(cyrb128(password));

  for (let i = 0; i < data.length; i += 4) {
    data[i] ^= Math.floor(rand() * 256);
    data[i + 1] ^= Math.floor(rand() * 256);
    data[i + 2] ^= Math.floor(rand() * 256);
    // data[i + 3] is alpha — skip
  }

  return buffer;
}
