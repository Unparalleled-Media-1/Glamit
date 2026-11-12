import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'tokens.dart';

TextStyle display(double size, double height, Color color, {double ls = 0}) =>
  TextStyle(fontFamily: GlamFonts.display, fontSize: size, height: height / size, color: color, letterSpacing: ls, fontWeight: FontWeight.w400);

TextStyle body(double size, Color color, {FontWeight w = FontWeight.w400, double? height, double ls = 0}) =>
  TextStyle(fontFamily: GlamFonts.body, fontSize: size, color: color, fontWeight: w, height: height == null ? null : height / size, letterSpacing: ls);

/// Design `.gb` (44px glass icon button) and `.gp` (glass pill) surface.
class GlassSurface extends StatelessWidget {
  const GlassSurface({super.key, required this.child, required this.radius, this.color, this.blur = 14});
  final Widget child;
  final double radius;
  final Color? color;
  final double blur;
  @override
  Widget build(BuildContext context) => ClipRRect(borderRadius: BorderRadius.circular(radius),
    child: BackdropFilter(filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
      child: ColoredBox(color: color ?? context.glam.glass, child: child)));
}

class Tappable extends StatelessWidget {
  const Tappable({super.key, required this.onTap, required this.child, this.label, this.button = true, this.id});
  final VoidCallback? onTap;
  final Widget child;
  final String? label, id;
  final bool button;
  @override
  Widget build(BuildContext context) => Semantics(button: button, label: label, identifier: id, container: true, excludeSemantics: label != null,
    child: GestureDetector(behavior: HitTestBehavior.opaque,
      onTap: onTap == null ? null : () { HapticFeedback.selectionClick(); onTap!(); }, child: child));
}

/// `.gb`: 44px circular glass button holding a glyph (default ongl colour).
class GlassIconButton extends StatelessWidget {
  const GlassIconButton({super.key, required this.glyph, required this.label, required this.onTap, this.fill, this.color, this.blur = true, this.badge = false, this.id});
  final String glyph, label;
  final VoidCallback? onTap;
  final Color? fill, color;
  final bool blur, badge;
  final String? id;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final inner = SizedBox(width: 44, height: 44, child: Stack(alignment: Alignment.center, children: [
      Text(glyph, style: body(19, color ?? p.onGlass)),
      if (badge) Positioned(top: 9, right: 10, child: Container(width: 9, height: 9,
        decoration: BoxDecoration(color: p.ac2, shape: BoxShape.circle, border: Border.all(color: p.sf2, width: 2)))),
    ]));
    return Tappable(onTap: onTap, label: label, id: id, child: blur
      ? GlassSurface(radius: 22, color: fill, child: inner)
      : DecoratedBox(decoration: BoxDecoration(color: fill ?? p.glass, shape: BoxShape.circle), child: inner));
  }
}

/// `.gp`: glass pill (min height 44, radius 20 iOS / 10 Android, 13px label).
class GlassPill extends StatelessWidget {
  const GlassPill({super.key, required this.label, required this.onTap, this.minHeight = 44, this.expand = false, this.center = false, this.id, this.fontSize = 13});
  final String label;
  final VoidCallback? onTap;
  final double minHeight, fontSize;
  final bool expand, center;
  final String? id;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final text = Text(label, maxLines: 1, overflow: TextOverflow.clip, softWrap: false, style: body(fontSize, p.onGlass));
    return Tappable(onTap: onTap, label: label, id: id, child: GlassSurface(radius: context.isAndroidStyle ? 10 : 20,
      child: ConstrainedBox(constraints: BoxConstraints(minHeight: minHeight, minWidth: expand ? double.infinity : 0),
        child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Align(alignment: center ? Alignment.center : Alignment.centerLeft, widthFactor: expand ? null : 1, heightFactor: 1, child: text)))));
  }
}

enum GlamButtonKind { primary, glass }

/// `.btn`: 54px pill action (radius 27), 15px bold.
class GlamButton extends StatelessWidget {
  const GlamButton(this.label, {super.key, required this.onTap, this.kind = GlamButtonKind.primary, this.id});
  final String label;
  final VoidCallback? onTap;
  final GlamButtonKind kind;
  final String? id;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final glass = kind == GlamButtonKind.glass;
    final child = ConstrainedBox(constraints: const BoxConstraints(minHeight: 54),
      child: Padding(padding: const EdgeInsets.symmetric(horizontal: 20), child: Center(
        child: Text(label, textAlign: TextAlign.center, style: body(15, glass ? p.onGlass : p.onBtn, w: FontWeight.w700)))));
    return Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Tappable(onTap: onTap, label: label, id: id,
      child: glass ? GlassSurface(radius: 27, child: child)
        : DecoratedBox(decoration: BoxDecoration(color: p.btn, borderRadius: BorderRadius.circular(27)), child: child)));
  }
}

