"""Extract speaking-workshop content (language bank, role plays, conversation
questions and model answers) from the Topic A Speaking Workshop decks into
src/data/topic-a-workshops.json.
Usage: python3 src/extract_topic_a.py <folder with AT-A-L*_Speaking_Workshop_*.pptx>
(in the Miftah_arabic repository that folder is Topic_A/Exam_Practice)."""
import glob, json, os, re, sys
from pptx import Presentation

E = 914400
HERE = os.path.dirname(os.path.abspath(__file__))
AR = re.compile(r'[؀-ۿ]')
LEVELS = {'CORE': 'core', 'CORE+': 'core', 'DEVELOP': 'develop', 'STRETCH': 'stretch'}


PROPER = ['Amman', 'Arabic', 'Arab', 'Cairo', 'Dubai', 'Jordan', 'Egypt']


def sentence(t):
    t = t.lower().capitalize()
    for w in PROPER:
        t = re.sub(r'\b' + w.lower() + r'\b', w, t)
    return t


def shapes(slide):
    out = []
    for sh in slide.shapes:
        if sh.has_text_frame and sh.text_frame.text.strip():
            out.append(dict(x=sh.left / E, y=sh.top / E, w=sh.width / E,
                            t=sh.text_frame.text.strip()))
    return out


def at(S, x, y, tol=0.06):
    return next((s['t'] for s in S if abs(s['x'] - x) < tol and abs(s['y'] - y) < tol), '')


def rows(S):
    """Split a numbered table slide into rows keyed by its column headers."""
    heads = sorted([s for s in S if abs(s['y'] - 1.98) < 0.05 and s['t'] != '#'], key=lambda s: s['x'])
    anchors = sorted([s for s in S if 0.55 < s['x'] < 0.7 and s['w'] < 0.5 and s['y'] > 2.3
                      and re.match(r'^\d', s['t'])], key=lambda s: s['y'])
    out = []
    for i, a in enumerate(anchors):
        lo, hi = a['y'] - 0.08, (anchors[i + 1]['y'] - 0.08 if i + 1 < len(anchors) else 6.45)
        row = {'n': int(re.match(r'\d+', a['t']).group()), 'unexpected': '!' in a['t']}
        for s in S:
            if s is a or not (lo <= s['y'] < hi) or s['x'] < 0.7:
                continue
            if s['t'] in LEVELS:
                row['level'] = LEVELS[s['t']]
                continue
            col = [h for h in heads if h['x'] <= s['x'] + 0.12]
            if not col:
                continue
            key = col[-1]['t']
            if key.startswith('Model answer'):
                key = 'model' if AR.search(s['t']) else 'en'
            row[key] = s['t']
        out.append(row)
    return out


def bank(S):
    items = []
    for a in S:
        if not (abs(a['w'] - 0.34) < 0.03 and a['y'] > 2 and a['t'].isdigit()):
            continue
        x, y = a['x'], a['y']
        head = at(S, x, y + 0.32)
        meta = at(S, x + 0.03, y + 1.08).split('\n')
        tag = next((s['t'] for s in S if abs(s['y'] - y - 0.02) < 0.04 and x + 0.3 < s['x'] < x + 1.5), '')
        forms = []
        for lab in S:
            if abs(lab['y'] - y - 1.67) < 0.05 and x - 0.01 < lab['x'] < x + 3.0 and lab['w'] > 0.9 and not AR.search(lab['t']):
                form = next((s['t'] for s in S if AR.search(s['t']) and abs(s['x'] - lab['x'] + 0.01) < 0.04
                             and 0 < s['y'] - lab['y'] < 0.3), '')
                if form:
                    forms.append({'label': lab['t'], 'ar': form})
        forms.sort(key=lambda f: next(s['x'] for s in S if s['t'] == f['label'] and abs(s['y'] - y - 1.67) < 0.05 and x - 0.01 < s['x'] < x + 3.0))
        items.append({'n': int(a['t']), 'ar': head, 'en': meta[0], 'tr': meta[1] if len(meta) > 1 else '',
                      'kind': tag, 'forms': forms})
    return sorted(items, key=lambda i: i['n'])


