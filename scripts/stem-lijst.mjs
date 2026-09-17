// stem-lijst.mjs — the catalogue of Muntje's voice files (V9.7, PLAN-V9 §C). Collects every sentence the game can send
// to the voice (docs/js/stem.js verzamelTeksten), writes docs/stem/lijst.json (hash → text), rewrites the STEM block
// in docs/sw.js so every file is precached, and prints the sentences that still have no mp3 — those go through
// Higgsfield text-to-speech (text2speech_v2, ElevenLabs, voice "Pixie", 0.15 credit each) and land as docs/stem/<hash>.mp3.
//   node scripts/stem-lijst.mjs            → writes the catalogue, prints what is missing (JSON, 12 per batch)
//   node scripts/stem-lijst.mjs --check    → only reports (exit 1 when a file is missing); the unit test does the same
import fs from 'node:fs';
import path from 'node:path';
import { T as NL } from '../docs/js/i18n.js';
import { KETENS } from '../docs/content/ketens.js';
import { CAMPAGNE } from '../docs/content/campagne.js';
import { verzamelTeksten, hashTekst, STEM_MAP } from '../docs/js/stem.js';

const docs = path.resolve('docs');
const dir = path.join(docs, STEM_MAP);
const check = process.argv.includes('--check');
fs.mkdirSync(dir, { recursive: true });

const teksten = verzamelTeksten({ i18n: NL, ketens: KETENS, campagne: CAMPAGNE });
const lijst = {};
for (const t of teksten) lijst[hashTekst(t)] = t;
const hashes = Object.keys(lijst).sort();
const missing = hashes.filter((h) => !fs.existsSync(path.join(dir, `${h}.mp3`)));
const stale = fs.readdirSync(dir).filter((f) => f.endsWith('.mp3') && !lijst[f.slice(0, -4)]);

if (!check) {
  // the catalogue lists only the sentences whose file is in: the player never fetches a 404, the iPad voice takes the rest
  fs.writeFileSync(path.join(dir, 'lijst.json'), JSON.stringify(Object.fromEntries(hashes.filter((h) => !missing.includes(h)).map((h) => [h, lijst[h]])), null, 1) + '\n');
  // the PRECACHE block: everything under stem/ that exists (the catalogue plus the files that are in)
  const sw = path.join(docs, 'sw.js');
  let src = fs.readFileSync(sw, 'utf8');
  const nl = src.includes('\r\n') ? '\r\n' : '\n';
  const files = ['lijst.json', ...hashes.filter((h) => !missing.includes(h)).map((h) => `${h}.mp3`)];
  const block = `  // STEM-BEGIN (written by scripts/stem-lijst.mjs: Muntje's voice files, V9.7)${nl}${files.map((f) => `  './${STEM_MAP}${f}',`).join(nl)}${nl}  // STEM-EINDE`;
  if (/\/\/ STEM-BEGIN[\s\S]*?\/\/ STEM-EINDE/.test(src)) src = src.replace(/  \/\/ STEM-BEGIN[\s\S]*?\/\/ STEM-EINDE/, block);
  else src = src.replace(/(  '\.\/modellen\/boot\.glb',\r?\n)/, `$1${block}${nl}`);
  fs.writeFileSync(sw, src);
}

console.log(`${teksten.length} zinnen, ${hashes.length - missing.length} met bestand, ${missing.length} zonder, ${stale.length} bestanden zonder zin${stale.length ? ': ' + stale.join(' ') : ''}`);
if (missing.length && !check) {
  for (let i = 0; i < missing.length; i += 12) {
    console.log(`--- batch ${i / 12 + 1}`);
    console.log(JSON.stringify(missing.slice(i, i + 12).map((h, j) => ({ index: i + j, hash: h, tekst: lijst[h] }))));
  }
}
if (check && (missing.length || stale.length)) process.exit(1);
