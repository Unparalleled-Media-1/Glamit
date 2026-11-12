#!/usr/bin/env python3
"""Collect compare.py JSON results into a Markdown table (RESULTS.md)."""
import json, pathlib, sys
d = pathlib.Path(sys.argv[1])
rows = sorted((json.loads(p.read_text()) for p in d.glob('*.json') if p.name != 'summary.json'), key=lambda r: (r['platform'], r['theme'], r['id']))
lines = ['| Screen | Platform | Theme | SSIM % | Mean abs diff | Aspect distortion % | >=95 |', '|---|---|---|---|---|---|---|']
for r in rows:
    lines.append(f"| {r['id']} | {r['platform']} | {r['theme']} | {r['ssim_percent']} | {r['mean_abs_diff']} | {r['aspect_distortion_percent']} | {'yes' if r['meets_threshold'] else 'NO'} |")
ok = sum(r['meets_threshold'] for r in rows)
lines += ['', f'{ok}/{len(rows)} comparisons meet the 95% SSIM target. A passing number never replaces the manual structural/branding review.']
(d / 'RESULTS.md').write_text('\n'.join(lines) + '\n')
(d / 'summary.json').write_text(json.dumps({'count': len(rows), 'meets_threshold': ok, 'results': rows}, indent=1))
print('\n'.join(lines))
