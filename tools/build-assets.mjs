// Copies the vendored libraries, bundles stroke data for every character of the lesson,
// and exports the list of audio clips to synthesise.
//   node tools/build-assets.mjs <node_modules dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_HANZI, audioList } from '../js/data.js';
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

// Every clip, dialogue lines included, is said by the voice the learners chose by ear (gen_audio.py LESSON_VOICE):
// the other voices said h and r wrongly for them (好 must sound "khao", 人 "jen").
const list = audioList();
const clips = Object.entries(list).map(([id, text]) => ({ id, text }));
fs.writeFileSync(path.join(root, 'tools/audio-list.json'),
  JSON.stringify({ clips, syllables: ALL_SYLLABLES.map(sylKey) }, null, 1));
console.log('clips:', clips.length, 'syllables:', ALL_SYLLABLES.length);
