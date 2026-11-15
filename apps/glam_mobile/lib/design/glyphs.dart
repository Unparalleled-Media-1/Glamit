import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Symbols used as icons by the design (README: unicode glyphs, no icon set). DejaVu Sans (bundled as `GlamSymbols`)
/// covers all but these five, which no redistributable font carries, so they are drawn as vectors at text size.
const kDrawnGlyphs = '⌖⌕⎘ⓘ＋';
const kSymbolFallback = ['GlamSymbols'];

class _GlyphPainter extends CustomPainter {
  _GlyphPainter(this.ch, this.color);
  final String ch; final Color color;
  @override void paint(Canvas canvas, Size s) {
    final u = s.width, w = u * .1;
    final p = Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = w..strokeCap = StrokeCap.round;
    final c = Offset(s.width / 2, s.height / 2);
    switch (ch) {
      case '⌖':
        canvas.drawCircle(c, u * .26, p);
        for (final a in [0, 1, 2, 3]) {
          final d = Offset(math.cos(a * math.pi / 2), math.sin(a * math.pi / 2));
          canvas.drawLine(c + d * (u * .16), c + d * (u * .44), p);
        }
      case '⌕':
        final ctr = c.translate(-u * .08, -u * .08);
        canvas.drawCircle(ctr, u * .26, p);
        canvas.drawLine(ctr + Offset(u * .19, u * .19), ctr + Offset(u * .44, u * .44), p);
      case '⎘':
        final r = Radius.circular(u * .06);
        canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(u * .32, u * .32, u * .42, u * .42), r), p);
        canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(u * .16, u * .16, u * .42, u * .42), r), p);
      case 'ⓘ':
        canvas.drawCircle(c, u * .38, p);
        canvas.drawLine(c.translate(0, -u * .01), c.translate(0, u * .16), p);
        canvas.drawCircle(c.translate(0, -u * .15), w * .55, Paint()..color = color);
      case '＋':
        canvas.drawLine(c.translate(-u * .3, 0), c.translate(u * .3, 0), p);
        canvas.drawLine(c.translate(0, -u * .3), c.translate(0, u * .3), p);
    }
  }
  @override bool shouldRepaint(_GlyphPainter o) => o.ch != ch || o.color != color;
}

/// A glyph-aware replacement for `Text`: the five drawn symbols become inline vectors, everything else is ordinary text.
bool _needsSymbols(String t) => t.runes.any((r) => r >= 0x2190);
InlineSpan glyphSpan(String text, TextStyle style) {
  // The bundled symbol font is a fallback only for strings that contain symbol glyphs, so ordinary text keeps its own metrics.
  if (_needsSymbols(text)) style = style.copyWith(fontFamilyFallback: [...?style.fontFamilyFallback, ...kSymbolFallback]);
  if (!text.runes.any((r) => kDrawnGlyphs.contains(String.fromCharCode(r)))) return TextSpan(text: text, style: style);
  final fs = style.fontSize ?? 14, color = style.color ?? Colors.white;
  final out = <InlineSpan>[]; final buf = StringBuffer();
  for (final r in text.runes) {
    final ch = String.fromCharCode(r);
    if (kDrawnGlyphs.contains(ch)) {
      if (buf.isNotEmpty) { out.add(TextSpan(text: buf.toString())); buf.clear(); }
      out.add(WidgetSpan(alignment: PlaceholderAlignment.middle, child: SizedBox(width: fs * .78, height: fs * .78, child: CustomPaint(painter: _GlyphPainter(ch, color)))));
    } else { buf.write(ch); }
  }
  if (buf.isNotEmpty) out.add(TextSpan(text: buf.toString()));
  return TextSpan(style: style, children: out);
}
class GText extends StatelessWidget {
  const GText(this.text, {super.key, this.scaled = true, required this.style, this.maxLines, this.overflow, this.textAlign, this.softWrap, this.strutStyle});
  final bool scaled; final String text; final TextStyle style; final int? maxLines; final TextOverflow? overflow; final TextAlign? textAlign; final bool? softWrap; final StrutStyle? strutStyle;
  @override Widget build(BuildContext context) => Text.rich(glyphSpan(text, style), maxLines: maxLines, overflow: overflow, textAlign: textAlign, softWrap: softWrap, strutStyle: strutStyle, textScaler: scaled ? MediaQuery.textScalerOf(context) : TextScaler.noScaling);
}
