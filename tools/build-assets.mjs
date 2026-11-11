// Copies the vendored libraries, bundles stroke data for every character of the lesson,
// and exports the list of audio clips to synthesise.
//   node tools/build-assets.mjs <node_modules dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_HANZI, audioList, DIALOGUE } from '../js/data.js';
import { ALL_SYLLABLES, sylKey } from '../js/pinyin-table.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = path.resolve(process.argv[2] || 'node_modules');

fs.copyFileSync(path.join(nm, 'hanzi-writer/dist/hanzi-writer.min.js'), path.join(root, 'vendor/hanzi-writer.min.js'));
fs.copyFileSync(path.join(nm, 'pinyin-pro/dist/index.js'), path.join(root, 'vendor/pinyin-pro.js'));

const chars = {};
for (const c of ALL_HANZI) {
  const f = path.join(nm, 'hanzi-writer-data', c + '.json');
  if (!fs.existsSync(f)) { console.warn('no stroke data for', c); continue; }
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  chars[c] = { strokes: d.strokes, medians: d.medians, radStrokes: d.radStrokes };
}
fs.writeFileSync(path.join(root, 'data/chars.json'), JSON.stringify(chars));
console.log('chars:', Object.keys(chars).length);

const voices = { sami: 'zh-CN-YunxiNeural', xiaomei: 'zh-CN-XiaoxiaoNeural', mali: 'zh-CN-XiaoyiNeural' };
const byLine = Object.fromEntries(DIALOGUE.map(d => [d.s, voices[d.who]]));
const list = audioList();
const clips = Object.entries(list).map(([id, text]) => ({ id, text, voice: id.startsWith('s_d') ? byLine[id] : undefined }));
fs.writeFileSync(path.join(root, 'tools/audio-list.json'),
  JSON.stringify({ clips, syllables: ALL_SYLLABLES.map(sylKey) }, null, 1));
console.log('clips:', clips.length, 'syllables:', ALL_SYLLABLES.length);
