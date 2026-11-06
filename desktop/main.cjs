const { app, BrowserWindow, dialog, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// A fixed loopback origin lets the macOS companion allow only this desktop app's origin.
const origin = 'http://127.0.0.1:5179';
let server;

async function start() {
  const root = path.join(app.getAppPath(), 'dist');
  server = http.createServer((req, res) => {
    if (req.method !== 'GET' || req.headers.host !== '127.0.0.1:5179') {
      res.writeHead(403).end();
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, origin).pathname); }
    catch { res.writeHead(400).end(); return; }
    // Only the bundled page and sound assets are served, never arbitrary local files.
    if (pathname === '/') pathname = '/index.html';
    if (pathname !== '/index.html' && !/^\/sounds\/[a-zA-Z0-9_-]+\.mp3$/.test(pathname)) {
      res.writeHead(404).end(); return;
    }
    const file = path.join(root, pathname.slice(1));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, {
        'Content-Type': pathname.endsWith('.html') ? 'text/html; charset=utf-8' : 'audio/mpeg',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(5179, '127.0.0.1', resolve);
  });
  const window = new BrowserWindow({
    width: 1280, height: 900, minWidth: 480, minHeight: 640,
    title: 'iOS Simulator',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin + '/')) event.preventDefault();
  });
  await window.loadURL(origin + '/');
}
app.whenReady().then(start).catch((error) => {
  dialog.showErrorBox('Unable to start iOS Simulator', `Could not start the local desktop interface. Ensure port 5179 is available.\n\n${error.message}`);
  app.quit();
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (server) server.close(); });
