// Local mock of the Apps Script web app for testing order.html: node tests/mock-server.js [port]
// Serves the repo statically and /exec (GET ?view=inventory|print|hub, POST orders) using the real .gs code over in-memory sheets.
const http = require('http'), fs = require('fs'), path = require('path'), { load } = require('./gas-harness');
const h = load(), root = path.join(__dirname, '..'), port = +process.argv[2] || 8822;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.css': 'text/css' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/exec') {
    const send = out => { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(out.getContent()); };
    if (req.method === 'POST') { let b = ''; req.on('data', c => b += c); req.on('end', () => send(h.ctx.doPost({ postData: { contents: b } }))); return; }
    const p = Object.fromEntries(u.searchParams); const out = h.ctx.iennRoute_({ parameter: p });
    if (!out) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': p.view === 'inventory' ? 'application/json' : 'text/html', 'Access-Control-Allow-Origin': '*' }); return res.end(out.getContent());
  }
  const f = path.join(root, decodeURIComponent(u.pathname === '/' ? '/order.html' : u.pathname));
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('mock on http://localhost:' + port));
