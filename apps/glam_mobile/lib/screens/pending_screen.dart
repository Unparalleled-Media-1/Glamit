import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../shell/route_table.dart';

/// Honest placeholder for a design screen whose native implementation has not
/// shipped. It carries the design ID, shows no data and performs no action
/// other than an optional, clearly labelled interim entry point.
class PendingScreen extends StatelessWidget {
  const PendingScreen({super.key, required this.screen, this.interimLabel, this.onInterim});
  final DesignScreen screen;
  final String? interimLabel;
  final VoidCallback? onInterim;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return Scaffold(backgroundColor: p.bg, body: Semantics(identifier: 'screen-${screen.id}', container: true, explicitChildNodes: true, child: SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(14, 6, 22, 22),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        GlassIconButton(glyph: context.isAndroidStyle ? '←' : '‹', label: 'Back', blur: false, fill: p.sf2, color: p.tx, id: 'pending-back', onTap: () => context.canPop() ? context.pop() : context.go('/home')),
        Expanded(child: Padding(padding: const EdgeInsets.only(left: 8, top: 24), child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Kicker('${screen.id} · ${screen.section}'),
          Text(screen.title, style: display(34, 36, p.tx, ls: -1)),
          const SizedBox(height: 14),
          Text(screen.purpose, style: body(15, p.tx2, height: 23)),
          const SizedBox(height: 18),
          Semantics(container: true, identifier: 'pending-notice', child: Text('This screen is not built in the native app yet. No data is shown and nothing here is simulated.', style: body(13, p.tx2, height: 19))),
          if (onInterim != null) ...[const SizedBox(height: 18), GlamButton(interimLabel ?? 'Continue', id: 'pending-interim', onTap: onInterim)],
        ])))),
      ])))));
  }
}
