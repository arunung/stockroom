// Assembles the static site into ./dist
//   dist/index.html + app.js + shim.js + vendor/supabase.js + config.js + _headers   (deploy this)
//   dist/artifact.html                                                              (single file for claude.ai Artifact; no login/DB adapter)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const R = (...p) => path.join(root, ...p);
const read = (f) => fs.readFileSync(R('src', f), 'utf8');
const dist = R('dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'vendor'), { recursive: true });

const ORDER = ['10-core', '20-pages-a', '30-pages-b', '40-pages-c', '60-print', '70-admin', '50-app'];
const appJs = '(function(){\n"use strict";\n' + ORDER.map((n) => read(n + '.js')).join('\n') + '\n})();\n';
const style = read('01-style.html'); // <title>, font links, <style>
const body = read('02-body.html');
const shim = read('shim.js');
const sup = fs.readFileSync(R('node_modules/@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');
const h = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

// ---- config.js: environment variables win over the committed file (Cloudflare Pages → Settings → Variables)
let config = fs.readFileSync(R('config.js'), 'utf8');
const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || '').trim();
if (url || key) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) throw new Error('SUPABASE_URL must look like https://xxxx.supabase.co');
  if (key.length < 40) throw new Error('SUPABASE_ANON_KEY looks too short');
  config = `window.STOCKROOM_CONFIG=${JSON.stringify({ supabaseUrl: url.replace(/\/$/, ''), supabaseAnonKey: key })};\n`;
}
// Safety net: refuse to ship a service_role / secret key to the browser
for (const m of config.matchAll(/eyJ[\w-]+\.([\w-]+)\.[\w-]+/g)) {
  try { if (JSON.parse(Buffer.from(m[1], 'base64url').toString()).role === 'service_role') throw new Error('x'); }
  catch (e) { if (e.message === 'x') throw new Error('config contains a service_role key — use the anon/publishable key only'); }
}
if (/sb_secret_/.test(config)) throw new Error('config contains a secret key — use the publishable key only');

fs.writeFileSync(path.join(dist, 'config.js'), config);
fs.writeFileSync(path.join(dist, 'app.js'), appJs);
fs.writeFileSync(path.join(dist, 'shim.js'), shim);
fs.writeFileSync(path.join(dist, 'vendor', 'supabase.js'), sup);
fs.copyFileSync(R('public', '_headers'), path.join(dist, '_headers'));

const index = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><meta name="robots" content="noindex">
${style}
</head><body>
${body}
<script src="config.js"></script>
<script src="vendor/supabase.js?v=${h(sup)}"></script>
<script src="shim.js?v=${h(shim)}"></script>
<script src="app.js?v=${h(appJs)}"></script>
</body></html>
`;
fs.writeFileSync(path.join(dist, 'index.html'), index);

// ---- single-file build for the claude.ai Artifact runtime
fs.writeFileSync(path.join(dist, 'artifact.html'), style + body + '<script>\n' + appJs + '</script>\n');

console.log('built', fs.readdirSync(dist).join(', '), '| app.js', appJs.length, 'bytes');
