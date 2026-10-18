'use strict';
// Builds the Speaking Mastery Studio pages (one self-contained HTML file per lesson)
// and the hub page into ../site/.
// Usage: node src/build.js                 (from the repository root)
//
// Content sources (src/data/):
//   topic-a-workshops.json     extracted from the Topic A Speaking Workshop decks
//                              (python3 src/extract_topic_a.py <folder of decks>)
//   advanced-topics-ab.json    Topic A lesson titles
//   d1/*.json, d2/*.json       role plays + conversation written for D1 / D2
//                              (one file per lesson, keyed by lesson code; _unit.json holds liftMark)
//   d1-content.json, d2-content.json  lesson titles and vocabulary (key language)
//
// Optional teacher recordings: drop MP3s into site/<unit>/audio/<CODE>/<item-id>.mp3
// and rebuild; the page plays them instead of the device voice. Item ids are listed in
// Speaking_Mastery/<unit>/audio/<CODE>/ids.txt after each build.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const OUT = path.join(__dirname, '..', 'site');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const TEMPLATE = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const LEVELS = ['core', 'develop', 'stretch'];

const REPAIR = [
  { ar: 'عَفْوًا، هَلْ يُمْكِنُ أَنْ تُعِيدَ السُّؤَالَ؟', en: 'Sorry, could you repeat the question?', tr: 'to m. · to f.: تُعِيدِي', forms: [{ label: 'to m.', ar: 'تُعِيدَ' }, { label: 'to f.', ar: 'تُعِيدِي' }] },
  { ar: 'هَلْ يُمْكِنُ أَنْ تَتَكَلَّمَ بِبُطْءٍ، مِنْ فَضْلِكَ؟', en: 'Could you speak slowly, please?', forms: [{ label: 'to m.', ar: 'تَتَكَلَّمَ … مِنْ فَضْلِكَ' }, { label: 'to f.', ar: 'تَتَكَلَّمِي … مِنْ فَضْلِكِ' }] },
  { ar: 'لَحْظَةً، دَعْنِي أُفَكِّرُ …', en: 'One moment, let me think …', forms: [{ label: 'to m.', ar: 'دَعْنِي' }, { label: 'to f.', ar: 'دَعِينِي' }] },
  { ar: 'مَا مَعْنَى …؟', en: 'What does … mean?' },
  { ar: 'أَقْصِدُ …', en: 'I mean …' },
  { ar: 'لَا أَعْرِفُ الكَلِمَةَ، وَلٰكِنْ …', en: 'I don’t know the word, but …' },
  { ar: 'بِعِبَارَةٍ أُخْرَى …', en: 'In other words …' },
  { ar: 'سُؤَالٌ جَيِّدٌ! فِي رَأْيِي …', en: 'Good question! In my opinion …' },
];

const UNITS = [
  { key: 'topic-a', code: 'TA', label: 'Topic A', title: 'Everyday Activities', arabic: 'الأَنْشِطَةُ اليَوْمِيَّةُ', icon: '☀️',
    blurb: 'Time and routine, food and drink, health and travel — exam-style role plays and topic conversations from the Topic A speaking workshops.' },
  { key: 'd1', code: 'D1', label: 'Development D1', title: 'Daily Routine and Time', arabic: 'الرُّوتِينُ اليَوْمِيُّ وَالوَقْتُ', icon: '🌅',
    blurb: 'Routines, precise time, frequency and sequencing — I, he, she and you, in present, past and future.' },
  { key: 'd2', code: 'D2', label: 'Development D2', title: 'Personality, Relationships and Clothes', arabic: 'الشَّخْصِيَّةُ وَالعَلَاقَاتُ وَالمَلَابِسُ', icon: '🧠',
    blurb: 'Describing people, relationships, shopping for clothes and opinions on style — with comparison and evidence.' },
];

/* ---------- normalisers ---------- */
function withIds(code, L) {
  L.bank.forEach((g, gi) => g.items.forEach((w, i) => {
    w.id = `${code}-b${gi + 1}-${i + 1}`;
    (w.forms || []).forEach((f, k) => { f.id = `${w.id}-f${k + 1}`; });
  }));
  L.roleplays.forEach((r) => r.tasks.forEach((t, i) => {
    t.id = t.id || `${code}-rp${r.id}-${i + 1}`;
    t.n = i + 1;
    t.unexpected = !!t.unexpected;
  }));
  const counts = {};
  L.conversation.forEach((c) => { counts[c.level] = (counts[c.level] || 0) + 1; c.id = c.id || `${code}-c-${c.level}-${counts[c.level]}`; });
  return L;
}

