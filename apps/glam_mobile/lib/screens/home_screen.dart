import 'package:flutter/material.dart';
import '../data/fixtures.dart';
import '../design/photo.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../shell/nav.dart';
import 'ad_widgets.dart';
import 'state_overlay.dart';

/// Design ID `home` — Home (Consumer tabs). Source: ui_kits/mobile-v3/s1.jsx
/// `Home` + p14.jsx `wrap("home")`.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String filter = 'For you';
  static const _chips = ['For you', 'Makeup', 'Hair', 'Events'];

  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return ScreenStateGate(child: ColoredBox(color: p.bg, child: ListView(padding: EdgeInsets.zero, children: [
      // The design hero is 560px tall inside a viewport whose scroller starts 52px
      // above the visible area (`.vp .scr{top:-52px}`), so its top 52px is clipped.
      ClipRect(child: SizedBox(height: 508, child: OverflowBox(alignment: Alignment.bottomCenter, minHeight: 560, maxHeight: 560,
        child: SizedBox(height: 560, child: Stack(fit: StackFit.expand, children: [
          const GlamPhoto(n: 0, height: 560),
          const Scrim(fraction: .55),
          Positioned(left: 22, right: 22, bottom: 26, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            const Kicker('Your daily dose of you', color: GlamPalette.blush),
            Text('Your next look\nstarts here.', style: display(46, 48, GlamPalette.onPhoto, ls: -1.2)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: GlamButton('◎ Analyze my face', id: 'home-analyze', onTap: () => GlamNav.to(context, 'GL-017'))),
              const SizedBox(width: 10),
              Expanded(child: GlamButton('✧ Try a look', kind: GlamButtonKind.glass, id: 'home-try', onTap: () => GlamNav.to(context, 'GL-035'))),
            ]),
          ])),
        ]))))),
      if (kReferenceFixtures) const HeroAdCard(adsHero),
      Padding(padding: const EdgeInsets.fromLTRB(22, 18, 22, 10), child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
        for (final c in _chips) Padding(padding: const EdgeInsets.only(right: 8), child: GlamChip(c, selected: filter == c, onTap: () => setState(() => filter = c))),
      ]))),
      if (kReferenceFixtures) const CarouselAdStrip(adsCarousel),
      if (kReferenceFixtures) const EventsCarousel(),
      Padding(padding: const EdgeInsets.fromLTRB(22, 4, 22, 0), child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (var i = 0; i < homeLooks.length; i++) Padding(padding: const EdgeInsets.only(right: 12), child: Tappable(
          onTap: () => GlamNav.to(context, 'GL-035'), label: '${homeLooks[i]}, try on, illustrative',
          child: SizedBox(width: 150, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            GlamPhoto(n: i, width: 150, height: 200, radius: 20),
            Padding(padding: const EdgeInsets.fromLTRB(0, 10, 0, 2), child: Text(homeLooks[i], style: body(14, p.tx, w: FontWeight.w700))),
            Text('Try on · Illustrative', style: body(12, p.tx2, height: 18)),
          ])))),
      ]))),
      Padding(padding: const EdgeInsets.symmetric(horizontal: 22), child: Column(children: [
        GlamCard(onTap: () => GlamNav.to(context, 'GL-017'), label: 'Start your first analysis. Face, skin and hair, about 2 minutes',
          child: Row(children: [
            Container(width: 40, height: 40, alignment: Alignment.center, decoration: BoxDecoration(color: p.sf2, shape: BoxShape.circle), child: Text('◎', style: body(17, p.ac2))),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Start your first analysis', style: body(15, p.tx, w: FontWeight.w700)),
              Text('Face, skin and hair · about 2 minutes', style: body(12, p.tx2, height: 18)),
            ])),
            Text('›', style: body(20, p.tx2)),
          ])),
        GlamCard(color: p.sf2, onTap: () => GlamNav.to(context, 'GL-056'), label: 'An occasion coming up? Let’s style the moment.',
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Kicker('An occasion coming up?'),
            Text('Let’s style the moment.', style: display(22, 26, p.tx)),
          ])),
        const SizedBox(height: 100),
      ])),
    ])));
  }
}
