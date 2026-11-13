import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import 'design_render.dart';
import 'pending.dart';
import 'screen_registry.dart';

typedef GoTo = void Function(String id);

/// Status-bar style helper: photo-led screens use light icons.
Widget overlay(bool lightIcons, Widget child) => AnnotatedRegion<SystemUiOverlayStyle>(
  value: lightIcons ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark, child: child);

/// Fixed-canvas photo screens cannot scroll without breaking the design, so display text is capped at 1.3x (system scale still applies up to that).
Widget fixedCanvas(Widget child) => Builder(builder: (c) => MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3, child: child));

double topInset(BuildContext c) => MediaQuery.paddingOf(c).top + 6; // design: `.top{top:50px}` under a 44px status bar.

/// `.top` row.
class TopRow extends StatelessWidget {
  const TopRow({super.key, required this.children});
  final List<Widget> children;
  @override Widget build(BuildContext context) => Positioned(top: topInset(context), left: 14, right: 14,
    child: Row(children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(width: 8), children[i]]]));
}

class TabTitle extends StatelessWidget {
  const TabTitle(this.text, {super.key});
  final String text;
  @override Widget build(BuildContext context) => Expanded(child: Text(text.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis, style: GlamType.body(16, w: FontWeight.w700, spacing: 2, color: kHeroText)));
}

const _creditsLabel = '✧ Credits'; // design shows "12 credits" sample data; balances come from the account (not connected in Batch 1).

// ───────────────────────── Home ─────────────────────────
class HomeTab extends StatefulWidget {
  const HomeTab({super.key, required this.go});
  final GoTo go;
  @override State<HomeTab> createState() => _HomeTabState();
}
class _HomeTabState extends State<HomeTab> {
  String filter = 'For you';
  static const looks = ['Soft bronze', 'Rose after hours', 'Everyday natural', 'Clean & considered'];
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), go = widget.go;
    return overlay(true, ListView(padding: EdgeInsets.zero, children: [
      SizedBox(height: 560, child: Stack(fit: StackFit.expand, children: [
        const SpritePhoto(n: 0, height: 560), const Scrim(fraction: .55),
        TopRow(children: [const Spacer(), GlassPill(label: _creditsLabel, onTap: () => go('GL-126')), GlassCircle(glyph: '♢', label: 'Notifications', onTap: () => go('GL-197'))]),
        Positioned(left: 22, right: 22, bottom: 26, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          const Kick('Your daily dose of you', color: kHeroKick),
          Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('Your next look\nstarts here.', style: GlamType.display(46, height: 48, spacing: -1.2, color: kHeroText))),
          Row(children: [Expanded(child: PillButton('◎ Analyze my face', onTap: () => go('GL-017'))), const SizedBox(width: 10),
            Expanded(child: PillButton('✧ Try a look', kind: BtnKind.glass, onTap: () => go('GL-035')))]),
        ])),
      ])),
      const SizedBox(height: 8),
      Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: ChipRow(items: const ['For you', 'Makeup', 'Hair', 'Events'], value: filter, onChanged: (v) => setState(() => filter = v))),
      Padding(padding: const EdgeInsets.only(top: 4), child: SingleChildScrollView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 22),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [for (var i = 0; i < 4; i++) ...[if (i > 0) const SizedBox(width: 12),
          GestureDetector(onTap: () => go('GL-035'), child: SizedBox(width: 150, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [SpriteImg(n: i, w: 150, h: 200, r: 20),
            Padding(padding: const EdgeInsets.fromLTRB(0, 10, 0, 2), child: Text(looks[i], style: GlamType.body(14, w: FontWeight.w700, color: t.tx))),
            Text('Try on · Illustrative', style: GlamType.body(12, height: 18, color: t.tx2))])))]]))),
      Padding(padding: const EdgeInsets.symmetric(horizontal: 22), child: Column(children: [
        GlamCard(onTap: () => go('GL-017'), child: Row(children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: Text('◎', style: GlamType.body(17, color: t.ac2))),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Start your first analysis', style: GlamType.body(15, w: FontWeight.w700, color: t.tx)),
            Text('Face, skin and hair · about 2 minutes', style: GlamType.body(12, height: 18, color: t.tx2))])),
          Text('›', style: GlamType.body(20, color: t.tx2))])),
        GlamCard(color: t.sf2, onTap: () => go('GL-056'), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Kick('An occasion coming up?'), Text('Let’s style the moment.', style: GlamType.display(22, height: 26, color: t.tx))])),
        const SizedBox(height: 130),
      ])),
    ]));
  }
}