function topicA() {
  const ws = read('topic-a-workshops.json').lessons;
  const meta = read('advanced-topics-ab.json').a.lessons;
  return ws.map((w) => {
    const m = meta.find((x) => x.code === w.code) || {};
    return withIds(w.code, {
      code: w.code, title: m.title || w.title, arabic: m.arabic || w.arabic, intro: w.intro || m.focus,
      bank: w.bank.map((g) => ({ title: g.title, arabic: g.arabic, items: g.items.map((i) => ({ ar: i.ar, en: i.en, tr: i.tr, kind: i.kind, forms: i.forms })) })),
      roleplays: w.roleplays.map((r) => ({ id: r.id, level: r.level, setting: r.setting, title: r.title, arabic: r.arabic, you: r.you, examiner: r.examiner,
        tasks: r.tasks.map((t) => ({ examiner: t.examiner, task: t.task, help: t.help, model: t.model, en: t.en, unexpected: t.unexpected })) })),
      conversation: w.conversation.map((c) => ({ level: c.level, q: c.q, qen: c.qen, starter: c.starter, model: c.model, en: c.en })),
    });
  });
}

// "وَدُودٌ / وَدُودَةٌ" → headword + m./f. forms
function bankFromVocab(groups) {
  return groups.map((g) => ({
    title: g.label, arabic: '',
    items: g.items.map((i) => {
      const parts = i.ar.split(' / ').map((s) => s.trim());
      const w = { ar: parts[0], en: i.en, tr: '', kind: i.note || '' };
      if (parts.length === 2 && !/[.…]/.test(i.ar)) w.forms = [{ label: 'm.', ar: parts[0] }, { label: 'f.', ar: parts[1] }];
      return w;
    }),
  }));
}

function devUnit(key) {
  const content = read(`${key}-content.json`).lessons;
  const sdir = path.join(DATA, key);
  const speaking = Object.assign({}, ...fs.readdirSync(sdir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(sdir, f), 'utf8'))));
  const missing = content.filter((c) => !speaking[c.code]).map((c) => c.code);
  if (missing.length) console.warn(`  ${key.toUpperCase()}: no speaking content yet for ${missing.join(', ')} — skipped`);
  const lessons = content.filter((c) => speaking[c.code]).map((c) => {
    const s = speaking[c.code];
    return withIds(c.code, {
      code: c.code, title: c.title, arabic: c.arabic, intro: s.intro || c.summary,
      bank: bankFromVocab(c.vocab), roleplays: s.roleplays, conversation: s.conversation,
    });
  });
  if (!lessons.length) return null;
  // L12 — unit review: a mock built from the whole unit
  const code = `${key.toUpperCase()}-L12`;
  const pick = (arr, n) => arr.filter((_, i) => i % Math.ceil(arr.length / n) === 0).slice(0, n);
  const allRP = lessons.flatMap((l) => l.roleplays.map((r) => ({ ...r, from: l })));
  const rps = [allRP.find((r) => r.from.code.endsWith('L02') && r.level === 'core'), allRP.find((r) => r.from.code.endsWith('L05') && r.level === 'develop'),
    allRP.find((r) => r.from.code.endsWith('L08') && r.level === 'develop'), allRP.find((r) => r.from.code.endsWith('L10') && r.level === 'stretch')].filter(Boolean)
    .map((r, i) => ({ ...r, id: 'ABCD'[i], setting: `${r.setting} · from ${r.from.code}`, from: undefined, tasks: r.tasks.map((t) => ({ ...t })) }));
  const conv = LEVELS.flatMap((lv) => pick(lessons.flatMap((l) => l.conversation.filter((c) => c.level === lv).map((c) => ({ ...c, qen: `${c.qen} (${l.code})` }))), 5));
  const bank = [{ title: 'Unit essentials — one key chunk from every lesson', arabic: 'خُلَاصَةُ الوَحْدَةِ', items: lessons.map((l) => ({ ...l.bank[0].items[0], kind: l.code, forms: l.bank[0].items[0].forms })) },
    { title: 'Structures that lift a mark', arabic: 'بِنْيَاتٌ تَرْفَعُ الدَّرَجَةَ', items: speaking.liftMark || [] }].filter((g) => g.items.length);
  const unit = UNITS.find((u) => u.key === key);
  lessons.push(withIds(code, {
    code, title: 'Review and Unit Assessment — Speaking Mock', arabic: 'المُرَاجَعَةُ وَتَقْيِيمُ الوَحْدَةِ — امْتِحَانُ التَّحَدُّثِ', isMock: true,
    intro: `A full ${unit.label} speaking review: four role plays and fifteen conversation questions drawn from every lesson in the unit. Use the mock exam to rehearse the real thing.`,
    bank: JSON.parse(JSON.stringify(bank)), roleplays: rps, conversation: conv,
  }));
  return lessons;
}

