/* camera.js — getUserMedia lifecycle + frame capture.
   Constraints: HTTPS or localhost only; iOS Safari requires playsinline + a user gesture. */

const JPEG_QUALITY = 0.85;
const MAX_EDGE = 1280;           // upload budget: ~250-400 KB per frame

export class Camera {
  #stream = null;
  #facing = 'environment';

  constructor(videoEl, canvasEl) {
    this.video = videoEl;
    this.canvas = canvasEl;
  }

  get active() { return !!this.#stream; }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser has no camera API. Open the app over HTTPS in Safari or Chrome.');
    }
    this.stop();
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: this.#facing },
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };
    try {
      this.#stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (err.name === 'NotAllowedError') throw new Error('Camera access is off. Enable it in site settings, then reload.');
      if (err.name === 'NotFoundError')   throw new Error('No camera found on this device.');
      if (err.name === 'NotReadableError')throw new Error('Another app is using the camera. Close it and try again.');
      throw err;
    }
    this.video.srcObject = this.#stream;
    await this.video.play();
    await this.#ready();
    return this.settings();
  }

  #ready() {
    if (this.video.readyState >= 2) return Promise.resolve();
    return new Promise((res) => this.video.addEventListener('loadeddata', res, { once: true }));
  }

  settings() {
    const t = this.#stream?.getVideoTracks?.()[0];
    return t ? t.getSettings() : {};
  }

  async flip() {
    this.#facing = this.#facing === 'environment' ? 'user' : 'environment';
    return this.start();
  }

  stop() {
    this.#stream?.getTracks().forEach((t) => t.stop());
    this.#stream = null;
    this.video.srcObject = null;
  }

  /** Grab the current frame, downscale to MAX_EDGE, return a JPEG Blob. */
  capture() {
    const vw = this.video.videoWidth, vh = this.video.videoHeight;
    if (!vw || !vh) throw new Error('Camera is still warming up. Try again in a second.');

    const scale = Math.min(1, MAX_EDGE / Math.max(vw, vh));
    const w = Math.round(vw * scale), h = Math.round(vh * scale);

    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    ctx.drawImage(this.video, 0, 0, w, h);

    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => (blob ? resolve({ blob, width: w, height: h }) : reject(new Error('Frame capture failed.'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });
  }
}
