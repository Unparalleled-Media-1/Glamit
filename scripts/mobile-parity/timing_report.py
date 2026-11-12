#!/usr/bin/env python3
"""Report real app responsiveness from the Maestro run data, separately from emulator speed.

Reads every commands.json under artifacts/parity/<platform>/maestro-*/ and the optional
<platform>/perf/*.txt baselines. Output: perf.json and perf.md.

Definitions
- cold_start_to_interactive: duration of the first wait for the Home control after
  `launchApp clearState` (includes process start, engine start, first frames, image decode).
- navigation_time_to_visible: duration of a wait for the destination's control after a tap.
- retries: FAILED commands in a flow (a lost tap or a missing target); never hidden.
- emulator baseline: cold-start time of a stock system app measured with the same method
  (Android `am start -W`, iOS wall-clock `simctl launch`). It shows how slow the host is.

Budgets are REPORTING thresholds only (SLOW flags). They never turn a slow screen into a pass:
the 20s Maestro timeout exists to survive infrastructure stalls, so any wait above a budget is
listed for the owner's judgement.
"""
import json, pathlib, re, sys

BUDGET_NAV_MS = 3000
BUDGET_COLD_MS = 8000
root = pathlib.Path(sys.argv[1])
out = {'budgets_ms': {'navigation': BUDGET_NAV_MS, 'cold_start': BUDGET_COLD_MS}, 'platforms': {}}
lines = ['### Responsiveness (Maestro-measured; emulator baseline shown separately)', '']

def target(cmd):
    c = cmd.get('condition', {}).get('visible', {})
    return c.get('idRegex') or c.get('textRegex') or '?'

for plat in ('android', 'ios'):
    base = root / plat
    if not base.is_dir():
        continue
    rec = {'flows': [], 'baseline': {}}
    for p in sorted((base / 'perf').glob('*.txt')) if (base / 'perf').is_dir() else []:
        rec['baseline'][p.stem] = p.read_text().strip()
    for f in sorted(base.glob('maestro-*/*/*/commands.json')):
        flow = f.parent.name
        theme = re.search(r'maestro-([a-z-]+)/', str(f.relative_to(base))).group(1)
        cmds = json.load(open(f))
        launched = False; first = None; navs = []; failed = []
        for c in cmds:
            k = next(iter(c['command'])); body = c['command'][k]; m = c['metadata']
            if m['status'] == 'FAILED':
                failed.append({'command': k, 'target': json.dumps(body)[:100], 'ms': m['duration']})
            if k == 'launchAppCommand':
                launched = True
            elif k == 'assertConditionCommand':
                t = target(body)
                if launched and first is None:
                    first = {'target': t, 'ms': m['duration'], 'status': m['status']}
                else:
                    navs.append({'target': t, 'ms': m['duration'], 'status': m['status']})
        rec['flows'].append({'run': theme, 'flow': flow, 'cold_start_to_interactive': first, 'navigation_waits': navs, 'failed_commands': failed})
    out['platforms'][plat] = rec
    lines += [f'**{plat}**', '']
    for k, v in rec['baseline'].items():
        lines.append(f'- baseline `{k}`: {v}')
    lines += ['', '| Run | Flow | Cold start to interactive (ms) | Slowest navigation wait (ms) | Waits > %d ms | Failed commands (retries/lost taps) |' % BUDGET_NAV_MS, '|---|---|---|---|---|---|']
    for fl in rec['flows']:
        cs = fl['cold_start_to_interactive']['ms'] if fl['cold_start_to_interactive'] else None
        slow = [n for n in fl['navigation_waits'] if n['ms'] > BUDGET_NAV_MS]
        mx = max([n['ms'] for n in fl['navigation_waits']], default=None)
        flag = ' **SLOW**' if cs and cs > BUDGET_COLD_MS else ''
        lines.append(f"| {fl['run']} | {fl['flow']} | {cs}{flag} | {mx} | {len(slow)} {[n['target'] for n in slow]} | {len(fl['failed_commands'])} |")
    lines.append('')
(root / 'perf.json').write_text(json.dumps(out, indent=1))
(root / 'perf.md').write_text('\n'.join(lines) + '\n')
print('\n'.join(lines))
