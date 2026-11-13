import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'glyphs.dart';
import 'tokens.dart';

const kPhotoAspect = 0.75; // EW in ui.jsx: each sprite panel is 3:4.
const kScrimColor = Color(0xe00a080a); // rgba(10,8,10,.88)
const kHeroText = Color(0xfffff4f0);
const kHeroKick = Color(0xfff6c6d8);

bool isAndroid(BuildContext c) => Theme.of(c).platform == TargetPlatform.android;

/// Port of `Photo` in ui.jsx: one panel of a 4-panel sprite, cover-cropped to w×h.
class SpritePhoto extends StatelessWidget {
  const SpritePhoto({super.key, this.n = 0, this.src = 'beauty-editorial.webp', this.width, this.height, this.filter});
  final int n;
  final String src;
  final double? width, height;
  final ColorFilter? filter;
  @override Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
    final w = width ?? c.maxWidth, h = height ?? c.maxHeight;
    final sh = h > w / kPhotoAspect ? h : w / kPhotoAspect, pw = kPhotoAspect * sh;
    final x = -(n * pw + (pw - w) / 2), y = -0.15 * (sh - h);
    Widget img = Image.asset('assets/imagery/$src', width: 4 * pw, height: sh, fit: BoxFit.fill, excludeFromSemantics: true, filterQuality: FilterQuality.medium);
    if (filter != null) img = ColorFiltered(colorFilter: filter!, child: img);
    return SizedBox(width: w, height: h, child: ClipRect(child: OverflowBox(alignment: Alignment.topLeft, minWidth: 0, minHeight: 0,
      maxWidth: 4 * pw, maxHeight: sh, child: Transform.translate(offset: Offset(x, y), child: img))));
  });
}

/// `Img`: rounded sprite thumbnail.
class SpriteImg extends StatelessWidget {
  const SpriteImg({super.key, this.n = 0, required this.w, required this.h, this.r = 18});
  final int n; final double w, h, r;
  @override Widget build(BuildContext context) => ClipRRect(borderRadius: BorderRadius.circular(r), child: SpritePhoto(n: n, width: w, height: h));
}

class Scrim extends StatelessWidget {
  const Scrim({super.key, this.fraction = .45});
  final double fraction;
  @override Widget build(BuildContext context) => Positioned.fill(child: IgnorePointer(child: Align(alignment: Alignment.bottomCenter, child: FractionallySizedBox(heightFactor: fraction, widthFactor: 1, child: const DecoratedBox(
    decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x000a080a), kScrimColor])))))));
}

Widget glassBlur({required Widget child, double sigma = 14, BorderRadius? radius}) => ClipRRect(borderRadius: radius ?? BorderRadius.zero,
  child: BackdropFilter(filter: ImageFilter.blur(sigmaX: sigma, sigmaY: sigma), child: child));

void _tap(VoidCallback f) { HapticFeedback.selectionClick(); f(); }

/// `.gb`: 44px glass circle button.
class GlassCircle extends StatelessWidget {
  const GlassCircle({super.key, required this.glyph, required this.label, this.onTap, this.solid, this.solidFg});
  final String glyph, label; final VoidCallback? onTap; final Color? solid, solidFg;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return Semantics(button: true, label: label, excludeSemantics: true, child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap == null ? null : () => _tap(onTap!),
      child: SizedBox(width: 44, height: 44, child: glassBlur(radius: BorderRadius.circular(22), child: ColoredBox(color: solid ?? t.glass,
        child: Center(child: GText(glyph, style: GlamType.body(19, color: solidFg ?? t.onGlass))))))));
  }
}

/// `.gp`: glass pill.
class GlassPill extends StatelessWidget {
  const GlassPill({super.key, required this.label, this.onTap, this.center = false, this.height = 40, this.leading});
  final String label; final VoidCallback? onTap; final bool center; final double height; final Widget? leading;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), r = BorderRadius.circular(isAndroid(context) ? 10 : 20);
    return Semantics(button: onTap != null, child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap == null ? null : () => _tap(onTap!),
      child: ConstrainedBox(constraints: const BoxConstraints(minHeight: 44), child: glassBlur(radius: r, child: ColoredBox(color: t.glass, child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14), child: Row(mainAxisSize: center ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center, children: [if (leading != null) ...[leading!, const SizedBox(width: 6)],
            Flexible(child: MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3, child: GText(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: GlamType.body(13, color: t.onGlass))))])))))));
  }
}

