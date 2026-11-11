// 普通话声韵拼合总表 — the three pinyin tables at the end of the textbook (pp. 173–175).
const INI = ['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'z', 'c', 's', 'zh', 'ch', 'sh', 'r', 'j', 'q', 'x', 'g', 'k', 'h'];

const ROWS1 = {
  '': 'a o e er ai ei ao ou an en ang eng',
  b: 'ba bo bai bei bao ban ben bang beng',
  p: 'pa po pai pei pao pou pan pen pang peng',
  m: 'ma mo me mai mei mao mou man men mang meng',
  f: 'fa fo fei fou fan fen fang feng',
  d: 'da de dai dei dao dou dan den dang deng dong',
  t: 'ta te tai tao tou tan tang teng tong',
  n: 'na ne nai nei nao nou nan nen nang neng nong',
  l: 'la le lai lei lao lou lan lang leng long',
  z: 'za ze zi zai zei zao zou zan zen zang zeng zong',
  c: 'ca ce ci cai cao cou can cen cang ceng cong',
  s: 'sa se si sai sao sou san sen sang seng song',
  zh: 'zha zhe zhi zhai zhei zhao zhou zhan zhen zhang zheng zhong',
  ch: 'cha che chi chai chao chou chan chen chang cheng chong',
  sh: 'sha she shi shai shei shao shou shan shen shang sheng',
  r: 're ri rao rou ran ren rang reng rong',
  g: 'ga ge gai gei gao gou gan gen gang geng gong',
  k: 'ka ke kai kei kao kou kan ken kang keng kong',
  h: 'ha he hai hei hao hou han hen hang heng hong',
};
const ROWS2 = {
  '': 'yi ya yao ye you yan yin yang ying yong',
  b: 'bi biao bie bian bin bing',
  p: 'pi piao pie pian pin ping',
  m: 'mi miao mie miu mian min ming',
  d: 'di diao die diu dian ding',
  t: 'ti tiao tie tian ting',
  n: 'ni niao nie niu nian nin niang ning',
  l: 'li lia liao lie liu lian lin liang ling',
  j: 'ji jia jiao jie jiu jian jin jiang jing jiong',
  q: 'qi qia qiao qie qiu qian qin qiang qing qiong',
  x: 'xi xia xiao xie xiu xian xin xiang xing xiong',
};
const ROWS3 = {
  '': 'wu wa wo wai wei wan wen wang weng yu yue yuan yun',
  b: 'bu', p: 'pu', m: 'mu', f: 'fu',
  d: 'du duo dui duan dun',
  t: 'tu tuo tui tuan tun',
  n: 'nu nuo nuan nü nüe',
  l: 'lu luo luan lun lü lüe',
  z: 'zu zuo zui zuan zun',
  c: 'cu cuo cui cuan cun',
  s: 'su suo sui suan sun',
  zh: 'zhu zhua zhuo zhuai zhui zhuan zhun zhuang',
  ch: 'chu chua chuo chuai chui chuan chun chuang',
  sh: 'shu shua shuo shuai shui shuan shun shuang',
  r: 'ru rua ruo rui ruan run',
  j: 'ju jue juan jun',
  q: 'qu que quan qun',
  x: 'xu xue xuan xun',
  g: 'gu gua guo guai gui guan gun guang',
  k: 'ku kua kuo kuai kui kuan kun kuang',
  h: 'hu hua huo huai hui huan hun huang',
};
const ZERO = {
  yi: 'i', ya: 'ia', yao: 'iao', ye: 'ie', you: 'iu', yan: 'ian', yin: 'in', yang: 'iang', ying: 'ing', yong: 'iong',
  wu: 'u', wa: 'ua', wo: 'uo', wai: 'uai', wei: 'ui', wan: 'uan', wen: 'un', wang: 'uang', weng: 'ueng',
  yu: 'ü', yue: 'üe', yuan: 'üan', yun: 'ün',
};

function finalOf(ini, syl) {
  if (!ini) return ZERO[syl] || syl;
  let f = syl.slice(ini.length);
  if ('zcs'.includes(ini) && f === 'i') return '-i';
  if (['zh', 'ch', 'sh', 'r'].includes(ini) && f === 'i') return '-i²';
  if ('jqx'.includes(ini) && f[0] === 'u') f = 'ü' + f.slice(1);
  return f;
}
function build(cols, rows) {
  return {
    cols,
    rows: INI.map(ini => {
      const cells = {};
      (rows[ini] || '').split(' ').filter(Boolean).forEach(s => { cells[finalOf(ini, s)] = s; });
      return { ini, cells: cols.map(c => cells[c] || '') };
    }),
  };
}
export const TABLES = [
  build(['a', 'o', 'e', '-i', '-i²', 'er', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'], ROWS1),
  build(['i', 'ia', 'iao', 'ie', 'iu', 'ian', 'in', 'iang', 'ing', 'iong'], ROWS2),
  build(['u', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ueng', 'ü', 'üe', 'üan', 'ün'], ROWS3),
];
export const ALL_SYLLABLES = [...new Set([ROWS1, ROWS2, ROWS3].flatMap(r => Object.values(r).flatMap(v => v.split(' '))))];

// File-safe key: ü -> v  (nü -> nv, lüe -> lve)
export const sylKey = s => s.replace(/ü/g, 'v');

// Put a tone mark on a toneless syllable: mark('zhong', 1) -> 'zhōng'
const MARKS = { a: 'āáǎà', o: 'ōóǒò', e: 'ēéěè', i: 'īíǐì', u: 'ūúǔù', ü: 'ǖǘǚǜ' };
export function mark(syl, tone) {
  syl = syl.replace(/v/g, 'ü');
  if (!tone || tone < 1 || tone > 4) return syl;
  let i = syl.search(/[ae]/);
  if (i < 0) i = syl.indexOf('ou');
  if (i < 0) { for (let k = syl.length - 1; k >= 0; k--) if ('aoeiuü'.includes(syl[k])) { i = k; break; } }
  if (i < 0) return syl;
  return syl.slice(0, i) + MARKS[syl[i]][tone - 1] + syl.slice(i + 1);
}