def lesson(path):
    p = Presentation(path)
    code = re.search(r'(AT-A-L\d\d)', path).group(1)
    L = {'code': code, 'bank': [], 'roleplays': {}, 'conversation': []}
    cover = shapes(p.slides[0])
    L['title'] = next(s['t'] for s in cover if s['t'].startswith('Speaking Workshop')).split('—', 1)[1].strip()
    L['arabic'] = next(s['t'] for s in cover if s['t'].startswith('وَرْشَةُ')).split('—', 1)[-1].strip()
    L['intro'] = next((s['t'] for s in cover if 'practice' in s['t'] and len(s['t']) > 60), '')
    conv = {}
    for slide in p.slides:
        S = shapes(slide)
        head = at(S, 0.5, 0.9)
        title = at(S, 0.5, 1.13)
        artitle = at(S, 8.2, 0.95, 0.08)
        foot = at(S, 0.5, 6.5)
        if head.startswith('LANGUAGE BANK'):
            L['bank'].append({'title': title, 'arabic': artitle, 'items': bank(S)})
        elif head.startswith('ROLE PLAY'):
            m = re.match(r'ROLE PLAY (\w) · ([A-Z+]+) · (.*)', head)
            letter, lvl, setting = m.groups()
            you = re.search(r'You are: (.*?)\s+·\s+The examiner is: (.*?)\s+·', foot)
            L['roleplays'][letter] = {
                'id': letter, 'level': LEVELS[lvl], 'tier': lvl, 'setting': sentence(setting),
                'title': title.split('—', 1)[-1].strip(), 'arabic': artitle,
                'you': you.group(1) if you else '', 'examiner': you.group(2) if you else '',
                'tasks': [{'n': r['n'], 'unexpected': r['unexpected'], 'examiner': r.get('The examiner says', ''),
                           'task': r.get('Your task', ''), 'help': r.get('Help (Core)', '')} for r in rows(S)]}
        elif head.startswith('MODEL ANSWER · ROLE PLAY'):
            letter = re.search(r'ROLE PLAY (\w)', head).group(1)
            for r in rows(S):
                t = L['roleplays'][letter]['tasks'][r['n'] - 1]
                t['model'], t['en'] = r.get('model', ''), r.get('en', '')
        elif head.startswith('TOPIC CONVERSATION'):
            lvl = LEVELS[head.split('·')[1].split()[0]]
            for r in rows(S):
                conv[(lvl, r['n'])] = {'level': lvl, 'q': r.get('The examiner asks', ''), 'qen': r.get('Meaning', ''),
                                       'starter': r.get('Start like this', '')}
        elif head.startswith('MODEL ANSWERS · TOPIC CONVERSATION'):
            lvl = LEVELS[head.split('·')[2].strip()]
            for r in rows(S):
                c = conv[(lvl, r['n'])]
                c['model'], c['en'] = r.get('model', ''), r.get('en', '')
    order = {'core': 0, 'develop': 1, 'stretch': 2}
    L['conversation'] = [conv[k] for k in sorted(conv, key=lambda k: (order[k[0]], k[1]))]
    L['roleplays'] = [L['roleplays'][k] for k in sorted(L['roleplays'])]
    return L


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    files = sorted(glob.glob(os.path.join(sys.argv[1], 'AT-A-L*_Speaking_Workshop_*.pptx')))
    data = [lesson(f) for f in files]
    out = os.path.join(HERE, 'data', 'topic-a-workshops.json')
    json.dump({'unit': 'TA', 'lessons': data}, open(out, 'w'), ensure_ascii=False, indent=1)
    for L in data:
        miss = [(r['id'], t['n']) for r in L['roleplays'] for t in r['tasks'] if not t.get('model') or not t['examiner']]
        missc = [c['q'][:20] for c in L['conversation'] if not c.get('model')]
        print(L['code'], L['title'], len(L['bank']), [len(b['items']) for b in L['bank']], len(L['roleplays']),
              [len(r['tasks']) for r in L['roleplays']], len(L['conversation']), 'MISSING', miss, missc)
