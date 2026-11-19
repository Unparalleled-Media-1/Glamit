import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../data/ad_placements.dart';
import '../data/fixtures.dart';
import '../design/analyze_widgets.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../shell/nav.dart';
import 'ad_widgets.dart';

/// In-memory placement choices for the advertiser campaign flow. Nothing is saved or sent: there is no
/// advertiser backend yet, so GL-211/GL-212 only let a business explore placements and the consumer layout.
class AdCampaignDraft extends ChangeNotifier {
  AdCampaignDraft([List<String>? initial]) : selected = [...(initial ?? adSelectionDefault)];
  static final instance = AdCampaignDraft();
  final List<String> selected;
  void toggle(String id) { selected.contains(id) ? selected.remove(id) : selected.add(id); notifyListeners(); }
}

const _mock = {'Home': 'Your next look starts here.', 'Discover': 'Rose after hours', 'Search': 'Search results', 'Studio': 'Choose a shade',
  'Analysis': 'Your analysis summary', 'Events': 'Themed events', 'Shop': 'The beauty edit.', 'Professionals': 'Find your stylist.', 'Creator': 'Soft bronze in 5 steps'};
const _campHeading = 'Summer glow', _campSub = 'Your business · sample ad', _campCta = 'Shop now';

class _AdPage extends StatelessWidget {
  const _AdPage({required this.title, required this.back, required this.children, required this.action});
  final String title, back; final List<Widget> children; final Widget action;
  @override Widget build(BuildContext context) {
    final t = context.glam, inset = MediaQuery.paddingOf(context);
    return Scaffold(backgroundColor: t.bg, resizeToAvoidBottomInset: false, body: Stack(children: [
      ListView(padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 130 + inset.bottom), children: children),
      GlamTray(child: action),
      GlamTopBar(title: title, onBack: () => context.canPop() ? context.pop() : GlamNav.to(context, back)),
    ]));
  }
}

/// GL-211 — choose which in-app placements a campaign may use (step 3 of 4).
class AdPlacementsScreen extends StatelessWidget {
  const AdPlacementsScreen({super.key, AdCampaignDraft? draft}) : _draft = draft;
  final AdCampaignDraft? _draft;
  @override Widget build(BuildContext context) {
    final t = context.glam, d = _draft ?? AdCampaignDraft.instance;
    final groups = <String>[for (final p in adPlacements) p.group].toSet().toList();
    return AnimatedBuilder(animation: d, builder: (context, _) => _AdPage(title: 'Placements', back: 'GL-172',
      action: d.selected.isEmpty
        ? const GlamButton('Select a placement to preview', id: 'ad-preview', kind: GlamButtonKind.disabled, onTap: null)
        : GlamButton('Preview in the app · ${d.selected.length}', id: 'ad-preview', onTap: () => GlamNav.to(context, 'GL-212')),
      children: [
        const Kicker('STEP 3 OF 4 · SAMPLE'),
        Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Text('Choose where your ad can appear. Every placement is labelled Sponsored and uses your creative from the previous step.', style: body(13, t.tx2, height: 20))),
        Text('Nothing is created or saved yet: the advertiser service is not connected.', style: body(12, t.tx2, height: 18)),
        for (final g in groups) ...[
          Padding(padding: const EdgeInsets.fromLTRB(0, 14, 0, 6), child: Kicker(g)),
          GlamCard(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4), child: Column(children: [
            for (final p in adPlacements.where((p) => p.group == g)) Container(constraints: const BoxConstraints(minHeight: 56), padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(children: [
                GlamSwitch(on: d.selected.contains(p.id), label: p.name, onChanged: (_) => d.toggle(p.id)), const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(p.name, style: body(14, t.tx, w: FontWeight.w700, height: 20)),
                  Text('${p.formats.join(' · ')} · est. ${p.reach}', style: body(12, t.tx2, height: 18))])),
              ])),
          ])),
        ],
        GlamCard(color: t.sf2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Not available for ads', style: body(13, t.tx, w: FontWeight.w700)),
          Text('Consent, camera, photo processing, payment and account deletion screens never show ads. Reach figures are samples.', style: body(13, t.tx2, height: 20))])),
      ]));
  }
}

