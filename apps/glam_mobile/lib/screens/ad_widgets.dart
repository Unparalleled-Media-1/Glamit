import 'package:flutter/material.dart';
import '../data/fixtures.dart';
import '../design/photo.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../shell/nav.dart';

const _snack = 'Hidden — we’ll show fewer ads like this';

/// Inline "Why am I seeing this ad?" disclosure shared by every placement.
class _WhyPanel extends StatelessWidget {
  const _WhyPanel({required this.advertiser, required this.dark, required this.onHide, required this.onClose, this.radius = 18});
  final String advertiser;
  final bool dark;
  final VoidCallback onHide, onClose;
  final double radius;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final fg = dark ? GlamPalette.onPhoto : p.tx2;
    return Container(padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
      decoration: BoxDecoration(color: dark ? const Color(0xDB0A080A) : p.sf2, borderRadius: BorderRadius.vertical(bottom: Radius.circular(radius))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Sponsored by $advertiser. Shown for where you are in the app, not from your photos or analysis results.', style: body(12.5, fg, height: 18)),
        const SizedBox(height: 8),
        Row(children: [GlamChip('Hide this ad', selected: false, onTap: onHide), const SizedBox(width: 8), GlamChip('Close', selected: false, onTap: onClose)]),
      ]));
  }
}

class _InfoButton extends StatelessWidget {
  const _InfoButton({required this.dark, required this.open, required this.onTap});
  final bool dark, open;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Tappable(onTap: onTap, label: 'Why am I seeing this ad?', id: 'ad-info',
    child: SizedBox(width: 44, height: 44, child: Center(child: Text('ⓘ', style: body(16, dark ? GlamPalette.onPhoto : context.glam.tx2)))));
}

mixin _AdState<T extends StatefulWidget> on State<T> {
  bool why = false, hidden = false;
  void toggle() => setState(() => why = !why);
  void hide() { setState(() => hidden = true); ScaffoldMessenger.maybeOf(context)?.showSnackBar(const SnackBar(content: Text(_snack))); }
}

/// ADS-01 hero card (342x200, radius 24).
class HeroAdCard extends StatefulWidget {
  const HeroAdCard(this.ad, {super.key});
  final HeroAd ad;
  @override State<HeroAdCard> createState() => _HeroAdCardState();
}
class _HeroAdCardState extends State<HeroAdCard> with _AdState {
  @override
  Widget build(BuildContext context) {
    if (hidden) return const SizedBox.shrink();
    final ad = widget.ad;
    return Padding(padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12), child: Column(children: [
      ClipRRect(borderRadius: BorderRadius.vertical(top: const Radius.circular(24), bottom: Radius.circular(why ? 0 : 24)),
        child: SizedBox(height: 200, child: Stack(fit: StackFit.expand, children: [
          GlamPhoto(n: ad.portrait, asset: ad.asset),
          const Scrim(fraction: 1),
          Positioned(left: 14, top: 12, child: Row(children: [const SponsoredTag(onPhoto: true), const SizedBox(width: 8),
            Text(ad.advertiser, style: body(12, GlamPalette.onPhoto, w: FontWeight.w700))])),
          Positioned(right: 0, top: 0, child: _InfoButton(dark: true, open: why, onTap: toggle)),
          Positioned(left: 16, right: 16, bottom: 14, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(ad.title, style: display(22, 25, GlamPalette.onPhoto)),
            const SizedBox(height: 10),
            GlassPill(label: '${ad.cta} ›', onTap: () => GlamNav.to(context, ad.dest), id: 'ad-${ad.id}-cta'),
          ])),
        ]))),
      if (why) _WhyPanel(advertiser: ad.advertiser, dark: true, radius: 24, onHide: hide, onClose: toggle),
    ]));
  }
}

/// ADS-02 collection carousel (tiles 150x190).
class CarouselAdStrip extends StatefulWidget {
  const CarouselAdStrip(this.ad, {super.key});
  final CarouselAd ad;
  @override State<CarouselAdStrip> createState() => _CarouselAdStripState();
}
class _CarouselAdStripState extends State<CarouselAdStrip> with _AdState {
  @override
  Widget build(BuildContext context) {
    if (hidden) return const SizedBox.shrink();
    final ad = widget.ad, p = context.glam;
    return Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(padding: const EdgeInsets.symmetric(horizontal: 22), child: Row(children: [
        const SponsoredTag(), const SizedBox(width: 8),
        Expanded(child: Text('${ad.heading} · ${ad.advertiser}', style: body(14, p.tx, w: FontWeight.w700))),
        _InfoButton(dark: false, open: why, onTap: toggle),
      ])),
      SingleChildScrollView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.fromLTRB(22, 4, 22, 4), child: Row(children: [
        for (final it in ad.items) Padding(padding: const EdgeInsets.only(right: 12), child: Tappable(
          onTap: () => GlamNav.to(context, ad.dest), label: '${it.title}, ${ad.cta}',
          child: SizedBox(width: 150, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            GlamPhoto(n: it.portrait, width: 150, height: 190, radius: 20),
            Padding(padding: const EdgeInsets.fromLTRB(0, 8, 0, 2), child: Text(it.title, style: body(13, p.tx, w: FontWeight.w700))),
            Text(ad.cta, style: body(12, p.tx2, height: 18)),
          ])))),
      ])),
      if (why) Padding(padding: const EdgeInsets.symmetric(horizontal: 22), child: _WhyPanel(advertiser: ad.advertiser, dark: false, onHide: hide, onClose: toggle)),
    ]));
  }
}

