/* Servidor local para jugar a Shadow President 1990.
   Uso:  node tools/server.js [PUERTO]
   Sirve la carpeta del proyecto en http://127.0.0.1:PUERTO */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = parseInt(process.argv[2] || process.env.PORT || '8099', 10);
const host = '127.0.0.1';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(function (req, res) {
  let rel;
  try {
    rel = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400); return res.end('Petición inválida');
  }
  if (rel === '/' || rel === '') rel = '/index.html';

  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Prohibido'); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('No encontrado: ' + rel);
  }

  res.writeHead(200, {
    'Content-Type': TIPOS[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(file).pipe(res);
});

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('El puerto ' + port + ' está ocupado. Prueba otro:  node tools/server.js 8100');
  } else {
    console.error('Error: ' + err.message);
  }
  process.exit(1);
});

server.listen(port, host, function () {
  console.log('');
  console.log('  Shadow President 1990');
  console.log('  Juego disponible en:  http://' + host + ':' + port);
  console.log('  (Ctrl + C para terminar)');
  console.log('');
});