enum BtnKind { primary, ghost, glass, disabled }
/// `.btn`: 54px pill, margin 6 0.
class PillButton extends StatelessWidget {
  const PillButton(this.label, {super.key, this.kind = BtnKind.primary, this.onTap});
  final String label; final BtnKind kind; final VoidCallback? onTap;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    final (bg, fg, border) = switch (kind) {
      BtnKind.primary => (t.primaryBtn, t.onPrimaryBtn, null),
      BtnKind.ghost => (Colors.transparent, t.tx, t.ln),
      BtnKind.glass => (t.glass, t.onGlass, null),
      BtnKind.disabled => (t.sf2, t.tx2, null),
    };
    Widget box = Container(constraints: const BoxConstraints(minHeight: 54), padding: const EdgeInsets.symmetric(horizontal: 20), alignment: Alignment.center,
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(27), border: border == null ? null : Border.all(color: border)),
      child: Text(label, textAlign: TextAlign.center, style: GlamType.body(15, w: FontWeight.w700, color: fg)));
    if (kind == BtnKind.glass) box = glassBlur(radius: BorderRadius.circular(27), child: box);
    return Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Semantics(button: true, enabled: kind != BtnKind.disabled && onTap != null,
      child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: kind == BtnKind.disabled || onTap == null ? null : () => _tap(onTap!), child: box)));
  }
}

/// `.chips` + `.chip`.
class ChipRow extends StatelessWidget {
  const ChipRow({super.key, required this.items, required this.value, required this.onChanged, this.glass = false, this.pad = 22});
  final List<String> items; final String value; final ValueChanged<String> onChanged; final bool glass; final double pad;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), r = BorderRadius.circular(isAndroid(context) ? 10 : 20);
    return SizedBox(height: 44, child: ListView.separated(scrollDirection: Axis.horizontal, padding: EdgeInsets.symmetric(horizontal: pad),
      itemCount: items.length, separatorBuilder: (_, _) => const SizedBox(width: 8), itemBuilder: (_, i) {
        final on = items[i] == value;
        Widget box = Container(constraints: const BoxConstraints(minWidth: 44), padding: const EdgeInsets.symmetric(horizontal: 16), alignment: Alignment.center,
          decoration: BoxDecoration(color: on ? t.ac : (glass ? t.glass : Colors.transparent), borderRadius: r,
            border: glass && !on ? null : Border.all(color: on ? t.ac : t.ln)),
          child: Text(items[i], style: GlamType.body(14, color: on ? t.onAc : (glass ? t.onGlass : t.tx))));
        if (glass && !on) box = glassBlur(radius: r, child: box);
        return Semantics(button: true, selected: on, child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: () => _tap(() => onChanged(items[i])), child: box));
      }));
  }
}

class GlamCard extends StatelessWidget {
  const GlamCard({super.key, required this.child, this.onTap, this.color, this.padding = const EdgeInsets.all(18)});
  final Widget child; final VoidCallback? onTap; final Color? color; final EdgeInsetsGeometry padding;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    final box = Container(width: double.infinity, padding: padding, decoration: BoxDecoration(color: color ?? t.sf, borderRadius: BorderRadius.circular(22), border: Border.all(color: t.ln)), child: child);
    return Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: onTap == null ? box : GestureDetector(behavior: HitTestBehavior.opaque, onTap: () => _tap(onTap!), child: box));
  }
}

