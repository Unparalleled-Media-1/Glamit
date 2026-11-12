#!/usr/bin/env python3
"""Visual parity comparison: design reference vs. actual native screenshot.

Metric (documented, reproducible): mean SSIM of the grayscale images at 780x1688
(2x the design's 390x844 viewport), 7x7 uniform window, K1=0.01, K2=0.03, over
all pixels NOT covered by the declared masks. Masks cover only OS chrome and
rounded-frame corners (status bar, home indicator, device-frame corners); no
content region is ever masked. A score >= 95 is a project acceptance target; it
does not replace the manual structural/branding review (see SCREEN_PARITY.csv).

  compare.py --ref ref.png --native shot.png --out DIR --id GL-017 \
             --theme dark --platform ios [--ref-crop 14,14,794,1702]
"""
import argparse, json, pathlib
import numpy as np
from PIL import Image

W, H = 780, 1688  # 2x of 390x844
S = 2

def box_mean(a, k):
    pad = k // 2
    p = np.pad(a, pad, mode='reflect')
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    n = a.shape
    return (c[k:k + n[0], k:k + n[1]] - c[:n[0], k:k + n[1]] - c[k:k + n[0], :n[1]] + c[:n[0], :n[1]]) / (k * k)

def ssim_map(a, b, k=7):
    a = a.astype(np.float64); b = b.astype(np.float64)
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    ma, mb = box_mean(a, k), box_mean(b, k)
    va = box_mean(a * a, k) - ma * ma; vb = box_mean(b * b, k) - mb * mb; cov = box_mean(a * b, k) - ma * mb
    return ((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2))

def mask(platform):
    m = np.ones((H, W), bool)
    m[:44 * S, :] = False                 # status bar / dynamic island / camera hole
    m[(844 - 18) * S:, :] = False         # home indicator / gesture bar
    r = 36 * S
    for ys in (slice(0, r), slice(H - r, H)):
        for xs in (slice(0, r), slice(W - r, W)):
            m[ys, xs] = False             # rounded device-frame corners in the reference
    return m

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', required=True); ap.add_argument('--native', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--id', required=True); ap.add_argument('--theme', required=True); ap.add_argument('--platform', required=True)
    ap.add_argument('--ref-crop', help='l,t,r,b of the 390x844 viewport inside the reference image')
    ap.add_argument('--native-crop', help='l,t,r,b of the app area inside the native screenshot')
    a = ap.parse_args()
    ref = Image.open(a.ref).convert('RGB')
    if a.ref_crop: ref = ref.crop(tuple(int(v) for v in a.ref_crop.split(',')))
    nat = Image.open(a.native).convert('RGB')
    if a.native_crop: nat = nat.crop(tuple(int(v) for v in a.native_crop.split(',')))
    aniso = (nat.height / nat.width) / (844 / 390) - 1
    ref = ref.resize((W, H), Image.LANCZOS); nat = nat.resize((W, H), Image.LANCZOS)
    ra, na = np.asarray(ref.convert('L')), np.asarray(nat.convert('L'))
    sm = ssim_map(ra, na); m = mask(a.platform)
    score = float(sm[m].mean()) * 100
    mad = float(np.abs(ra.astype(float) - na.astype(float))[m].mean())
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    stem = f'{a.id}_{a.theme}_{a.platform}'
    side = Image.new('RGB', (W * 2 + 20, H), 'white'); side.paste(ref, (0, 0)); side.paste(nat, (W + 20, 0)); side.save(out / f'{stem}_side-by-side.png')
    d = np.abs(np.asarray(ref, float) - np.asarray(nat, float)).max(2)
    ov = np.asarray(nat, float) * 0.4; ov[..., 0] = np.clip(ov[..., 0] + d * 2.5, 0, 255); ov[~m] *= 0.3
    Image.fromarray(ov.astype(np.uint8)).save(out / f'{stem}_diff-overlay.png')
    res = dict(id=a.id, theme=a.theme, platform=a.platform, ssim_percent=round(score, 2), mean_abs_diff=round(mad, 2),
               aspect_distortion_percent=round(aniso * 100, 2), metric='SSIM 7x7 grayscale @780x1688, masks: status bar, home indicator, frame corners',
               threshold=95.0, meets_threshold=score >= 95.0)
    (out / f'{stem}.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res))

if __name__ == '__main__':
    main()
