import 'package:flutter/material.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import 'screen_registry.dart';

/// Honest placeholder for a mapped reference screen that is scheduled for a later batch. It performs no simulated work.
class PendingScreen extends StatelessWidget {
  const PendingScreen({super.key, required this.id, required this.go});
  final String id; final void Function(String) go;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), e = kScreenRegistry[id];
    return Scaffold(backgroundColor: t.bg, body: SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(14, 6, 22, 0), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      GlassCircle(glyph: isAndroid(context) ? '←' : '‹', label: 'Back', solid: t.sf2, solidFg: t.tx, onTap: () => Navigator.of(context).maybePop()),
      Padding(padding: const EdgeInsets.fromLTRB(8, 28, 0, 0), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Kick('$id · ${e?.module ?? 'Mapped screen'}'),
        Text(e?.title ?? id, style: GlamType.display(40, height: 42, spacing: -1.2, color: t.tx)),
        const SizedBox(height: 14),
        Text('This screen is mapped from the design but is scheduled for a later batch. Nothing here is simulated.', style: GlamType.body(15, height: 23, color: t.tx2)),
      ])),
    ]))));
  }
}