/// `.row`: icon circle, title/subtitle, chevron.
class GlamRow extends StatelessWidget {
  const GlamRow({super.key, required this.glyph, required this.title, this.subtitle, this.onTap, this.last = false, this.chevron = true});
  final String glyph, title; final String? subtitle; final VoidCallback? onTap; final bool last, chevron;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return Semantics(button: onTap != null, child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap == null ? null : () => _tap(onTap!),
      child: Container(constraints: const BoxConstraints(minHeight: 56), padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(border: last ? null : Border(bottom: BorderSide(color: t.ln))),
        child: Row(children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: GText(glyph, style: GlamType.body(17, color: t.ac2))),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(title, style: GlamType.body(15, w: FontWeight.w600, color: t.tx)),
            if (subtitle != null) Text(subtitle!, style: GlamType.body(12, color: t.tx2)),
          ])),
          if (chevron) Text('›', style: GlamType.body(20, color: t.tx2)),
        ]))));
  }
}

class Kick extends StatelessWidget {
  const Kick(this.text, {super.key, this.color});
  final String text; final Color? color;
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 10),
    child: Text(text.toUpperCase(), style: GlamType.body(11, w: FontWeight.w700, spacing: 2, color: color ?? GlamTokens.of(context).ac2)));
}

class ProgressBar extends StatelessWidget {
  const ProgressBar(this.value, {super.key});
  final double value;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return ClipRRect(borderRadius: BorderRadius.circular(3), child: SizedBox(height: 6, child: Stack(children: [
      ColoredBox(color: t.sf2, child: const SizedBox.expand()), FractionallySizedBox(widthFactor: value.clamp(0, 1), child: ColoredBox(color: t.ac2, child: const SizedBox.expand()))])));
  }
}

class TabSpec { const TabSpec(this.label, this.glyph); final String label, glyph; }
const kTabs = [TabSpec('Home', '⌂'), TabSpec('Analyze', '◎'), TabSpec('Studio', '✧'), TabSpec('Discover', '⌖'), TabSpec('Profile', '○')];

/// `.tabs`: iOS floating glass pill (66px, 16/18 insets); Android full-width bar (78px, top hairline).
class GlamTabBar extends StatelessWidget {
  const GlamTabBar({super.key, required this.index, required this.onSelect});
  final int index; final ValueChanged<int> onSelect;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), android = isAndroid(context), inset = MediaQuery.paddingOf(context).bottom;
    final items = Row(children: [for (var i = 0; i < kTabs.length; i++) Expanded(child: Semantics(button: true, selected: i == index, label: kTabs[i].label, excludeSemantics: true,
      child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: () => _tap(() => onSelect(i)),
        child: Container(decoration: BoxDecoration(color: i == index ? t.ac : Colors.transparent, borderRadius: BorderRadius.circular(android ? 16 : 27)),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            GText(kTabs[i].glyph, style: GlamType.body(19, color: i == index ? t.onAc : t.tx2)),
            Padding(padding: const EdgeInsets.symmetric(horizontal: 2), child: FittedBox(fit: BoxFit.scaleDown, child: Text(kTabs[i].label, maxLines: 1,
              style: GlamType.body(android ? 12 : 11, w: i == index ? FontWeight.w700 : FontWeight.w400, color: i == index ? t.onAc : t.tx2)))),
          ])))))]);
    final bar = MediaQuery.withClampedTextScaling(maxScaleFactor: 1.3, child: items);
    if (android) {
      final bottom = inset > 20 ? inset : 20.0;
      return Positioned(left: 0, right: 0, bottom: 0, child: glassBlur(sigma: 22, child: Container(height: 58 + 8 + bottom, padding: EdgeInsets.fromLTRB(8, 8, 8, bottom),
        decoration: BoxDecoration(color: t.isDark ? t.glass : const Color(0xd9ffffff), border: Border(top: BorderSide(color: t.ln))), child: bar)));
    }
    return Positioned(left: 16, right: 16, bottom: inset > 18 ? inset - 16 : 18, child: glassBlur(sigma: 22, radius: BorderRadius.circular(33), child: Container(height: 66, padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(color: t.isDark ? t.glass : const Color(0xd9ffffff), borderRadius: BorderRadius.circular(33),
        border: Border.all(color: t.isDark ? const Color(0x14ffffff) : t.ln)), child: bar)));
  }
}