/// `.chip` / `.chip.gl`.
class GlamChip extends StatelessWidget {
  const GlamChip(this.label, {super.key, required this.selected, required this.onTap, this.glass = false});
  final String label;
  final bool selected, glass;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final r = BorderRadius.circular(context.isAndroidStyle ? 10 : 20);
    final fg = selected ? p.onAc : (glass ? p.onGlass : p.tx);
    final content = ConstrainedBox(constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
      child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Center(widthFactor: 1,
        child: Text(label, softWrap: false, style: body(14, fg)))));
    Widget chip;
    if (glass && !selected) {
      chip = GlassSurface(radius: r.topLeft.x, child: content);
    } else {
      chip = DecoratedBox(decoration: BoxDecoration(color: selected ? p.ac : null, borderRadius: r,
        border: Border.all(color: selected ? p.ac : (glass ? Colors.transparent : p.ln))), child: content);
    }
    return Semantics(selected: selected, button: true, label: label, container: true,
      child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: () { HapticFeedback.selectionClick(); onTap(); }, child: chip));
  }
}

class GlamCard extends StatelessWidget {
  const GlamCard({super.key, required this.child, this.padding = const EdgeInsets.all(18), this.color, this.border = true, this.onTap, this.label});
  final Widget child;
  final EdgeInsets padding;
  final Color? color;
  final bool border;
  final VoidCallback? onTap;
  final String? label;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final box = DecoratedBox(decoration: BoxDecoration(color: color ?? p.sf, borderRadius: BorderRadius.circular(22),
      border: border ? Border.all(color: p.ln) : null), child: Padding(padding: padding, child: child));
    // CSS `.card{margin:10px 0}` collapses between siblings, so only the top margin is modelled.
    return Padding(padding: const EdgeInsets.only(top: 10), child: onTap == null ? box : Tappable(onTap: onTap, label: label, child: box));
  }
}

class Kicker extends StatelessWidget {
  const Kicker(this.text, {super.key, this.color, this.bottom = 10});
  final String text;
  final Color? color;
  final double bottom;
  @override
  Widget build(BuildContext context) => Padding(padding: EdgeInsets.only(bottom: bottom),
    child: Text(text.toUpperCase(), style: body(11, color ?? context.glam.ac2, w: FontWeight.w700, ls: 2)));
}

/// `.row` (profile/list rows). Set [last] to drop the divider.
class GlamRow extends StatelessWidget {
  const GlamRow({super.key, required this.glyph, required this.title, this.subtitle, required this.onTap, this.last = false});
  final String glyph, title;
  final String? subtitle;
  final VoidCallback onTap;
  final bool last;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return Tappable(onTap: onTap, label: subtitle == null ? title : '$title, $subtitle', child: Container(
      constraints: const BoxConstraints(minHeight: 56), padding: const EdgeInsets.symmetric(vertical: 13),
      decoration: BoxDecoration(border: last ? null : Border(bottom: BorderSide(color: p.ln))),
      child: Row(children: [
        Container(width: 40, height: 40, alignment: Alignment.center, decoration: BoxDecoration(color: p.sf2, shape: BoxShape.circle),
          child: Text(glyph, style: body(17, p.ac2))),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(title, style: body(15, p.tx, w: FontWeight.w700)),
          if (subtitle != null) Text(subtitle!, style: body(12, p.tx2)),
        ])),
        const SizedBox(width: 14),
        Text('›', style: body(20, p.tx2)),
      ])));
  }
}

class GlamBar extends StatelessWidget {
  const GlamBar(this.value, {super.key});
  final double value;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return ClipRRect(borderRadius: BorderRadius.circular(3), child: SizedBox(height: 6, child: Stack(children: [
      Positioned.fill(child: ColoredBox(color: p.sf2)),
      FractionallySizedBox(widthFactor: value, heightFactor: 1, alignment: Alignment.centerLeft, child: ColoredBox(color: p.ac2)),
    ])));
  }
}

/// Sponsored disclosure pill (`Spon` in p14.jsx).
class SponsoredTag extends StatelessWidget {
  const SponsoredTag({super.key, this.onPhoto = false});
  final bool onPhoto;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(10),
        color: onPhoto ? const Color(0xC70A080A) : p.sf2,
        border: Border.all(color: onPhoto ? const Color(0x66FFF4F0) : p.ln)),
      child: Text('Sponsored', maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis, style: body(11, onPhoto ? GlamPalette.onPhoto : p.tx, w: FontWeight.w700, ls: .4)));
  }
}