// ───────────────────────── Analyze landing (GL-017) ─────────────────────────
class AnalyzeTab extends StatelessWidget {
  const AnalyzeTab({super.key, required this.go, required this.onStart, required this.onHistory});
  final GoTo go; final VoidCallback onStart, onHistory;
  @override Widget build(BuildContext context) => fixedCanvas(overlay(true, Stack(fit: StackFit.expand, children: [
    const SpritePhoto(n: 2), const Scrim(fraction: .6),
    Align(alignment: Alignment.center, child: Transform.translate(offset: const Offset(0, -80), child: Opacity(opacity: .7, child: Container(width: 250, height: 340,
      decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xe6fff4f0), width: 2)))))),
    TopRow(children: [const TabTitle('Analyze'), GlassPill(label: 'History', onTap: onHistory)]),
    Positioned(left: 22, right: 22, bottom: 112 + MediaQuery.paddingOf(context).bottom * 0, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Kick('A new way to see your possibilities', color: kHeroKick),
      Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('See what makes\nyou, you.', style: GlamType.display(40, height: 42, spacing: -1.2, color: kHeroText))),
      Padding(padding: const EdgeInsets.only(bottom: 14), child: Text('Your features are a starting point, never a score.', style: GlamType.body(15, height: 23, color: const Color(0xffe8d9e0)))),
      PillButton('Start analysis', onTap: onStart),
      SizedBox(width: double.infinity, child: Text('Editorial image · your photo stays private', textAlign: TextAlign.center, style: GlamType.body(12, height: 18, color: const Color(0xffd9c9d2)))),
    ])),
  ])));
}

// ───────────────────────── Studio landing (GL-035) ─────────────────────────
class StudioTab extends StatelessWidget {
  const StudioTab({super.key, required this.go});
  final GoTo go;
  @override Widget build(BuildContext context) => fixedCanvas(overlay(true, Stack(fit: StackFit.expand, children: [
    const SpritePhoto(n: 1), const Scrim(fraction: .65),
    TopRow(children: [const TabTitle('Studio'), GlassPill(label: _creditsLabel, onTap: () => go('GL-126'))]),
    Positioned(left: 22, right: 22, bottom: 112, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Kick('Your expression lab', color: kHeroKick),
      Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('Make it your own.', style: GlamType.display(40, height: 42, spacing: -1.2, color: kHeroText))),
      Padding(padding: const EdgeInsets.only(bottom: 12), child: Row(children: [
        for (final (i, e) in [('Makeup', 'GL-037'), ('Hair', 'GL-044'), ('AI look', 'GL-047')].indexed) ...[if (i > 0) const SizedBox(width: 10),
          Expanded(child: SizedBox(height: 48, child: GlassPill(label: e.$1, center: true, onTap: () => go(e.$2))))]])),
      PillButton('Choose a photo', onTap: () => go('GL-036')),
    ])),
  ])));
}

