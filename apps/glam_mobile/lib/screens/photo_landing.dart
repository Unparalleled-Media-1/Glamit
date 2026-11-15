import 'package:flutter/material.dart';
import '../data/fixture_scope.dart';
import '../data/fixtures.dart';
import '../design/photo.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../shell/nav.dart';
import 'state_overlay.dart';

/// Row shared by the on-photo landings: uppercase section title (`.ttl` override
/// in s1/s3) and a glass pill on the right.
class _LandingTop extends StatelessWidget {
  const _LandingTop({required this.title, required this.actionLabel, required this.onAction, this.titleColor});
  final String title, actionLabel;
  final Color? titleColor;
  final VoidCallback onAction;
  @override
  Widget build(BuildContext context) => Positioned(top: 8, left: 14, right: 14, child: SizedBox(height: 44, child: Row(children: [
    Expanded(child: Text(title.toUpperCase(), style: body(16, titleColor ?? context.glam.onGlass, w: FontWeight.w700, ls: 2))),
    GlassPill(label: actionLabel, onTap: onAction, id: 'landing-action'),
  ])));
}

/// Design ID GL-017 — Analyze landing (s1.jsx `Analyze`).
class AnalyzeLandingScreen extends StatelessWidget {
  const AnalyzeLandingScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final screenH = MediaQuery.sizeOf(context).height;
    return ScreenStateGate(child: ClipRect(child: Stack(fit: StackFit.expand, children: [
      Positioned(left: 0, right: 0, top: 0, height: screenH, child: const GlamPhoto(n: 2)),
      const Scrim(fraction: .60),
      // `.oval` 250x340 centred, margin-top -250 within the 660px viewport.
      Positioned.fill(child: IgnorePointer(child: LayoutBuilder(builder: (context, c) => Stack(children: [
        Positioned(left: (c.maxWidth - 250) / 2, top: c.maxHeight / 2 - 250, width: 250, height: 340, child: Opacity(opacity: .7,
          child: DecoratedBox(decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xE6FFF4F0), width: 2))))),
      ])))),
      _LandingTop(title: 'Analyze', actionLabel: 'History', onAction: () => GlamNav.to(context, 'GL-033')),
      Positioned(left: 22, right: 22, bottom: 112, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        const Kicker('A new way to see your possibilities', color: GlamPalette.blush),
        Text('See what makes\nyou, you.', style: display(40, 42, GlamPalette.onPhoto, ls: -1.2)),
        const SizedBox(height: 12),
        Padding(padding: const EdgeInsets.only(bottom: 14), child: Text('Your features are a starting point, never a score.', style: body(15, GlamPalette.onPhotoBody, height: 23))),
        GlamButton('Start analysis', id: 'analyze-start', onTap: () => GlamNav.to(context, 'GL-018')),
        Text('Editorial image · your photo stays private', textAlign: TextAlign.center, style: body(12, GlamPalette.onPhotoMuted, height: 18)),
      ])),
    ])));
  }
}

/// Design ID GL-035 — Studio landing (s3.jsx `StudioHome`).
class StudioLandingScreen extends StatelessWidget {
  const StudioLandingScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final screenH = MediaQuery.sizeOf(context).height;
    return ScreenStateGate(child: ClipRect(child: Stack(fit: StackFit.expand, children: [
      Positioned(left: 0, right: 0, top: 0, height: screenH, child: const GlamPhoto(n: 1)),
      const Scrim(fraction: .65),
      // D2 (owner-approved fix): the design's light-theme title colour (#17151a) vanishes on the dark portrait,
      // so Studio uses the on-photo colour in both themes. Layout is unchanged; Analyze is untouched.
      _LandingTop(title: 'Studio', titleColor: GlamPalette.onPhoto, actionLabel: FixtureScope.of(context) ? '✧ ${credits.remaining} credits' : '✧ Credits', onAction: () => GlamNav.to(context, 'GL-126')),
      Positioned(left: 22, right: 22, bottom: 112, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        const Kicker('Your expression lab', color: GlamPalette.blush),
        Text('Make it your own.', style: display(40, 42, GlamPalette.onPhoto, ls: -1.2)),
        const SizedBox(height: 12),
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Row(children: [
          for (final (i, t) in [('Makeup', 'GL-037'), ('Hair', 'GL-044'), ('AI look', 'GL-047')].indexed) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(child: GlassPill(label: t.$1, minHeight: 48, center: true, expand: true, onTap: () => GlamNav.to(context, t.$2), id: 'studio-${t.$1.toLowerCase().replaceAll(' ', '-')}')),
          ],
        ])),
        GlamButton('Choose a photo', id: 'studio-choose', onTap: () => GlamNav.to(context, 'GL-036')),
      ])),
    ])));
  }
}