/* ---------- page output ---------- */
const slug = (code) => code.toLowerCase();
function audioFor(unitKey, code) {
  const dir = path.join(OUT, unitKey, 'audio', code);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, ''));
}
function allIds(L) {
  const ids = [];
  L.bank.forEach((g) => g.items.forEach((w) => { ids.push(`${w.id}\t${w.ar}`); (w.forms || []).forEach((f) => ids.push(`${f.id}\t${f.ar}`)); }));
  L.roleplays.forEach((r) => r.tasks.forEach((t) => { ids.push(`rpx:${t.id}\t${t.examiner}`); ids.push(`rpm:${t.id}\t${t.model}`); }));
  L.conversation.forEach((c) => { ids.push(`cvq:${c.id}\t${c.q}`); ids.push(`cvm:${c.id}\t${c.model}`); });
  return ids;
}
function writeLesson(unit, L, prev, next) {
  const repair = REPAIR.map((r, i) => ({ ...r, id: `rep-${i + 1}`, forms: (r.forms || []).map((f, k) => ({ ...f, id: `rep-${i + 1}-f${k + 1}` })), tr: '' }));
  const audio = audioFor(unit.key, L.code);
  const data = { ...L, unit: { code: unit.code, label: unit.label, title: unit.title, arabic: unit.arabic }, repair,
    audio: audio.map((f) => f.replace(/^(rpx|rpm|cvq|cvm)_/, '$1:')), audioBase: `audio/${L.code}/`,
    nav: { hub: '../index.html', prev: prev && { href: `${slug(prev.code)}.html`, code: prev.code, title: prev.title }, next: next && { href: `${slug(next.code)}.html`, code: next.code, title: next.title } } };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = TEMPLATE.replace('__TITLE__', `${L.code} · ${L.title} | Miftah Speaking Mastery`.replace(/&/g, '&amp;')).replace('__DATA__', () => json);
  const dir = path.join(OUT, unit.key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug(L.code)}.html`), html);
  const adir = path.join(dir, 'audio', L.code);
  fs.mkdirSync(adir, { recursive: true });
  fs.writeFileSync(path.join(adir, 'ids.txt'), '# Optional: record any line as <id>.mp3 in this folder (use _ instead of : in the file name, e.g. rpm_AT-A-L01-rpA-1.mp3), then rebuild.\n' + allIds(L).join('\n') + '\n');
  return { code: L.code, title: L.title, arabic: L.arabic, href: `${unit.key}/${slug(L.code)}.html`, isMock: !!L.isMock,
    items: L.roleplays.reduce((a, r) => a + r.tasks.length, 0) + L.conversation.length,
    counts: { rp: L.roleplays.length, conv: L.conversation.length, bank: L.bank.reduce((a, g) => a + g.items.length, 0) } };
}

function build() {
  const has = (k) => fs.existsSync(path.join(DATA, k));
  const units = { 'topic-a': topicA(), d1: has('d1') && devUnit('d1'), d2: has('d2') && devUnit('d2') };
  const hub = [];
  for (const unit of UNITS) {
    const lessons = units[unit.key];
    if (!lessons) { console.warn(`${unit.label}: no speaking content yet — skipped`); continue; }
    const cards = lessons.map((L, i) => writeLesson(unit, L, lessons[i - 1], lessons[i + 1]));
    hub.push({ ...unit, lessons: cards });
    console.log(`${unit.label}: ${cards.length} pages`);
  }
  const hubHtml = fs.readFileSync(path.join(__dirname, 'hub.html'), 'utf8').replace('__DATA__', () => JSON.stringify(hub).replace(/</g, '\\u003c'));
  fs.writeFileSync(path.join(OUT, 'index.html'), hubHtml);
  console.log(`Hub: ${path.join(OUT, 'index.html')}`);
}

build();