// ───────────────────────── Discover (GL-069) ─────────────────────────
class DiscoverTab extends StatefulWidget {
  const DiscoverTab({super.key, required this.go});
  final GoTo go;
  @override State<DiscoverTab> createState() => _DiscoverTabState();
}
class _DiscoverTabState extends State<DiscoverTab> {
  String filter = 'For you'; bool saved = false, following = false;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), go = widget.go;
    return fixedCanvas(overlay(true, Stack(fit: StackFit.expand, children: [
      const SpritePhoto(n: 1), const Scrim(fraction: .55),
      TopRow(children: [Expanded(child: GlassPill(label: '⌕ Search looks, creators…', height: 44, onTap: () => go('GL-070'))), GlassCircle(glyph: '♢', label: 'Notifications', onTap: () => go('GL-197'))]),
      Positioned(top: MediaQuery.paddingOf(context).top + 60, left: 0, right: 0, child: ChipRow(glass: true, items: const ['For you', 'Trending', 'Following', 'Tutorials'], value: filter,
        onChanged: (v) => v == 'Following' ? go('GL-075') : v == 'Tutorials' ? go('GL-080') : v == 'Trending' ? go('GL-072') : setState(() => filter = v))),
      Positioned(right: 14, bottom: 300, child: Column(children: [
        for (final (g, l) in [('♡', 'Save'), ('✧', 'Try on'), ('☰', 'Shop'), ('↗', 'Share')]) Padding(padding: const EdgeInsets.only(bottom: 14), child: Column(children: [
          GlassCircle(glyph: g, label: l, solid: l == 'Save' && saved ? t.ac : null, solidFg: l == 'Save' && saved ? t.onAc : null,
            onTap: () => l == 'Save' ? setState(() => saved = !saved) : go(l == 'Try on' ? 'GL-035' : 'GL-052')),
          Text(l, style: GlamType.body(11, color: kHeroText))])) ])),
      Positioned(left: 22, right: 80, bottom: 182, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Padding(padding: const EdgeInsets.only(bottom: 10), child: Row(children: [
          Expanded(child: GestureDetector(onTap: () => go('GL-074'), child: Row(children: [SpriteImg(n: 3, w: 40, h: 40, r: 20), const SizedBox(width: 10),
            Flexible(child: Text('@amarabeauty', maxLines: 1, overflow: TextOverflow.ellipsis, style: GlamType.body(15, w: FontWeight.w700, color: kHeroText)))]))),
          const SizedBox(width: 10), GlassPill(label: following ? 'Following ✓' : 'Follow', height: 44, onTap: () => setState(() => following = !following))])),
        Text('Rose after hours', style: GlamType.display(26, height: 29, spacing: -.5, color: kHeroText)),
        Padding(padding: const EdgeInsets.only(top: 4), child: Text('Soft rose lids, berry lip · Illustrative creator content', style: GlamType.body(12, height: 18, color: const Color(0xffd9c9d2)))),
      ])),
    ])));
  }
}

// ───────────────────────── Profile (GL-117) ─────────────────────────
class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key, required this.go});
  final GoTo go;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), top = MediaQuery.paddingOf(context).top + 12;
    Widget group(List<(String, String, String?, String)> rows) => GlamCard(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4), child: Column(children: [
      for (final (i, r) in rows.indexed) GlamRow(glyph: r.$1, title: r.$2, subtitle: r.$3, last: i == rows.length - 1, onTap: () => go(r.$4))]));
    return overlay(!t.isDark ? false : true, ListView(padding: EdgeInsets.fromLTRB(22, top, 22, 0), children: [
      Padding(padding: const EdgeInsets.only(bottom: 20), child: Row(children: [
        SpriteImg(n: 3, w: 72, h: 72, r: 36), const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Your space.', style: GlamType.display(28, height: 30, color: t.tx)),
          Text('Guest · Personal', style: GlamType.body(12, height: 18, color: t.tx2))])),
        GlassCircle(glyph: '⇄', label: 'Switch role', solid: t.sf2, solidFg: t.tx, onTap: () => go('GL-202'))])),
      GlamCard(onTap: () => go('GL-126'), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Text('AI credits', style: GlamType.body(15, w: FontWeight.w700, color: t.tx)), const SizedBox(width: 12), Expanded(child: Text('Plan not connected', textAlign: TextAlign.end, maxLines: 1, overflow: TextOverflow.ellipsis, style: GlamType.body(12, color: t.tx2)))]),
        Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text('Balance unavailable', style: GlamType.display(26, color: t.tx))),
        Padding(padding: const EdgeInsets.only(bottom: 2), child: Text('Balances come from your account, not this device.', style: GlamType.body(12, color: t.tx2))),
        const SizedBox(height: 8), const ProgressBar(0)])),
      group(const [('✦', 'My beauty plans', 'Transformations & progress', 'TP-12'), ('♡', 'Saved looks & collections', null, 'GL-120'), ('◎', 'Analysis history', null, 'GL-121'),
        ('○', 'Edit profile', null, 'GL-118'), ('⌂', 'Wardrobe & routines', null, 'GL-122'), ('☰', 'Orders & bookings', null, 'GL-123')]),
      group(const [('✧', 'Subscription', 'Free · Upgrade', 'GL-124'), ('↻', 'Manage plan', null, 'GL-125'), ('♢', 'Notifications', null, 'GL-129'),
        ('✎', 'Beauty preferences', null, 'GL-119'), ('▣', 'Billing & payment methods', null, 'GL-128'), ('◌', 'Privacy & security', null, 'GL-130')]),
      const SizedBox(height: 130),
    ]));
  }
}

