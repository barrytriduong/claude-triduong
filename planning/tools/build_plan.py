import re, json, unicodedata, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
OUT = os.path.join(HERE, '..')
from data_a1_a2 import A1, A2
from data_b1_b2 import B1, B2
from overrides import apply
apply(A1 + A2 + B1 + B2)

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

# Queues per level. Put the two repeat people far from their first story.
queues = {'A1': A1[:], 'A2': A2[:], 'B1': B1[:], 'B2': B2[:]}
def move(q, person, pos):
    i = next(i for i, e in enumerate(q) if e['person'] == person); e = q.pop(i); q.insert(pos, e)
move(queues['B1'], 'Temple Grandin', 0)          # EP05 (brief candidate)
move(queues['A2'], 'Marie Curie', 0)             # EP06 sample
move(queues['B2'], 'Marie Curie', 14)            # much later than her A2 story
move(queues['B2'], 'Albert Einstein', 19)        # last B2
move(queues['A1'], 'Albert Einstein', 4)         # early A1
target = {'A1': 20, 'A2': 28, 'B1': 28, 'B2': 20}
used = {k: 0 for k in target}
order, last, n = [], 'A1', 96                    # EP04 was A1
forced = {5: 'B1', 6: 'A2'}
for i in range(n):
    ep = i + 5
    if ep in forced: lvl = forced[ep]
    else:
        cands = [l for l in target if used[l] < target[l] and l != last] or [l for l in target if used[l] < target[l]]
        lvl = max(cands, key=lambda l: (target[l] * (i + 1) / n - used[l], -['A1','A2','B1','B2'].index(l)))
    e = queues[lvl].pop(0); used[lvl] += 1; last = lvl
    e['ep'] = ep; e['slug'] = slug(e['person']); e['file'] = f"EP{ep:02d}-{slug(e['person'])}-{lvl}.md"
    order.append(e)
assert all(not q for q in queues.values())
json.dump(order, open(os.path.join(HERE, 'plan.json'), 'w'), ensure_ascii=False, indent=1)

# ---------- plan markdown ----------
L = []
L.append("# Bright Lives English — Episode Plan EP05–EP100\n")
L.append("*96 episodes planned on 28 September 2026. Levels alternate: 20 × A1, 28 × A2, 28 × B1, 20 × B2. Every video word, lesson word and target structure is new: none repeats inside this plan or appears in `vocabulary-log.md` (EP01–EP04). The two people who appear twice (Marie Curie, Albert Einstein) have a different story at a different level.*\n")
L.append("**How to use:** pick the next episode, then either open its full file in `episodes/` (EP05 and EP06 are written) or ask Claude: *\"Write the full episode file for EPNN from the plan\"*. Before writing a script, re-check the facts in its fact-check table and confirm the words are still unused in the vocabulary log.\n")
L.append("**People:** mostly historical figures. Living people (Temple Grandin, Nick Vujicic, Ruby Bridges, Tu Youyou) are told through positive, well-documented stories only. No politicians, religious leaders, or people at the centre of current controversies.\n")
L.append("## Overview\n")
L.append("| EP | Level | Person | Working title | Target structure |")
L.append("|---|---|---|---|---|")
for e in order:
    L.append(f"| {e['ep']:02d} | {e['level']} | {e['person']} ({e['years']}) | {e['title']} | {e['structure']} |")
L.append("")
for lvl in ['A1', 'A2', 'B1', 'B2']:
    pass
L.append("## Episodes in detail\n")
for e in order:
    words = ' · '.join(f"**{w.split('|')[0]}** ({w.split('|')[1]})" for w in e['words'])
    L.append(f"### EP{e['ep']:02d} — {e['person']} ({e['level']})")
    L.append(f"- **Working title:** {e['title']} | {e['person']} | Learn English {e['level']}")
    L.append(f"- **Years:** {e['years']}{' · living: positive story only' if e['status']=='living' else ''}")
    L.append(f"- **Story angle:** {e['angle']}")
    L.append(f"- **5 video words:** {words}")
    L.append(f"- **Lesson extras (website only):** {' · '.join(e['extras'])}")
    L.append(f"- **Target structure:** {e['structure']} — *{e['example']}*")
    L.append(f"- **Topics:** {', '.join(e['topics'])}")
    L.append(f"- **Lesson slug:** `{e['slug']}` · **File:** `{e['file']}`\n")
open(os.path.join(OUT, 'BrightLivesEnglish-episode-plan.md'), 'w').write('\n'.join(L))

# ---------- vocabulary log with planned reservations ----------
log = open(os.path.join(OUT, 'vocabulary-log.md')).read().split('\n## Planned (reserved)')[0]
P = ["\n## Planned (reserved) — EP05–EP100\n",
     "These words and structures are **reserved** by the episode plan (`BrightLivesEnglish-episode-plan.md`). Don't use them as video words for any other episode. When an episode's script is final, move its rows into the tables above.\n",
     "### People planned", "| EP | Person | Level | Story angle |", "|---|---|---|---|"]
for e in order:
    P.append(f"| {e['ep']:02d} | {e['person']} | {e['level']} | {e['title']} |")
P += ["", "### Words planned (A–Z)", "| Word / phrase | Part of speech | Level | EP | Where |", "|---|---|---|---|---|"]
rows = []
for e in order:
    for w in e['words']:
        a, b = w.split('|'); rows.append((a, b, e['level'], f"{e['ep']:02d} {e['person']}", 'video'))
    for a in e['extras']:
        rows.append((a, '—', e['level'], f"{e['ep']:02d} {e['person']}", 'lesson'))
for r in sorted(rows, key=lambda r: r[0].lower()):
    P.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |")
P += ["", "### Structures planned", "| Structure / expression | Level | EP | Example |", "|---|---|---|---|"]
for e in order:
    P.append(f"| {e['structure']} | {e['level']} | {e['ep']:02d} {e['person']} | {e['example']} |")
open(os.path.join(OUT, 'vocabulary-log.md'), 'w').write(log.rstrip() + '\n' + '\n'.join(P) + '\n')
print('levels:', ''.join(e['level'][0] + e['level'][1] + ' ' for e in order[:24]))
print([ (e['ep'], e['person'], e['level']) for e in order if e['person'] in ('Marie Curie','Albert Einstein')])
print(len(rows), 'word rows')
