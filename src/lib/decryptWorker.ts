/**
 * Inline Web Worker for image decryption.
 *
 * The worker source is embedded as a string and loaded via Blob URL so it
 * works inside userscript environments where file-based workers aren't
 * possible.
 *
 * IMPORTANT: The PRNG must match the original mulberry32 exactly:
 *   a += 0x6d2b79f5  (float addition, NO `| 0` truncation)
 *   byte = Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * 256)
 * Using `| 0` or `>>> 24` produces a DIFFERENT sequence because `a`
 * accumulates beyond 32-bit range as a float between iterations.
 *
 * Message protocol
 * ────────────────
 * Main → Worker:
 *   {
 *     jobId: number,
 *     buffer: ArrayBuffer,
 *     password: string,
 *     method: 'scanline' | 'noise',
 *     width: number,
 *     height: number
 *   }
 *   `buffer` is transferred (zero-copy).
 *
 * Worker → Main:
 *   { jobId: number, buffer: ArrayBuffer }
 *   `buffer` is transferred back (zero-copy).
 */

import type { EncryptionMethod } from '../providers/types';

const WORKER_SOURCE = /* js */ `
"use strict";

function cyrb128(str) {
  var h1 = 1779033703;
  var h2 = 3144134277;
  var h3 = 1013904242;
  var h4 = 2773480762;

  for (var i = 0; i < str.length; i++) {
    var k = str.charCodeAt(i);
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

function mulberry32(seed) {
  var a = seed;
  return function () {
    a += 0x6d2b79f5;
    var t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function decryptNoise(buffer, password) {
  var data = new Uint8Array(buffer);
  var len = data.length;
  var rand = mulberry32(cyrb128(password));

  for (var i = 0; i < len; i += 4) {
    data[i]     ^= Math.floor(rand() * 256);
    data[i + 1] ^= Math.floor(rand() * 256);
    data[i + 2] ^= Math.floor(rand() * 256);
    // data[i + 3] is alpha — skip
  }

  return buffer;
}

function decryptScanline(buffer, password, width, height) {
  var channels = 4;
  var rowByteLength = width * channels;
  var data = new Uint8Array(buffer);
  var output = new Uint8Array(data.length);
  var rand = mulberry32(cyrb128(password + ":" + width + "x" + height + ":" + channels + ":scanline"));

  for (var row = 0; row < height; row++) {
    var offset = width === 0 ? 0 : Math.floor(rand() * width);
    var reverse = rand() >= 0.5;

    for (var destinationColumn = 0; destinationColumn < width; destinationColumn++) {
      var transformedColumn = reverse ? width - 1 - destinationColumn : destinationColumn;
      var sourceColumn = (transformedColumn + offset) % width;
      var srcStart = row * rowByteLength + sourceColumn * channels;
      var destStart = row * rowByteLength + destinationColumn * channels;

      output[destStart] = data[srcStart];
      output[destStart + 1] = data[srcStart + 1];
      output[destStart + 2] = data[srcStart + 2];
      output[destStart + 3] = data[srcStart + 3];
    }
  }

  return output.buffer;
}

self.onmessage = function (e) {
  var jobId = e.data.jobId;
  var buffer = e.data.buffer;
  var password = e.data.password;
  var method = e.data.method || "noise";
  var width = e.data.width;
  var height = e.data.height;

  var decryptedBuffer = method === "scanline"
    ? decryptScanline(buffer, password, width, height)
    : decryptNoise(buffer, password);

  self.postMessage({ jobId: jobId, buffer: decryptedBuffer }, [decryptedBuffer]);
};
`;

let workerBlobUrl: string | null = null;

function getWorkerBlobUrl(): string {
  if (!workerBlobUrl) {
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
    workerBlobUrl = URL.createObjectURL(blob);
  }
  return workerBlobUrl;
}

// ── Worker pool ─────────────────────────────────────────────────────────────

interface PooledWorker {
  worker: Worker;
  busy: boolean;
}

const POOL_SIZE = navigator.hardwareConcurrency
  ? Math.min(navigator.hardwareConcurrency, 4)
  : 2;

let pool: PooledWorker[] | null = null;

function getPool(): PooledWorker[] {
  if (!pool) {
    const url = getWorkerBlobUrl();
    pool = Array.from({ length: POOL_SIZE }, () => ({
      worker: new Worker(url),
      busy: false,
    }));
  }
  return pool;
}

function acquireWorker(): Promise<PooledWorker> {
  const p = getPool();
  const free = p.find((w) => !w.busy);
  if (free) {
    free.busy = true;
    return Promise.resolve(free);
  }

  return new Promise<PooledWorker>((resolve) => {
    const check = () => {
      const w = p.find((w) => !w.busy);
      if (w) {
        w.busy = true;
        resolve(w);
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

function releaseWorker(pw: PooledWorker) {
  pw.busy = false;
}

// ── Public API ──────────────────────────────────────────────────────────────

interface WorkerResponse {
  jobId: number;
  buffer: ArrayBuffer;
}

let nextJobId = 0;

/**
 * Run image decryption inside a Web Worker.
 *
 * `pixelBuffer` is an `ArrayBuffer` obtained from `ImageData.data.buffer`.
 * Ownership is **transferred** to the worker (zero-copy) and returned back
 * once decryption is complete — the caller must not access it in between.
 */
export async function decryptInWorker(
  pixelBuffer: ArrayBuffer,
  password: string,
  method: EncryptionMethod,
  width: number,
  height: number,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const pw = await acquireWorker();
  const jobId = nextJobId++;

  return new Promise<ArrayBuffer>((resolve, reject) => {
    if (signal?.aborted) {
      releaseWorker(pw);
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }

    let settled = false;

    // The worker is only released when it actually responds (onmessage).
    // This prevents the race where an aborted job's worker gets reused
    // while still processing, causing a stale result to reach the next job.
    pw.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      // Always release — the worker is now truly idle
      releaseWorker(pw);

      if (settled) return; // Already rejected via abort
      if (e.data.jobId !== jobId) return; // Stale response (safety net)

      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(e.data.buffer);
    };

    pw.worker.onerror = (err) => {
      releaseWorker(pw);
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      reject(err);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      // Do NOT release worker — it's still processing.
      // It will be released when onmessage fires.
      reject(signal!.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    // Transfer the buffer (zero-copy)
    pw.worker.postMessage(
      { jobId, buffer: pixelBuffer, password, method, width, height },
      [pixelBuffer],
    );
  });
}

export function xorDecryptInWorker(
  pixelBuffer: ArrayBuffer,
  password: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  return decryptInWorker(pixelBuffer, password, 'noise', 0, 0, signal);
}
