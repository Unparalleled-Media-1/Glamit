#!/usr/bin/env python3
"""Fail unless the complete Batch 1 native evidence package exists.

  verify_evidence.py inputs  ROOT   # screenshots, references, interaction status
  verify_evidence.py results ROOT   # comparison outputs for every set

Expected: 5 screens x 2 themes x 2 platforms = 20 native screenshots, 20 references
per typography set (substituted and original) and 20 completed comparisons per set,
each with a JSON score, side-by-side, diff overlay, reference and native copy.
An empty or partial directory is a failure, never a pass.
"""
import json, pathlib, sys

IDS = ['home', 'GL-017', 'GL-035', 'GL-069', 'GL-117']
THEMES = ['dark', 'light']
PLATFORMS = ['android', 'ios']
PNG = b'\x89PNG\r\n\x1a\n'
errors = []

def need(path, what):
    if not path.is_file():
        errors.append(f'MISSING {what}: {path}')
        return False
    data = path.read_bytes()
    if not data.startswith(PNG) and path.suffix == '.png':
        errors.append(f'NOT A PNG {what}: {path}')
        return False
    if path.suffix == '.png' and len(data) < 10000:
        errors.append(f'IMPLAUSIBLY SMALL {what}: {path} ({len(data)} bytes)')
        return False
    return True

def inputs(root):
    for plat in PLATFORMS:
        status = root / plat / 'maestro-exit-status.txt'
        if not status.is_file():
            errors.append(f'MISSING interaction/capture exit status: {status}')
        elif status.read_text().strip() != '0':
            errors.append(f'{plat}: Maestro capture/interaction run failed (exit {status.read_text().strip()})')
        for theme in THEMES:
            for i in IDS:
                need(root / plat / 'screenshots' / f'{plat}-{theme}-{i}.png', f'native screenshot {plat}/{theme}/{i}')
    for sub in ('reference', 'reference-original'):
        for plat in PLATFORMS:
            for theme in THEMES:
                for i in IDS:
                    need(root / sub / f'{i}_{theme}_{plat}.png', f'{sub} {i}/{theme}/{plat}')

def results(root):
    for sub in ('comparison', 'comparison-original'):
        d = root / sub
        n = 0
        for plat in PLATFORMS:
            for theme in THEMES:
                for i in IDS:
                    stem = f'{i}_{theme}_{plat}'
                    ok = all(need(d / f'{stem}{suffix}', f'{sub} {stem}{suffix}') for suffix in ('_side-by-side.png', '_diff-overlay.png', '_reference.png', '_native.png'))
                    j = d / f'{stem}.json'
                    if not j.is_file():
                        errors.append(f'MISSING score {j}'); continue
                    r = json.loads(j.read_text())
                    if not isinstance(r.get('ssim_percent'), (int, float)):
                        errors.append(f'INVALID score {j}'); continue
                    n += ok
        if n != 20:
            errors.append(f'{sub}: {n}/20 complete comparisons')

mode, root = sys.argv[1], pathlib.Path(sys.argv[2])
{'inputs': inputs, 'results': results}[mode](root)
if errors:
    print('\n'.join(errors)); print(f'FAILED: {len(errors)} problem(s)'); sys.exit(1)
print(f'OK ({mode})')
