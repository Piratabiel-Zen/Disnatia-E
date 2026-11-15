// Decodificador mínimo de PNG (8 bits, RGBA, sem entrelace), o formato que o
// Playwright devolve em page.screenshot(). Serve para medir o que foi desenhado
// num canvas WebGL, que não pode ser lido de volta sem preserveDrawingBuffer.
const zlib = require('node:zlib');

function decode(buffer) {
  let offset = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const parts = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') parts.push(data);
    else if (type === 'IEND') break;
    offset += length + 12;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`PNG não suportado: bits ${bitDepth}, tipo ${colorType}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const dl = Math.abs(p - left), du = Math.abs(p - up), dul = Math.abs(p - upLeft);
        value += dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
      }
      pixels[y * stride + x] = value & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

/** Fração de pixels claramente acesos e quantas cores distintas aparecem. */
function analyse(buffer) {
  const { width, height, channels, pixels } = decode(buffer);
  const colors = new Set();
  let lit = 0;
  for (let i = 0; i < width * height; i++) {
    const r = pixels[i * channels], g = pixels[i * channels + 1], b = pixels[i * channels + 2];
    if (r + g + b > 120) lit++;
    colors.add((r >> 5 << 10) | (g >> 5 << 5) | (b >> 5));
  }
  return { lit: lit / (width * height), colors: colors.size, width, height };
}

module.exports = { decode, analyse };
