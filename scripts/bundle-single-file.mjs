/**
 * Inlines the Vite build into a single self-contained HTML fragment.
 *
 * Output is body content only — no <!doctype>, <html>, <head> or <body> — so it
 * can be dropped into a host that supplies its own document skeleton, and it
 * makes zero external requests, which is what lets it run under a strict CSP
 * or straight off the file system.
 *
 *   npm run build && node scripts/bundle-single-file.mjs [outfile]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = resolve(process.argv[2] ?? join(dist, 'planner-standalone.html'));

let assets;
try {
  assets = readdirSync(join(dist, 'assets'));
} catch {
  console.error('No dist/assets — run `npm run build` first.');
  process.exit(1);
}

const pick = (ext) => {
  const file = assets.find((f) => f.endsWith(ext));
  if (!file) {
    console.error(`No ${ext} file in dist/assets.`);
    process.exit(1);
  }
  return readFileSync(join(dist, 'assets', file), 'utf8');
};

const css = pick('.css');
const js = pick('.js');

// A literal `</script>` anywhere in the bundle would close the tag early.
const safeJs = js.replace(/<\/script/gi, '<\\/script');
const safeCss = css.replace(/<\/style/gi, '<\\/style');

const html = `<title>España — Trip Planner</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
${safeCss}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;

writeFileSync(out, html);
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(`Wrote ${out}`);
console.log(`  css ${kb(css.length)} · js ${kb(js.length)} · total ${kb(html.length)}`);
