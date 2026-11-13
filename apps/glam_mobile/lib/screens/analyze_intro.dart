import 'package:flutter/material.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

enum CaptureStart { idle, camera, gallery }

/// GL-018 Choose analysis. Only face-feature/undertone observations exist server-side, so other modes are shown as unavailable, not simulated.
class ChooseAnalysisScreen extends StatelessWidget {
  const ChooseAnalysisScreen({super.key, required this.onContinue});
  final VoidCallback onContinue;
  static const modes = [('◎', 'Face', 'Features and undertone', true), ('❖', 'Skin', 'Appearance & routine fit', false), ('∿', 'Hair', 'Type, texture, direction', false), ('✧', 'Combined', 'All three, one report', false)];
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), inset = MediaQuery.paddingOf(context);
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      ListView(padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 140 + inset.bottom), children: [
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('What shall we\nlook at?', style: GlamType.display(40, height: 42, spacing: -1.2, color: t.tx))),
        Padding(padding: const EdgeInsets.only(bottom: 14), child: Text('Skin and hair analysis arrive once the service supports them.', style: GlamType.body(15, height: 23, color: t.tx2))),
        for (final m in modes) Opacity(opacity: m.$4 ? 1 : .55, child: Container(margin: const EdgeInsets.symmetric(vertical: 10), padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(color: t.sf, borderRadius: BorderRadius.circular(22), border: Border.all(color: m.$4 ? t.ac2 : t.ln, width: m.$4 ? 2 : 1)),
          child: Row(children: [
            Container(width: 48, height: 48, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: Text(m.$1, style: GlamType.body(17, color: t.ac2))),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(m.$2, style: GlamType.body(15, w: FontWeight.w700, color: t.tx)), Text(m.$3, style: GlamType.body(12, height: 18, color: t.tx2))])),
            if (m.$4) Text('✓', style: GlamType.body(20, color: t.ac2)) else Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: t.sf2, borderRadius: BorderRadius.circular(12)),
              child: Text('Not available yet', style: GlamType.body(11, w: FontWeight.w700, color: t.tx2)))]))),
      ]),
      GlamTray(child: PillButton('Continue', onTap: onContinue)),
      GlamTopBar(title: 'Choose analysis', onBack: () => Navigator.of(context).maybePop()),
    ]));
  }
}

/// GL-019 Before you start.
class PrepareScreen extends StatelessWidget {
  const PrepareScreen({super.key, required this.onStart});
  final void Function(CaptureStart how) onStart;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), inset = MediaQuery.paddingOf(context), w = MediaQuery.sizeOf(context).width - 44;
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      ListView(padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 200 + inset.bottom), children: [
        SpriteImg(n: 3, w: w, h: 250, r: 26),
        Padding(padding: const EdgeInsets.only(top: 22, bottom: 12), child: Text('Three things for\na great read.', style: GlamType.display(40, height: 42, spacing: -1.2, color: t.tx))),
        for (final (i, r) in [('☀', 'Soft, even light', 'Face a window; avoid harsh overhead light.'), ('▭', 'Camera at eye level', 'Hold level, arm’s length.'), ('◌', 'No filters or heavy edits', 'Natural colour gives better guidance.')].indexed)
          GlamRow(glyph: r.$1, title: r.$2, subtitle: r.$3, last: i == 2, chevron: false),
      ]),
      GlamTray(child: Column(mainAxisSize: MainAxisSize.min, children: [PillButton('Open camera', onTap: () => onStart(CaptureStart.camera)),
        PillButton('Choose from gallery', kind: BtnKind.ghost, onTap: () => onStart(CaptureStart.gallery))])),
      GlamTopBar(title: 'Before you start', onBack: () => Navigator.of(context).maybePop()),
    ]));
  }
}
