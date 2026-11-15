import 'package:flutter/material.dart';
import '../design/analyze_widgets.dart';
import '../design/glyphs.dart';
import '../design/photo.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

enum CaptureStart { idle, camera, gallery }

/// GL-018 Choose analysis. Only face-feature/undertone observations exist server-side, so other modes are shown as unavailable, not simulated.
class ChooseAnalysisScreen extends StatelessWidget {
  const ChooseAnalysisScreen({super.key, required this.onContinue});
  final VoidCallback onContinue;
  static const modes = [('◎', 'Face', 'Features and undertone', true), ('❖', 'Skin', 'Appearance & routine fit', false), ('∿', 'Hair', 'Type, texture, direction', false), ('✧', 'Combined', 'All three, one report', false)];
  @override Widget build(BuildContext context) {
    final t = context.glam, inset = MediaQuery.paddingOf(context);
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      ListView(padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 140 + inset.bottom), children: [
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('What shall we\nlook at?', style: display(40, 42, t.tx, ls: -1.2))),
        Padding(padding: const EdgeInsets.only(bottom: 14), child: Text('Skin and hair analysis arrive once the service supports them.', style: body(15, t.tx2, height: 23))),
        for (final m in modes) Opacity(opacity: m.$4 ? 1 : .55, child: Container(margin: const EdgeInsets.symmetric(vertical: 10), padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(color: t.sf, borderRadius: BorderRadius.circular(22), border: Border.all(color: m.$4 ? t.ac2 : t.ln, width: m.$4 ? 2 : 1)),
          child: Row(children: [
            Container(width: 48, height: 48, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: Text(m.$1, style: body(17, t.ac2))),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(m.$2, style: body(15, t.tx, w: FontWeight.w700)), Text(m.$3, style: body(12, t.tx2, height: 18))])),
            if (m.$4) Text('✓', style: body(20, t.ac2)) else Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: t.sf2, borderRadius: BorderRadius.circular(12)),
              child: Text('Not available yet', style: body(11, t.tx2, w: FontWeight.w700)))]))),
      ]),
      GlamTray(child: GlamButton('Continue', onTap: onContinue)),
      GlamTopBar(title: 'Choose analysis', onBack: () => Navigator.of(context).maybePop()),
    ]));
  }
}

/// GL-019 Before you start.
class PrepareScreen extends StatelessWidget {
  const PrepareScreen({super.key, required this.onStart});
  final void Function(CaptureStart how) onStart;
  @override Widget build(BuildContext context) {
    final t = context.glam, inset = MediaQuery.paddingOf(context), w = MediaQuery.sizeOf(context).width - 44;
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      ListView(padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 200 + inset.bottom), children: [
        GlamPhoto(n: 3, width: w, height: 250, radius: 26),
        Padding(padding: const EdgeInsets.only(top: 22, bottom: 12), child: Text('Three things for\na great read.', style: display(40, 42, t.tx, ls: -1.2))),
        for (final (i, r) in [('☀', 'Soft, even light', 'Face a window; avoid harsh overhead light.'), ('▭', 'Camera at eye level', 'Hold level, arm’s length.'), ('◌', 'No filters or heavy edits', 'Natural colour gives better guidance.')].indexed)
          _InfoRow(glyph: r.$1, title: r.$2, subtitle: r.$3, last: i == 2),
      ]),
      GlamTray(child: Column(mainAxisSize: MainAxisSize.min, children: [GlamButton('Open camera', onTap: () => onStart(CaptureStart.camera)),
        GlamButton('Choose from gallery', kind: GlamButtonKind.ghost, onTap: () => onStart(CaptureStart.gallery))])),
      GlamTopBar(title: 'Before you start', onBack: () => Navigator.of(context).maybePop()),
    ]));
  }
}


/// Row without chevron or action (the design's preparation tips).
class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.glyph, required this.title, required this.subtitle, required this.last});
  final String glyph, title, subtitle; final bool last;
  @override Widget build(BuildContext context) {
    final p = context.glam;
    return Container(constraints: const BoxConstraints(minHeight: 56), padding: const EdgeInsets.symmetric(vertical: 13),
      decoration: BoxDecoration(border: last ? null : Border(bottom: BorderSide(color: p.ln))),
      child: Row(children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(color: p.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: GText(glyph, style: body(17, p.ac2))),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(title, style: body(15, p.tx, w: FontWeight.w600)), Text(subtitle, style: body(12, p.tx2))]))]));
  }
}
