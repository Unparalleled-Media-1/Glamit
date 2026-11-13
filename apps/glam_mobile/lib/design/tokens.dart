import 'package:flutter/material.dart';

/// Design tokens transcribed from ui_kits/mobile-v3/theme.css (`.g` dark, `.g[data-theme=light]`).
@immutable
class GlamTokens extends ThemeExtension<GlamTokens> {
  const GlamTokens({required this.bg, required this.sf, required this.sf2, required this.tx, required this.tx2, required this.ln,
    required this.ac, required this.onAc, required this.ac2, required this.glass, required this.onGlass, required this.primaryBtn,
    required this.onPrimaryBtn, required this.isDark});
  final Color bg, sf, sf2, tx, tx2, ln, ac, onAc, ac2, glass, onGlass, primaryBtn, onPrimaryBtn;
  final bool isDark;

  static const dark = GlamTokens(bg: Color(0xff0f0e10), sf: Color(0xff1a171b), sf2: Color(0xff262027), tx: Color(0xfff8f1ec),
    tx2: Color(0xffb9aeb5), ln: Color(0xff352d36), ac: Color(0xfff6c6d8), onAc: Color(0xff1c1115), ac2: Color(0xffe2a6c1),
    glass: Color(0x8c141014), onGlass: Color(0xfffff4f0),
    // theme.css last rule: dark-theme primary buttons are #b04a6b / white.
    primaryBtn: Color(0xffb04a6b), onPrimaryBtn: Color(0xffffffff), isDark: true);
  static const light = GlamTokens(bg: Color(0xfff8f4f0), sf: Color(0xffffffff), sf2: Color(0xffefe8e3), tx: Color(0xff17151a),
    tx2: Color(0xff5f5963), ln: Color(0xffe3dad7), ac: Color(0xff17151a), onAc: Color(0xffffffff), ac2: Color(0xff8f3157),
    glass: Color(0xb3f8f4f0), onGlass: Color(0xff17151a), primaryBtn: Color(0xff17151a), onPrimaryBtn: Color(0xffffffff), isDark: false);

  static GlamTokens of(BuildContext c) => Theme.of(c).extension<GlamTokens>() ?? dark;
  @override GlamTokens copyWith() => this;
  @override GlamTokens lerp(ThemeExtension<GlamTokens>? other, double t) => t < .5 ? this : (other as GlamTokens? ?? this);
}

/// Georgia display over Arial body, per the design system. Both are system fonts; the fallbacks keep Android on a serif/sans face.
abstract final class GlamType {
  static const _serif = ['Georgia', 'serif'], _sans = ['Arial', 'sans-serif'];
  static TextStyle display(double size, {double? height, double spacing = 0, Color? color}) => TextStyle(fontFamily: 'Georgia',
    fontFamilyFallback: _serif, fontSize: size, height: height == null ? null : height / size, letterSpacing: spacing, color: color, fontWeight: FontWeight.w400);
  static TextStyle body(double size, {FontWeight w = FontWeight.w400, double? height, double spacing = 0, Color? color}) => TextStyle(
    fontFamily: 'Arial', fontFamilyFallback: _sans, fontSize: size, fontWeight: w, height: height == null ? null : height / size, letterSpacing: spacing, color: color);
}
