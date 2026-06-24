# Backups & restore (production VM)

How the database/MQTT backups work on the production VM, how to **download** them to
your own machine, and how to restore or extract a single project from one.

The production VM in use: `bipes.teknologiskolen.dk` (IP `193.180.215.219`), SSH user
`akris19`. Substitute your own host/user where shown.

---

## What gets backed up

`docker/backup-db.sh` writes two files per run into `~/BIPES-Teknologiskolen/backups/`:

| File | Contents |
|------|----------|
| `bipes_<timestamp>.sql.gz` | gzipped `pg_dump` of the whole Postgres DB (teachers, students, classes, **projects**, sessions, audit log) |
| `dynamic-security_<timestamp>.json` | the Mosquitto Dynamic-Security state (per-device/-browser MQTT clients + ACLs) |

`<timestamp>` is `YYYYMMDD_HHMMSS`. The dump is written atomically (`.tmp` → rename) so an
interrupted backup is never mistaken for a good one.

> ⚠️ **These files contain password hashes, MQTT credentials and student PII.** They are
> deliberately stored **root-owned, mode 700**, are excluded by `.gitignore`, and must
> **never** be committed to git or shared. Treat them like secrets.

---

## Automated backups

Installed by `sudo ./deploy.sh` as `/etc/cron.d/bipes-backup`:

```
17 2 * * * root /home/akris19/BIPES-Teknologiskolen/docker/backup-db.sh 2>&1 | logger -t bipes-backup
```

- Runs **nightly at 02:17**.
- Retention: keeps the last `BACKUP_RETENTION_DAYS` days (default **7**, set in `.env`); older
  dumps are deleted automatically.

Check it's scheduled and read its log (on the VM):

```bash
ls -l /etc/cron.d/ | grep bipes          # bipes-backup should be listed
systemctl status cron --no-pager         # cron daemon running?
sudo journalctl -t bipes-backup | tail   # backup run output (needs sudo to see root's logs)
```

## Run a backup manually

Needs `sudo` (it shells into the containers via `docker compose`):

```bash
sudo ~/BIPES-Teknologiskolen/docker/backup-db.sh
sudo ls -lah ~/BIPES-Teknologiskolen/backups/   # sudo: the dir is root-only
```

---

## Download a backup from the VM to your machine

**Mental model:** you always run `scp` on the machine you want the file to *end up on*
(your laptop), pointing it at the machine that *has* the file (the VM). The VM never
connects back to your laptop — it's the same direction as your normal `ssh` into the VM.

The backups are root-owned, so first make a copy your user can read, then pull it.

**Step 1 — on the VM** (the `akris19@tekskolen` prompt; check the current filename first):

```bash
sudo ls -lah ~/BIPES-Teknologiskolen/backups/                      # find the latest name
sudo cp ~/BIPES-Teknologiskolen/backups/bipes_<timestamp>.sql.gz /tmp/
sudo chown $USER /tmp/bipes_<timestamp>.sql.gz
```

**Step 2 — on your laptop** (a *local* terminal, **not** the SSH session — prompt is e.g.
`akris19@SDU`). Use whatever target you normally `ssh` with:

```bash
scp akris19@bipes.teknologiskolen.dk:/tmp/bipes_<timestamp>.sql.gz .
# or, if you have an ssh-config alias:   scp myvm:/tmp/bipes_<timestamp>.sql.gz .
```

The trailing `.` drops it in the laptop folder you're in. **Store it outside any git
checkout** (e.g. `~/bipes-backups/`), not inside `~/BIPES-Teknologiskolen/`, so it can't be
committed by accident.

**Step 3 — clean up the temp copy** (optional, from the laptop):

```bash
ssh akris19@bipes.teknologiskolen.dk 'rm /tmp/bipes_<timestamp>.sql.gz'
```

> The backups live on the same 15 GB VM as the database — if the VM is lost, so are they.
> Pull a copy off-box periodically (this procedure), or use a provider snapshot.

---

