// Reads { input, theme } JSON on stdin and prints a self-contained HTML dither.
import fs from 'node:fs';
import { validate } from './validate.mjs';

const escape = (value) => String(value).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const { input, theme } = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
try {
	validate(input);
} catch (error) {
	process.stderr.write(error.message);
	process.exit(1);
}
const data = JSON.stringify(input).replace(/</g, '\\u003c');
const title = input.title?.trim();
const dark = theme === 'dark';
// Palette from dithercn's dither-tokens, tuned for light and dark.
const palette = dark
	? { blue: '0.72 0.14 240', purple: '0.7 0.18 304', green: '0.78 0.17 152', pink: '0.74 0.17 354', orange: '0.79 0.15 62', red: '0.68 0.2 25', grey: '0.66 0 0' }
	: { blue: '0.56 0.18 248', purple: '0.53 0.22 302', green: '0.58 0.15 152', pink: '0.58 0.21 355', orange: '0.64 0.17 52', red: '0.55 0.21 27', grey: '0.55 0 0' };
const tokens = Object.entries(palette)
	.map(([name, value]) => `--dither-color-${name}:oklch(${value});`)
	.join('');
const bundle = fs.readFileSync(new URL('browser.js', import.meta.url), 'utf8');

process.stdout.write(`<!doctype html>
<html><head><meta charset="utf-8"><style>
:root{--dither-ink:var(--primary,CanvasText);--dither-paper:var(--background,Canvas);--dither-cell:3px;${tokens}}
html,body{height:100%;margin:0;background:var(--background,Canvas);color:var(--foreground,CanvasText);color-scheme:${dark ? 'dark' : 'light'};font:13px system-ui,sans-serif}
body{display:flex;flex-direction:column;padding:8px 12px;box-sizing:border-box}
h3{margin:0;font-size:14px;font-weight:600}p{margin:2px 0 0;opacity:.7}
#dither{position:relative;flex:1;min-height:0;border-radius:var(--radius,0);overflow:hidden}
h3 + #dither,p + #dither{margin-top:8px}
.dither,.dither [data-dither-fallback],.dither [data-dither-fallback]>div{position:absolute;inset:0}
.dither{overflow:hidden;pointer-events:none}
.dither canvas{position:absolute;top:0;left:0;display:block;image-rendering:pixelated}
.dither [data-dither-fallback]{opacity:0}
.dither[data-state=fallback] [data-dither-fallback]{opacity:1}
.dither[data-state=fallback] canvas{opacity:0}
</style></head><body>
${title ? `<h3>${escape(title)}</h3>` : ''}${input.description ? `<p>${escape(input.description)}</p>` : ''}
<div id="dither"></div>
<script id="dither-input" type="application/json">${data}</script>
<script>${bundle}</script>
</body></html>`);
