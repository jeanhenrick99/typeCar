// Copia o jogo já compilado (../dist) para dentro do app desktop
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', 'dist');
const dest = path.join(__dirname, 'app');
if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('Rode "npm run build" na pasta do jogo antes.');
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Jogo copiado para desktop/app');