// ───────────────────────── Shell ─────────────────────────
/// design `ALIAS` (ids that open another designed screen).
const kAlias = {'GL-021': 'GL-036', 'GL-038': 'GL-037', 'GL-040': 'GL-039', 'GL-041': 'GL-039', 'GL-042': 'GL-039', 'GL-043': 'GL-039', 'GL-045': 'GL-044'};

class GlamShell extends StatefulWidget {
  const GlamShell({super.key, required this.openAnalyze, this.openHand});
  /// Opens the real private Analyze journey (camera → consent → server analysis); `history` loads the account's saved analyses.
  final void Function({required bool history}) openAnalyze;
  /// Opens hand-built screens that wrap real flows (Analyze capture/results). Returns true when handled.
  final bool Function(String id)? openHand;
  @override State<GlamShell> createState() => _GlamShellState();
}
class _GlamShellState extends State<GlamShell> {
  int index = 0;
  final stack = <String>[];
  static const tabId = ['home', 'GL-017', 'GL-035', 'GL-069', 'GL-117'];
  bool storeReady = DesignStore.has('GL-209');
  @override void initState() {
    super.initState();
    DesignStore.load().then((_) { if (mounted) setState(() => storeReady = true); }, onError: (_) {});
  }
  void go(String raw) {
    final id = kScreenRegistry.containsKey(raw) ? raw : (kAlias[raw] ?? raw), i = tabId.indexOf(id); // alias only for ids with no screen of their own
    if (i >= 0) {
      if (id == 'GL-017' && index == 1 && stack.isEmpty) { widget.openAnalyze(history: false); return; }
      Navigator.of(context).popUntil((r) => r.isFirst); stack.clear(); setState(() => index = i); return;
    }
    if (widget.openHand?.call(id) ?? false) return;
    if (stack.length >= 2 && stack[stack.length - 2] == id) { Navigator.of(context).pop(); return; }
    stack.add(id);
    final page = DesignStore.has(id) ? Scaffold(backgroundColor: const Color(0xff0f0e10), body: DesignScreen(id: id, go: go)) : PendingScreen(id: id, go: go);
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => overlay(true, page))).then((_) { if (stack.isNotEmpty) stack.removeLast(); });
  }
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return ColoredBox(color: t.bg, child: Stack(fit: StackFit.expand, children: [
      IndexedStack(index: index, children: [
        HomeTab(go: go),
        AnalyzeTab(go: go, onStart: () => widget.openAnalyze(history: false), onHistory: () => widget.openAnalyze(history: true)),
        StudioTab(go: go), DiscoverTab(go: go), ProfileTab(go: go)]),
      GlamTabBar(index: index, onSelect: (i) => setState(() => index = i)),
    ]));
  }
}
