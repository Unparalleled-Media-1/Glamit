import 'package:flutter/widgets.dart';

/// Reproduces the design's `Photo`/`Img` helpers (ui.jsx): one 4-portrait
/// sprite sheet (aspect 0.75 per portrait), cover-scaled and offset per index.
class GlamPhoto extends StatelessWidget {
  const GlamPhoto({super.key, this.n = 0, this.width, this.height, this.asset = 'assets/imagery/beauty-editorial.webp', this.radius = 0});
  final int n;
  final double? width, height;
  final String asset;
  final double radius;
  static const _ew = 0.75;
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
    final w = width ?? c.maxWidth, h = height ?? c.maxHeight;
    final sh = h > w / _ew ? h : w / _ew;
    final pw = _ew * sh;
    final x = -(n * pw + (pw - w) / 2), y = -0.15 * (sh - h);
    final img = Image.asset(asset, fit: BoxFit.fill, filterQuality: FilterQuality.medium, excludeFromSemantics: true);
    final stack = SizedBox(width: w, height: h, child: ClipRect(child: Stack(children: [
      Positioned(left: x, top: y, width: 4 * pw, height: sh, child: img),
    ])));
    return radius == 0 ? stack : ClipRRect(borderRadius: BorderRadius.circular(radius), child: stack);
  });
}

class Scrim extends StatelessWidget {
  const Scrim({super.key, this.fraction = .45});
  final double fraction;
  @override
  Widget build(BuildContext context) => Positioned.fill(child: IgnorePointer(child: Align(
    alignment: Alignment.bottomCenter,
    child: FractionallySizedBox(heightFactor: fraction, widthFactor: 1, child: const DecoratedBox(decoration: BoxDecoration(
      gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
        colors: [Color(0x000A080A), Color(0xE00A080A)])))))));
}
