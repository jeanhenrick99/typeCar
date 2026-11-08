// Janela do TypeCar. O jogo compilado é servido por um servidor local em
// http://localhost: é um endereço seguro (o áudio do motor funciona) e já
// autorizado no Firebase. O Google não aceita login dentro de apps, então o
// login abre no navegador do sistema (página /desktop-login deste mesmo
// servidor), que devolve o token para o app por /__desktop/credential.
const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, 'app');
/** Porta fixa: o progresso salvo no app fica ligado a este endereço */
const PORTS = [47652, 47653, 47654];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

// sem limite de 60 quadros por segundo, para medir o desempenho real
if (process.argv.includes('--unlimited')) {
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('disable-gpu-vsync');
}

// O Google recusa login em navegadores "embutidos": o app se apresenta como Chrome
app.userAgentFallback = app.userAgentFallback.replace(/\s(Electron|TypeCar|typecar-desktop)\/\S+/gi, '');

/* ── Preferências do app (tela cheia) salvas na pasta de dados do usuário ── */
let mainWin = null;
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function loadSettings() {
  try {
    return { fullscreen: false, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    return { fullscreen: false };
  }
}
function saveSettings(patch) {
  try {
    fs.writeFileSync(settingsFile(), JSON.stringify({ ...loadSettings(), ...patch }));
  } catch {
    /* sem permissão de escrita: só não lembra */
  }
}
function setFullscreen(on) {
  if (!mainWin) return;
  mainWin.setFullScreen(on);
  saveSettings({ fullscreen: on });
}

/** GET devolve as preferências; POST ?fullscreen=1|0 liga ou desliga a tela cheia */
function handleSettings(req, res, url) {
  if (req.method === 'POST' && url.searchParams.has('fullscreen')) setFullscreen(url.searchParams.get('fullscreen') === '1');
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ fullscreen: mainWin ? mainWin.isFullScreen() : loadSettings().fullscreen }));
}

/** Logins feitos no navegador do sistema esperando o app buscar (por código único) */
const credentials = new Map();

/** Recebe/entrega o token do login com Google feito no navegador */
function handleCredential(req, res, url) {
  const nonce = url.searchParams.get('nonce') ?? '';
  if (!/^[\w-]{16,64}$/.test(nonce)) {
    res.writeHead(400).end();
    return;
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 20000) req.destroy();
    });
    req.on('end', () => {
      try {
        const { idToken, accessToken } = JSON.parse(body);
        credentials.set(nonce, { idToken, accessToken, at: Date.now() });
        res.writeHead(204).end();
      } catch {
        res.writeHead(400).end();
      }
    });
    return;
  }
  const cred = credentials.get(nonce);
  if (!cred || Date.now() - cred.at > 300_000) {
    res.writeHead(204).end();
    return;
  }
  credentials.delete(nonce);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ idToken: cred.idToken, accessToken: cred.accessToken }));
}

function serve() {
  const server = http.createServer((req, res) => {
    let pathname = '/';
    let url = null;
    try {
      url = new URL(req.url, 'http://localhost');
      pathname = decodeURIComponent(url.pathname);
    } catch {
      /* endereço inválido: cai no index */
    }
    if (url && pathname === '/__desktop/credential') return handleCredential(req, res, url);
    if (url && pathname === '/__desktop/settings') return handleSettings(req, res, url);
    let file = path.normalize(path.join(ROOT, pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(ROOT, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    const tryPort = (i) => {
      if (i >= PORTS.length) return reject(new Error('Nenhuma porta livre'));
      server.once('error', () => tryPort(i + 1));
      server.listen(PORTS[i], '127.0.0.1', () => resolve(PORTS[i]));
    };
    tryPort(0);
  });
}

/** Janelas de login do Google/Firebase abrem dentro do app; o resto vai para o navegador */
function isAuthUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    return (
      pathname.startsWith('/__/auth/') ||
      hostname === 'accounts.google.com' ||
      hostname.endsWith('.firebaseapp.com') ||
      hostname.endsWith('.web.app')
    );
  } catch {
    return false;
  }
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: '#05070d',
    autoHideMenuBar: true,
    title: 'TypeCar',
    webPreferences: { backgroundThrottling: false },
  });
  mainWin = win;
  if (loadSettings().fullscreen) win.setFullScreen(true);
  // ?app=desktop: o jogo sabe que está no app e faz o login pelo navegador do sistema
  win.loadURL(`http://localhost:${port}/?app=desktop`);
  // F11 tela cheia, F12 ferramentas de desenvolvedor
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') setFullscreen(!win.isFullScreen());
    if (input.key === 'F12') win.webContents.toggleDevTools();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAuthUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: { width: 520, height: 680, autoHideMenuBar: true, title: 'Entrar com Google', parent: win },
      };
    }
    if (url.startsWith('http')) void shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  const port = await serve();
  createWindow(port);
});

app.on('window-all-closed', () => app.quit());
