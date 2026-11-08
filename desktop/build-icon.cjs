// Gera icon.ico (16 a 256 px) a partir de icon.svg usando o próprio Electron.
// Uso: npx electron build-icon.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SIZES = [256, 128, 64, 48, 32, 24, 16];

/** Monta um .ico com imagens PNG (formato aceito desde o Windows Vista) */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

app.whenReady().then(async () => {
  const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<meta charset="utf-8">');
  const urls = await win.webContents.executeJavaScript(`(async () => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(${JSON.stringify(svg)});
    await img.decode();
    const out = {};
    for (const n of ${JSON.stringify(SIZES)}) {
      const c = document.createElement('canvas');
      c.width = c.height = n;
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, n, n);
      out[n] = c.toDataURL('image/png');
    }
    return out;
  })()`);
  const pngs = SIZES.map((size) => ({ size, data: Buffer.from(urls[size].split(',')[1], 'base64') }));
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), buildIco(pngs));
  fs.writeFileSync(path.join(__dirname, 'icon.png'), pngs[0].data);
  console.log('icon.ico e icon.png gerados');
  app.quit();
});
