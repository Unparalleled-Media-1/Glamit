import 'package:flutter/material.dart';
import '../data/fixture_scope.dart';
import '../data/fixtures.dart';
import '../design/photo.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../shell/nav.dart';
import 'ad_widgets.dart';
import 'state_overlay.dart';

/// Design ID GL-069 — Discover feed (s4.jsx `Discover` + p14 wrap for events/ADS-03).
class DiscoverFeedScreen extends StatefulWidget {
  const DiscoverFeedScreen({super.key});
  @override State<DiscoverFeedScreen> createState() => _DiscoverFeedScreenState();
}

class _DiscoverFeedScreenState extends State<DiscoverFeedScreen> {
  String filter = 'For you';
  bool saved = false, following = false;
  static const _chips = ['For you', 'Trending', 'Following', 'Tutorials'];

  void _select(String v) {
    switch (v) {
      case 'Following': GlamNav.to(context, 'GL-075');
      case 'Tutorials': GlamNav.to(context, 'GL-080');
      case 'Trending': GlamNav.to(context, 'GL-072');
      default: setState(() => filter = v);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final screenH = MediaQuery.sizeOf(context).height;
    final fx = FixtureScope.of(context);
    // No confirmed feed contract: without fixtures the sample post is not even built
    // (an overlay would leave it in the semantics tree); the honest empty state is shown.
    if (!fx) return const ScreenStateGate(state: 'empty', child: SizedBox.expand());
    return ScreenStateGate(child: ClipRect(child: Stack(fit: StackFit.expand, children: [
      Positioned(left: 0, right: 0, top: 0, height: screenH, child: const GlamPhoto(n: 1)),
      const Scrim(fraction: .55),
      Positioned(top: 8, left: 14, right: 14, child: SizedBox(height: 44, child: Row(children: [
        Expanded(child: GlassPill(label: '⌕ Search looks, creators…', expand: true, id: 'discover-search', onTap: () => GlamNav.to(context, 'GL-070'))),
        const SizedBox(width: 8),
        GlassIconButton(glyph: '♢', label: 'Notifications', id: 'discover-notifications', onTap: () => GlamNav.to(context, 'GL-197')),
      ]))),
      Positioned(top: 104, left: 0, right: 0, child: SingleChildScrollView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.fromLTRB(22, 10, 22, 10),
        child: Row(children: [for (final c in _chips) Padding(padding: const EdgeInsets.only(right: 8), child: GlamChip(c, glass: true, selected: filter == c, onTap: () => _select(c)))]))),
      // Deliberate deviation (DD-002): the design paints the featured-events strip over the
      // Try on / Shop buttons, making them untappable; here the action column stays on top.
      if (fx) const Positioned(top: 166, left: 0, right: 0, child: EventsCarousel(glass: true)),
      Positioned(right: 14, bottom: 300, child: Column(mainAxisSize: MainAxisSize.min, spacing: 14, children: [
        for (final (g, t) in [('♡', 'Save'), ('✧', 'Try on'), ('☰', 'Shop'), ('↗', 'Share')]) Column(mainAxisSize: MainAxisSize.min, children: [
          GlassIconButton(glyph: g, label: t == 'Save' ? (saved ? 'Saved' : 'Save') : t, id: 'discover-${t.toLowerCase().replaceAll(' ', '-')}',
            fill: t == 'Save' && saved ? p.ac : null, color: t == 'Save' && saved ? p.onAc : null,
            onTap: () => t == 'Save' ? setState(() => saved = !saved) : GlamNav.to(context, t == 'Try on' ? 'GL-035' : 'GL-052')),
          Text(t, style: body(11, GlamPalette.onPhoto, height: 13)),
        ]),
      ])),
      Positioned(left: 22, right: 80, bottom: 182, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Row(children: [
          Expanded(child: Align(alignment: Alignment.centerLeft, child: Tappable(onTap: () => GlamNav.to(context, 'GL-074'), label: 'Creator @amarabeauty', child: Row(mainAxisSize: MainAxisSize.min, children: [
            const GlamPhoto(n: 3, width: 40, height: 40, radius: 20), const SizedBox(width: 10),
            Flexible(child: Text('@amarabeauty', overflow: TextOverflow.ellipsis, style: body(15, GlamPalette.onPhoto, w: FontWeight.w700))),
          ])))),
          const SizedBox(width: 10),
          GlassPill(label: following ? 'Following ✓' : 'Follow', id: 'discover-follow', onTap: () => setState(() => following = !following)),
        ]),
        const SizedBox(height: 10),
        Text('Rose after hours', style: display(26, 29, GlamPalette.onPhoto, ls: -.5)),
        const SizedBox(height: 4),
        Text('Soft rose lids, berry lip · Illustrative creator content', style: body(12, GlamPalette.onPhotoMuted, height: 18)),
      ])),
      if (fx) const Positioned(left: 12, right: 12, bottom: 96, child: PostAdPeek(adsPost)),
    ])));
  }
}