## Extract one project from a backup (importable `.bipes.json`)

A project's full content is stored in the dump's `projects.data` column as JSON — which is
exactly the importable `.bipes.json` format. This script pulls each project out without
needing Postgres. Save it as `extract-projects.py` and run it **outside** your git checkout:

```bash
python3 extract-projects.py bipes_<timestamp>.sql.gz        # writes ./extracted-projects/*.bipes.json
```

```python
#!/usr/bin/env python3
"""Extract BIPES projects from a pg_dump (.sql/.sql.gz) into importable .bipes.json files.
Usage:  python3 extract-projects.py <backup.sql[.gz]> [output-dir]"""
import sys, os, gzip, json, re

if len(sys.argv) < 2:
    sys.exit("usage: python3 extract-projects.py <backup.sql[.gz]> [output-dir]")
src = sys.argv[1]
outdir = sys.argv[2] if len(sys.argv) > 2 else "extracted-projects"
os.makedirs(outdir, exist_ok=True)
opener = gzip.open if src.endswith(".gz") else open

M = {'t':'\t','n':'\n','r':'\r','b':'\b','f':'\f','v':'\v','\\':'\\'}
def unesc(s):                      # undo pg_dump COPY escaping
    o=[]; i=0; L=len(s)
    while i<L:
        if s[i]=='\\' and i+1<L: o.append(M.get(s[i+1], s[i+1])); i+=2
        else: o.append(s[i]); i+=1
    return ''.join(o)

cols=None; rows=[]
with opener(src,'rt',errors='replace') as f:
    incopy=False
    for line in f:
        line=line.rstrip('\n')
        if line.startswith('COPY public.projects '):
            m=re.search(r'\(([^)]*)\)', line)
            cols=[c.strip() for c in m.group(1).split(',')] if m else None
            incopy=True; continue
        if incopy:
            if line=='\\.': break
            rows.append(line)

if not rows: sys.exit("No projects in this backup (projects table is empty).")
safe=lambda s: re.sub(r'[^A-Za-z0-9._-]','_',(s or 'project'))[:40]
n=0
for row in rows:
    f=row.split('\t'); rec=dict(zip(cols,f)) if cols else {}
    uid=rec.get('uid', f[0])
    try: proj=json.loads(unesc(rec.get('data', f[3])))
    except Exception as e: print(f"  ! skip {uid[:12]}: {e}"); continue
    if isinstance(proj,dict) and proj.get('project'):
        proj['project']['shared']={'uid':'','token':'','public':False,'classId':None}
    name=(proj.get('project',{}) or {}).get('name') if isinstance(proj,dict) else None
    fn=f"{safe(name)}-{uid[:8]}.bipes.json"
    open(os.path.join(outdir,fn),'w').write(json.dumps(proj)); n+=1
    print(f"  ✓ {fn}   (name={name!r})")
print(f"\nWrote {n} file(s) to {outdir}/ — import each via IDE → Projects → Import.")
```

Then in the IDE → **Projects → Import** → pick each `extracted-projects/*.bipes.json`.

> Note: a project exported while it was *server-only* (metadata cached, data on the server)
> used to produce a data-less stub (`{"project":{…},"_serverOnly":true}`) that imports
> empty. Export now embeds the full data, so fresh exports are self-contained — but old
> stub files cannot be "fixed" by editing metadata; their content was only ever on the
> server.

---

## Restore the whole database (disaster recovery)

To replace the current DB with a backup (destroys current data — take a fresh backup first):

```bash
cd ~/BIPES-Teknologiskolen
gunzip -c backups/bipes_<timestamp>.sql.gz | \
  sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  psql -U bipes_user -d bipes
```

The dump is a plain `pg_dump` (SQL `COPY` statements), so it restores into a database with
the matching name/owner (`bipes` / `bipes_user`). Restore the dynsec state by writing the
matching `dynamic-security_<timestamp>.json` to the broker's
`/mosquitto/data/dynamic-security.json` and restarting the `mosquitto` service.
