# stem-haal.py (V9.7): fetch rendered voice files from Higgsfield into docs/stem/<hash>.mp3.
#   python scripts/stem-haal.py <lijst.txt> <missing.json>
# lijst.txt has one line per job: "<hash> <job_id> <HHMMSS of the result url>" (the url is hf_<date>_<time>_<job>.mp3;
# the script tries the seconds around it), missing.json is the list scripts/stem-lijst.mjs prints (hash + tekst).
import json, sys, urllib.request, os
items = {it['hash']: it for it in json.load(open(sys.argv[2], encoding='utf-8'))}
base = 'https://d8j0ntlcm91z4.cloudfront.net/user_3J3dXNVVSzTQymQ6VtmBh71Vgyf/hf_20260917_'
ok = bad = 0
for line in open(sys.argv[1]):
    p = line.split()
    if len(p) < 3: continue
    idx, job, ts = p[0], p[1], p[2]
    out = f"docs/stem/{items[idx]['hash']}.mp3"
    if os.path.exists(out) and os.path.getsize(out) > 1000: ok += 1; continue
    t = int(ts); got = False
    for d in (0, 1, -1, 2, -2, 3, -3):
        cand = f"{base}{t + d:06d}_{job}.mp3"
        try:
            data = urllib.request.urlopen(cand, timeout=20).read()
            if len(data) > 1000: open(out, 'wb').write(data); got = True; break
        except Exception: pass
    if got: ok += 1
    else: bad += 1; print('MISSING', idx, job, ts)
print('ok', ok, 'bad', bad)