/// `.tray`: bottom sheet surface (30px top radius, grab handle). Place inside a Stack.
class GlamTray extends StatelessWidget {
  const GlamTray({super.key, required this.child, this.top, this.maxHeightFraction});
  final Widget child; final double? top, maxHeightFraction;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), inset = MediaQuery.paddingOf(context).bottom;
    final body = Container(width: double.infinity, padding: EdgeInsets.fromLTRB(22, 10, 22, inset > 34 ? inset : 34),
      decoration: BoxDecoration(color: t.sf, borderRadius: BorderRadius.vertical(top: Radius.circular(isAndroid(context) ? 28 : 30)),
        boxShadow: const [BoxShadow(color: Color(0x59000000), blurRadius: 40, offset: Offset(0, -10))]),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 14), decoration: BoxDecoration(color: t.ln, borderRadius: BorderRadius.circular(2)))),
        if (top != null) Flexible(child: child) else child]));
    return top != null ? Positioned(left: 0, right: 0, top: top, bottom: 0, child: body) : Positioned(left: 0, right: 0, bottom: 0, child: body);
  }
}

/// `.sw`: 51×31 toggle (52×32 on Android).
class GlamSwitch extends StatelessWidget {
  const GlamSwitch({super.key, required this.on, required this.onChanged, required this.label});
  final bool on; final ValueChanged<bool>? onChanged; final String label;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return Semantics(toggled: on, label: label, enabled: onChanged != null, child: GestureDetector(behavior: HitTestBehavior.opaque,
      onTap: onChanged == null ? null : () => _tap(() => onChanged!(!on)),
      child: SizedBox(width: 51, height: 44, child: Center(child: AnimatedContainer(duration: const Duration(milliseconds: 160), width: 51, height: 31,
        decoration: BoxDecoration(color: on ? t.ac2 : t.ln, borderRadius: BorderRadius.circular(16)),
        child: AnimatedAlign(duration: const Duration(milliseconds: 160), alignment: on ? Alignment.centerRight : Alignment.centerLeft,
          child: Padding(padding: const EdgeInsets.all(2), child: Container(width: 27, height: 27, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)))))))));
  }
}

/// `.oval`: 250×340 face guide centred 40px above the viewport centre. Place inside a Stack.
class OvalGuide extends StatelessWidget {
  const OvalGuide({super.key, this.opacity = 1, this.dy = -40});
  final double opacity, dy;
  @override Widget build(BuildContext context) => IgnorePointer(child: Align(alignment: Alignment.center, child: Transform.translate(offset: Offset(0, dy), child: Opacity(opacity: opacity,
    child: Container(width: 250, height: 340, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xe6fff4f0), width: 2)))))));
}

/// `.scan`: sweeping line used while analysis runs.
class ScanLine extends StatefulWidget { const ScanLine({super.key}); @override State<ScanLine> createState() => _ScanLineState(); }
class _ScanLineState extends State<ScanLine> with SingleTickerProviderStateMixin {
  late final AnimationController c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2200))..repeat(reverse: true);
  @override void dispose() { c.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return IgnorePointer(child: LayoutBuilder(builder: (context, box) => AnimatedBuilder(animation: c, builder: (_, _) => Stack(children: [
      Positioned(left: 0, right: 0, top: box.maxHeight * (.18 + .54 * Curves.easeInOut.transform(c.value)), child: Container(height: 3,
        decoration: BoxDecoration(color: t.ac, boxShadow: [BoxShadow(color: t.ac, blurRadius: 24, spreadRadius: 6)])))]))));
  }
}

/// Plain-screen top bar (`.top` with back button + centred 18px display title).
class GlamTopBar extends StatelessWidget {
  const GlamTopBar({super.key, required this.title, this.onBack, this.onGlass = false});
  final String title; final VoidCallback? onBack; final bool onGlass;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return Positioned(top: MediaQuery.paddingOf(context).top + 6, left: 14, right: 14, child: Row(children: [
      onBack == null ? const SizedBox(width: 44) : GlassCircle(glyph: isAndroid(context) ? '←' : '‹', label: 'Back', onTap: onBack),
      Expanded(child: Text(title, textAlign: TextAlign.center, style: GlamType.display(18, color: onGlass ? kHeroText : t.tx))), const SizedBox(width: 44)]));
  }
}
