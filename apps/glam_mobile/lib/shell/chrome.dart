import 'package:flutter/material.dart';
import '../design/glyphs.dart';
import 'package:go_router/go_router.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import 'nav.dart';

const _tabs = [('Home', '⌂', 'home'), ('Analyze', '◎', 'GL-017'), ('Studio', '✧', 'GL-035'), ('Discover', '⌖', 'GL-069'), ('Profile', '○', 'GL-117')];

/// Persistent consumer chrome from design `chrome.jsx`: brand + messages bar
/// above, five-tab bar below, content viewport between.
class GlamShell extends StatelessWidget {
  const GlamShell({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final insets = MediaQuery.paddingOf(context);
    // The design reserves a 44px status area and 24px bottom area on both platforms.
    final top = insets.top < 44 ? 44.0 : insets.top;
    // The design uses fixed pixel metrics, so persistent chrome and the on-photo
    // landings cap system text growth at 1.3x instead of overflowing. Screens that
    // scroll (Home, Profile, pending, analysis) still scale; see defect register.
    return MediaQuery(data: MediaQuery.of(context).copyWith(textScaler: MediaQuery.textScalerOf(context).clamp(maxScaleFactor: 1.3)), child: Scaffold(backgroundColor: p.bg, body: Column(children: [
      _TopBar(topInset: top),
      Expanded(child: MediaQuery.removePadding(context: context, removeTop: true, removeBottom: true, child: navigationShell)),
      _TabBar(current: navigationShell.currentIndex, bottomInset: insets.bottom, onSelect: (i) => navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex)),
    ])));
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.topInset});
  final double topInset;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return Container(height: topInset + 56, padding: EdgeInsets.fromLTRB(16, topInset + 2, 16, 0),
      decoration: BoxDecoration(color: p.bg, border: Border(bottom: BorderSide(color: p.ln))),
      child: Row(children: [
        Tappable(onTap: () => GlamNav.to(context, 'home'), label: 'GLAM Beauty home',
          child: ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.asset('assets/brand/app-icon.png', width: 44, height: 44, fit: BoxFit.cover))),
        const Spacer(),
        GlassIconButton(glyph: '✉', label: 'Messages', badge: true, blur: false, fill: p.sf2, color: p.tx, id: 'top-messages', onTap: () => GlamNav.to(context, 'GL-198')),
      ]));
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({required this.current, required this.bottomInset, required this.onSelect});
  final int current;
  final double bottomInset;
  final ValueChanged<int> onSelect;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final android = context.isAndroidStyle;
    final bottom = bottomInset < 24 ? 24.0 : bottomInset;
    return Container(height: 60 + bottom, padding: EdgeInsets.fromLTRB(10, 8, 10, bottom),
      decoration: BoxDecoration(color: p.tabsFill, border: Border(top: BorderSide(color: p.ln))),
      child: Semantics(container: true, label: 'Main tabs', child: Row(children: [
        for (var i = 0; i < _tabs.length; i++) Expanded(child: _Tab(label: _tabs[i].$1, glyph: _tabs[i].$2, selected: i == current, android: android, onTap: () => onSelect(i))),
      ])));
  }
}

class _Tab extends StatelessWidget {
  const _Tab({required this.label, required this.glyph, required this.selected, required this.android, required this.onTap});
  final String label, glyph;
  final bool selected, android;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final fg = selected ? p.onAc : p.tx2;
    return Semantics(button: true, selected: selected, label: label, identifier: 'tab-${label.toLowerCase()}', excludeSemantics: true,
      child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: DecoratedBox(
        decoration: BoxDecoration(color: selected ? p.ac : null, borderRadius: BorderRadius.circular(android ? 16 : 27)),
        child: Center(child: FittedBox(fit: BoxFit.scaleDown, child: Column(mainAxisSize: MainAxisSize.min, children: [
          GText(glyph, strutStyle: const StrutStyle(fontSize: 19, height: 23 / 19, forceStrutHeight: true), style: body(19, fg, height: 23)),
          const SizedBox(height: 1),
          Text(label, strutStyle: StrutStyle(fontSize: android ? 12 : 11, height: 14 / (android ? 12 : 11), forceStrutHeight: true), style: body(android ? 12 : 11, fg, w: selected ? FontWeight.w700 : FontWeight.w400, height: 14)),
        ]))))));
  }
}