Widget adPreviewOf(AdPlacement p) {
  switch (p.variant) {
    case 'hero': return HeroAdCard(HeroAd(id: p.id, advertiser: p.adv, title: _campHeading, cta: _campCta, dest: p.dest, asset: p.asset ?? 'assets/imagery/beauty-editorial.webp', portrait: p.portrait));
    case 'carousel': return CarouselAdStrip(CarouselAd(id: p.id, advertiser: p.adv, heading: p.heading, cta: p.cta, dest: p.dest, items: [for (final i in p.items) AdItem(i.$1, i.$2)]));
    case 'post': return PostAdPeek(PostAd(id: p.id, advertiser: p.adv, title: _campHeading, cta: _campCta, dest: p.dest, portrait: p.portrait));
    default: return CardAdSlot(CardAd(id: p.id, advertiser: p.adv, head: p.head, title: _campHeading, sub: _campSub, cta: _campCta, dest: p.dest, portrait: p.portrait, asset: p.asset));
  }
}

/// GL-212 — the selected placements in the consumer layout, with the no-fill behaviour.
class AdPreviewScreen extends StatefulWidget {
  const AdPreviewScreen({super.key, AdCampaignDraft? draft}) : _draft = draft;
  final AdCampaignDraft? _draft;
  @override State<AdPreviewScreen> createState() => _AdPreviewState();
}
class _AdPreviewState extends State<AdPreviewScreen> {
  String? group; bool noFill = false;
  AdCampaignDraft get d => widget._draft ?? AdCampaignDraft.instance;
  @override Widget build(BuildContext context) {
    final t = context.glam;
    final chosen = [for (final p in adPlacements) if (d.selected.contains(p.id)) p];
    final groups = <String>[for (final p in chosen) p.group].toSet().toList();
    final g = groups.contains(group) ? group! : (groups.isEmpty ? '' : groups.first);
    final cur = chosen.where((p) => p.group == g).toList();
    return _AdPage(title: 'Ad preview', back: 'GL-211',
      action: GlamButton('Continue to budget', id: 'ad-continue', onTap: () => GlamNav.to(context, 'GL-173')),
      children: [
        const Kicker('STEP 3 OF 4 · SAMPLE'),
        if (groups.isEmpty) GlamCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('No placements selected.', style: body(15, t.tx, w: FontWeight.w700)),
          GlamButton('Choose placements', id: 'ad-choose', kind: GlamButtonKind.ghost, onTap: () => GlamNav.to(context, 'GL-211'))]))
        else ...[
          Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: SingleChildScrollView(scrollDirection: Axis.horizontal,
            child: Row(children: [for (final x in groups) Padding(padding: const EdgeInsets.only(right: 8), child: GlamChip(x, selected: x == g, onTap: () => setState(() => group = x)))]))),
          Text('How shoppers will see it. Real layout, sample campaign copy.', style: body(13, t.tx2, height: 20)),
          Container(margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: t.bg, border: Border.all(color: t.ln), borderRadius: BorderRadius.circular(26)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(g.toUpperCase(), style: body(11, t.tx2, ls: 1)),
              Padding(padding: const EdgeInsets.only(top: 4, bottom: 10), child: Text(_mock[g] ?? '', style: display(22, 26, t.tx))),
              for (final p in cur) Semantics(identifier: 'preview-${p.id}', container: true, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                noFill
                  ? Container(margin: const EdgeInsets.symmetric(vertical: 12), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12), decoration: BoxDecoration(border: Border.all(color: t.ln), borderRadius: BorderRadius.circular(16)),
                      child: Text('No ad available — the slot collapses and organic content moves up. Nothing is shown in its place.', style: body(13, t.tx2, height: 19)))
                  : adPreviewOf(p),
                Text(p.id, style: body(11, t.tx2)),
              ])),
            ])),
          if (cur.isNotEmpty) GlamCard(child: Padding(padding: EdgeInsets.zero, child: Text.rich(TextSpan(style: body(13, t.tx, height: 20), children: [
            const TextSpan(text: 'Tapping opens: ', style: TextStyle(fontWeight: FontWeight.w700)), TextSpan(text: '${cur.first.dest}\n'),
            const TextSpan(text: 'Frequency: ', style: TextStyle(fontWeight: FontWeight.w700)), TextSpan(text: '${cur.first.freq}\n'),
            const TextSpan(text: 'If no ad is available: ', style: TextStyle(fontWeight: FontWeight.w700)), TextSpan(text: cur.first.fail)])))),
          Row(children: [GlamSwitch(on: noFill, label: 'Simulate no ad available', onChanged: (v) => setState(() => noFill = v)), const SizedBox(width: 14),
            Expanded(child: Text('Simulate no ad available', style: body(14, t.tx, height: 21)))]),
        ],
      ]);
  }
}
