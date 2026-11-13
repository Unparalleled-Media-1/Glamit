#!/usr/bin/env python3
"""Regenerate apps/glam_mobile/lib/shell/route_table.dart from SCREEN_REGISTRY.csv."""
import csv, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
rows = list(csv.DictReader(open(root / 'docs/mobile-parity/SCREEN_REGISTRY.csv')))
q = lambda s: s.replace("\\", "\\\\").replace("'", "\\'").replace("$", "\\$")
out = ["// GENERATED from docs/mobile-parity/SCREEN_REGISTRY.csv (design atlas, 232 screens).",
       "// Paths are the design handover's PROPOSED routes, not backend-verified contracts.",
       "// Regenerate with scripts/mobile-parity/gen_route_table.py.", "",
       "class DesignScreen {", "  const DesignScreen(this.id, this.title, this.path, this.section, this.purpose);",
       "  final String id, title, path, section, purpose;", "}", "", "const designScreens = <DesignScreen>["]
for r in rows:
    out.append("  DesignScreen('%s', '%s', '%s', '%s', '%s')," % (r['design_id'], q(r['title']), q(r['proposed_route']), q(r['section']), q(r['purpose'])))
out.append("];")
(root / 'apps/glam_mobile/lib/shell/route_table.dart').write_text("\n".join(out) + "\n")
