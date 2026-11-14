import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'photo.dart';
import 'tokens.dart';
import 'widgets.dart';

/// Pieces the Analyze path needs on top of the shared design widgets (design `.tray`, `.sw`, `.oval`, `.scan`, back bar).

/// `.tray`: bottom sheet surface (30px top radius, grab handle). Place inside a Stack.
class GlamTray extends StatelessWidget {
  const GlamTray({super.key, required this.child, this.top});
  final Widget child; final double? top;
  @override Widget build(BuildContext context) {
    final p = context.glam, inset = MediaQuery.paddingOf(context).bottom;
    final body = Container(width: double.infinity, padding: EdgeInsets.fromLTRB(22, 10, 22, inset > 34 ? inset : 34),
      decoration: BoxDecoration(color: p.sf, borderRadius: BorderRadius.vertical(top: Radius.circular(context.isAndroidStyle ? 28 : 30)),
        boxShadow: const [BoxShadow(color: Color(0x59000000), blurRadius: 40, offset: Offset(0, -10))]),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 14), decoration: BoxDecoration(color: p.ln, borderRadius: BorderRadius.circular(2)))),
        if (top != null) Flexible(child: child) else child]));
    return top != null ? Positioned(left: 0, right: 0, top: top, bottom: 0, child: body) : Positioned(left: 0, right: 0, bottom: 0, child: body);
  }
}

/// `.sw`: 51x31 toggle.
class GlamSwitch extends StatelessWidget {
  const GlamSwitch({super.key, required this.on, required this.onChanged, required this.label});
  final bool on; final ValueChanged<bool>? onChanged; final String label;
  @override Widget build(BuildContext context) {
    final p = context.glam;
    return Semantics(toggled: on, label: label, enabled: onChanged != null, child: GestureDetector(behavior: HitTestBehavior.opaque,
      onTap: onChanged == null ? null : () { HapticFeedback.selectionClick(); onChanged!(!on); },
      child: SizedBox(width: 51, height: 44, child: Center(child: AnimatedContainer(duration: const Duration(milliseconds: 160), width: 51, height: 31,
        decoration: BoxDecoration(color: on ? p.ac2 : p.ln, borderRadius: BorderRadius.circular(16)),
        child: AnimatedAlign(duration: const Duration(milliseconds: 160), alignment: on ? Alignment.centerRight : Alignment.centerLeft,
          child: Padding(padding: const EdgeInsets.all(2), child: Container(width: 27, height: 27, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)))))))));
  }
}

/// `.oval`: 250x340 face guide centred 40px above the viewport centre.
class OvalGuide extends StatelessWidget {
  const OvalGuide({super.key, this.opacity = 1, this.dy = -40});
  final double opacity, dy;
  @override Widget build(BuildContext context) => IgnorePointer(child: Align(alignment: Alignment.center, child: Transform.translate(offset: Offset(0, dy), child: Opacity(opacity: opacity,
    child: Container(width: 250, height: 340, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xE6FFF4F0), width: 2)))))));
}

/// `.scan`: sweeping line while analysis runs.
class ScanLine extends StatefulWidget { const ScanLine({super.key}); @override State<ScanLine> createState() => _ScanLineState(); }
class _ScanLineState extends State<ScanLine> with SingleTickerProviderStateMixin {
  late final AnimationController c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2200))..repeat(reverse: true);
  @override void dispose() { c.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    final p = context.glam;
    return IgnorePointer(child: LayoutBuilder(builder: (context, box) => AnimatedBuilder(animation: c, builder: (_, _) => Stack(children: [
      Positioned(left: 0, right: 0, top: box.maxHeight * (.18 + .54 * Curves.easeInOut.transform(c.value)), child: Container(height: 3,
        decoration: BoxDecoration(color: p.ac, boxShadow: [BoxShadow(color: p.ac, blurRadius: 24, spreadRadius: 6)])))]))));
  }
}

/// Back bar for the Analyze screens: glass back button + centred 18px display title. Place inside a Stack.
class GlamTopBar extends StatelessWidget {
  const GlamTopBar({super.key, required this.title, this.onBack, this.onPhoto = false});
  final String title; final VoidCallback? onBack; final bool onPhoto;
  @override Widget build(BuildContext context) {
    final p = context.glam;
    return Positioned(top: MediaQuery.paddingOf(context).top + 6, left: 14, right: 14, child: Row(children: [
      onBack == null ? const SizedBox(width: 44) : GlassIconButton(glyph: context.isAndroidStyle ? '←' : '‹', label: 'Back', onTap: onBack),
      Expanded(child: Text(title, textAlign: TextAlign.center, style: display(18, 22, onPhoto ? GlamPalette.onPhoto : p.tx))), const SizedBox(width: 44)]));
  }
}

/// Photo-led screen background: private photo (or the neutral gradient) with a scrim. [photo] is built by the caller.
Widget photoBackdrop(Widget? photo, {double scrim = .45, double dim = 0}) => Stack(fit: StackFit.expand, children: [
  photo ?? const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(colors: [Color(0xFF45333E), Color(0xFF0F0E10)], radius: .9))),
  if (dim > 0) ColoredBox(color: Color.fromRGBO(0, 0, 0, dim)),
  Scrim(fraction: scrim)]);
