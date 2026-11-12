// Compact RFC 1321 MD5 for Uint8Array -> lowercase hex digest
(function (root) {
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i += 1) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
  }

  function rotl(x, c) {
    return ((x << c) | (x >>> (32 - c))) >>> 0;
  }

  function md5Hex(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const origLen = bytes.length;
    const bitLen = origLen * 8;
    const paddedLen = (((origLen + 8) >> 6) + 1) << 6;
    const padded = new Uint8Array(paddedLen);
    padded.set(bytes);
    padded[origLen] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(paddedLen - 8, bitLen >>> 0, true);
    view.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000) >>> 0, true);

    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    const M = new Uint32Array(16);
    for (let offset = 0; offset < paddedLen; offset += 64) {
      for (let j = 0; j < 16; j += 1) {
        M[j] = view.getUint32(offset + j * 4, true);
      }

      let A = a0;
      let B = b0;
      let C = c0;
      let D = d0;

      for (let i = 0; i < 64; i += 1) {
        let F;
        let g;
        if (i < 16) {
          F = (B & C) | (~B & D);
          g = i;
        } else if (i < 32) {
          F = (D & B) | (~D & C);
          g = (5 * i + 1) % 16;
        } else if (i < 48) {
          F = B ^ C ^ D;
          g = (3 * i + 5) % 16;
        } else {
          F = C ^ (B | ~D);
          g = (7 * i) % 16;
        }

        const temp = D;
        D = C;
        C = B;
        const sum = (A + F + K[i] + M[g]) >>> 0;
        B = (B + rotl(sum, S[i])) >>> 0;
        A = temp;
      }

      a0 = (a0 + A) >>> 0;
      b0 = (b0 + B) >>> 0;
      c0 = (c0 + C) >>> 0;
      d0 = (d0 + D) >>> 0;
    }

    const out = new Uint8Array(16);
    const outView = new DataView(out.buffer);
    outView.setUint32(0, a0, true);
    outView.setUint32(4, b0, true);
    outView.setUint32(8, c0, true);
    outView.setUint32(12, d0, true);

    let hex = "";
    for (let i = 0; i < 16; i += 1) {
      hex += out[i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  root.mgMd5Hex = md5Hex;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { md5Hex };
  }
})(typeof globalThis !== "undefined" ? globalThis : window);