/// ADS-03 native sponsored post peek (358x76) shown over the Discover feed.
class PostAdPeek extends StatefulWidget {
  const PostAdPeek(this.ad, {super.key});
  final PostAd ad;
  @override State<PostAdPeek> createState() => _PostAdPeekState();
}
class _PostAdPeekState extends State<PostAdPeek> with _AdState {
  @override
  Widget build(BuildContext context) {
    if (hidden) return const SizedBox.shrink();
    final ad = widget.ad;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      ClipRRect(borderRadius: BorderRadius.vertical(top: const Radius.circular(22), bottom: Radius.circular(why ? 0 : 22)),
        child: ColoredBox(color: const Color(0xB30A080A), child: Padding(padding: const EdgeInsets.fromLTRB(10, 8, 4, 8), child: Row(children: [
          GlamPhoto(n: ad.portrait, width: 52, height: 52, radius: 14),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Row(children: [const Flexible(child: SponsoredTag(onPhoto: true)), const SizedBox(width: 6), Flexible(child: Text(ad.advertiser, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(11, GlamPalette.onPhoto)))]),
            Text(ad.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: body(14, GlamPalette.onPhoto, w: FontWeight.w700)),
          ])),
          const SizedBox(width: 10),
          GlassPill(label: ad.cta, onTap: () => GlamNav.to(context, ad.dest), id: 'ad-${ad.id}-cta'),
          _InfoButton(dark: true, open: why, onTap: toggle),
        ])))),
      if (why) _WhyPanel(advertiser: ad.advertiser, dark: true, radius: 22, onHide: hide, onClose: toggle),
    ]);
  }
}

/// Themed events: `glass` is the on-photo Discover variant, otherwise Home's.
class EventsCarousel extends StatelessWidget {
  const EventsCarousel({super.key, this.glass = false});
  final bool glass;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    if (glass) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.fromLTRB(22, 0, 22, 6), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Flexible(child: Text('FEATURED EVENTS', maxLines: 1, overflow: TextOverflow.ellipsis, style: body(13, GlamPalette.onPhoto, w: FontWeight.w700, ls: 1))),
          GlassPill(label: 'See all ›', onTap: () => GlamNav.to(context, 'GL-209')),
        ])),
        SingleChildScrollView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 22), child: Row(children: [
          for (final e in featuredEvents) Padding(padding: const EdgeInsets.only(right: 10), child: _GlassEventCard(e)),
        ])),
      ]);
    }
    return Padding(padding: const EdgeInsets.fromLTRB(0, 6, 0, 4), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(padding: const EdgeInsets.symmetric(horizontal: 22), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Kicker('Themed events', bottom: 0), Text('Dress the occasion.', style: display(22, 26, p.tx))]),
        GlamChip('See all ›', selected: false, onTap: () => GlamNav.to(context, 'GL-209')),
      ])),
      SingleChildScrollView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.fromLTRB(22, 12, 22, 4), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (final e in featuredEvents) Padding(padding: const EdgeInsets.only(right: 14), child: _EventCard(e)),
      ])),
    ]));
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard(this.e);
  final ThemedEvent e;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return Tappable(onTap: () => GlamNav.to(context, 'GL-210'), label: '${e.name}, ${e.date}',
      child: SizedBox(width: 240, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Stack(children: [GlamPhoto(n: e.portrait, width: 240, height: 130, radius: 20), if (e.sponsored) const Positioned(left: 10, top: 10, child: SponsoredTag(onPhoto: true))]),
        Padding(padding: const EdgeInsets.fromLTRB(0, 10, 0, 2), child: Text(e.name, style: body(14, p.tx, w: FontWeight.w700))),
        Text('${e.date} · ${e.city}', style: body(12, p.tx2, height: 18)),
      ])));
  }
}

class _GlassEventCard extends StatelessWidget {
  const _GlassEventCard(this.e);
  final ThemedEvent e;
  @override
  Widget build(BuildContext context) => Tappable(onTap: () => GlamNav.to(context, 'GL-210'), label: '${e.name}, ${e.date}',
    child: Container(width: 236, constraints: const BoxConstraints(minHeight: 70), padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(color: const Color(0x990A080A), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0x40FFF4F0))),
      child: Row(children: [
        GlamPhoto(n: e.portrait, width: 54, height: 54, radius: 12),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          e.sponsored ? const SponsoredTag(onPhoto: true) : Text(e.category, style: body(11, GlamPalette.onPhotoMuted)),
          Text(e.name, style: body(13, GlamPalette.onPhoto, w: FontWeight.w700, height: 16)),
          Text(e.date, style: body(11, GlamPalette.onPhotoMuted)),
        ])),
      ])));
}
