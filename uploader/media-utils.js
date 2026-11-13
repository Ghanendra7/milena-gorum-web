(function () {
  const MAX_WEBFLOW_IMAGE_BYTES = 3.85 * 1024 * 1024;
  const BUNNY_CDN_BASE = "https://vz-ada4eb16-135.b-cdn.net";

  function padTwo(num) {
    const n = Number(num);
    if (!Number.isFinite(n)) return "00";
    return String(Math.round(n)).padStart(2, "0");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function extractVideoId(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";
    const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) return uuidMatch[0];
    return raw.replace(/\.mp4.*$/i, "").replace(/\/playlist\.m3u8.*$/i, "").split("/").pop() || raw;
  }

  function getPresetConfig(presetValue) {
    if (presetValue === "webp-3000") return { mime: "image/webp", ext: "webp", maxEdge: 3000 };
    if (presetValue === "jpeg-2400") return { mime: "image/jpeg", ext: "jpg", maxEdge: 2400 };
    if (presetValue === "jpeg-3000") return { mime: "image/jpeg", ext: "jpg", maxEdge: 3000 };
    return { mime: "image/webp", ext: "webp", maxEdge: 2400 };
  }

  function isTiffFile(file) {
    if (!file) return false;
    const type = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    return type === "image/tiff" || type === "image/tif" || /\.(tiff?|tif)$/i.test(name);
  }

  async function decodeTiffToCanvas(file) {
    const buffer = await file.arrayBuffer();
    const UTIF = window.UTIF || (typeof self !== "undefined" && self.UTIF);
    if (!UTIF || typeof UTIF.decode !== "function") {
      throw new Error("TIFF decoder library is not loaded.");
    }
    const ifds = UTIF.decode(buffer);
    if (!ifds || !ifds.length) {
      throw new Error("Could not parse TIFF structure (no image directories found).");
    }

    // Select the primary/highest-resolution image IFD
    let selectedIFD = ifds[0];
    let maxPixels = ((selectedIFD.t256 && selectedIFD.t256[0]) || 0) * ((selectedIFD.t257 && selectedIFD.t257[0]) || 0);
    for (let i = 1; i < ifds.length; i++) {
      const ifd = ifds[i];
      const px = ((ifd.t256 && ifd.t256[0]) || 0) * ((ifd.t257 && ifd.t257[0]) || 0);
      if (px > maxPixels) {
        maxPixels = px;
        selectedIFD = ifd;
      }
    }

    UTIF.decodeImage(buffer, selectedIFD);
    const rgba = UTIF.toRGBA8(selectedIFD);
    const width = selectedIFD.width;
    const height = selectedIFD.height;
    if (!width || !height) {
      throw new Error("Invalid TIFF dimensions.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const clamped = new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength);
    const imgData = new ImageData(clamped, width, height);
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  async function loadBitmap(file) {
    if (typeof createImageBitmap === "function") {
      return createImageBitmap(file);
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    });
  }

  async function compressImageFile(file, preset) {
    const isTiff = isTiffFile(file);
    const source = isTiff ? await decodeTiffToCanvas(file) : await loadBitmap(file);
    const origW = source.width;
    const origH = source.height;

    let scale = 1;
    const longest = Math.max(origW, origH);
    if (longest > preset.maxEdge) {
      scale = preset.maxEdge / longest;
    }

    let targetW = Math.max(1, Math.round(origW * scale));
    let targetH = Math.max(1, Math.round(origH * scale));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    let outputMime = preset.mime;
    let outputExt = preset.ext;
    let blob = null;

    const tryEncode = async (w, h, mime, quality) => {
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
      return canvasToBlob(canvas, mime, quality);
    };

    const qualities = [0.88, 0.8, 0.72, 0.62];
    for (const q of qualities) {
      blob = await tryEncode(targetW, targetH, outputMime, q);
      if ((!blob || (outputMime === "image/webp" && blob.type !== "image/webp")) && outputMime !== "image/jpeg") {
        outputMime = "image/jpeg";
        outputExt = "jpg";
        blob = await tryEncode(targetW, targetH, outputMime, q);
      }
      if (blob && blob.size <= MAX_WEBFLOW_IMAGE_BYTES) break;
    }

    while (blob && blob.size > MAX_WEBFLOW_IMAGE_BYTES && Math.max(targetW, targetH) > 900) {
      targetW = Math.round(targetW * 0.8);
      targetH = Math.round(targetH * 0.8);
      blob = await tryEncode(targetW, targetH, outputMime, 0.72);
    }

    if (typeof source.close === "function") source.close();
    if (isTiff && source instanceof HTMLCanvasElement) {
      source.width = 0;
      source.height = 0;
    }

    if (!blob || blob.size > MAX_WEBFLOW_IMAGE_BYTES) {
      throw new Error(`Compressed image still exceeds Webflow's 4 MB cap (${formatBytes(blob?.size || 0)}).`);
    }

    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "slide";
    const fileName = `${base}.${outputExt}`;
    const arrayBuffer = await blob.arrayBuffer();
    const fileHash = window.mgMd5Hex(arrayBuffer);

    return {
      blob,
      fileName,
      fileHash,
      width: targetW,
      height: targetH,
      compressedSize: blob.size,
      mime: outputMime,
    };
  }

  window.mgMediaUtils = {
    BUNNY_CDN_BASE,
    padTwo,
    slugify,
    formatBytes,
    extractVideoId,
    getPresetConfig,
    isTiffFile,
    decodeTiffToCanvas,
    compressImageFile,
  };
})();

