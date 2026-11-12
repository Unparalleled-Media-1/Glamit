import 'package:flutter/material.dart';

/// Colour roles extracted from the supplied design (ui_kits/mobile-v3/theme.css,
/// the `.g` dark and `.g[data-theme=light]` blocks). Values are authoritative;
/// see docs/mobile-parity/DESIGN_TOKENS.json.
@immutable
class GlamPalette {
  const GlamPalette({
    required this.bg, required this.sf, required this.sf2, required this.tx,
    required this.tx2, required this.ln, required this.ac, required this.onAc,
    required this.ac2, required this.glass, required this.onGlass,
    required this.err, required this.btn, required this.onBtn,
    required this.tabsFill,
  });
  final Color bg, sf, sf2, tx, tx2, ln, ac, onAc, ac2, glass, onGlass, err, btn, onBtn, tabsFill;

  static const dark = GlamPalette(
    bg: Color(0xFF0F0E10), sf: Color(0xFF1A171B), sf2: Color(0xFF262027),
    tx: Color(0xFFF8F1EC), tx2: Color(0xFFB9AEB5), ln: Color(0xFF352D36),
    ac: Color(0xFFF6C6D8), onAc: Color(0xFF1C1115), ac2: Color(0xFFE2A6C1),
    glass: Color(0x8C141014), onGlass: Color(0xFFFFF4F0), err: Color(0xFFE07080),
    // Design override: `.g[data-theme=dark] .btn` is #b04a6b on white.
    btn: Color(0xFFB04A6B), onBtn: Color(0xFFFFFFFF), tabsFill: Color(0xFF1A171B),
  );
  static const light = GlamPalette(
    bg: Color(0xFFF8F4F0), sf: Color(0xFFFFFFFF), sf2: Color(0xFFEFE8E3),
    tx: Color(0xFF17151A), tx2: Color(0xFF5F5963), ln: Color(0xFFE3DAD7),
    ac: Color(0xFF17151A), onAc: Color(0xFFFFFFFF), ac2: Color(0xFF8F3157),
    glass: Color(0xB3F8F4F0), onGlass: Color(0xFF17151A), err: Color(0xFFB3261E),
    btn: Color(0xFF17151A), onBtn: Color(0xFFFFFFFF), tabsFill: Color(0xFFFFFFFF),
  );

  /// Fixed colours used on photographs in both themes (`#fff4f0` etc.).
  static const onPhoto = Color(0xFFFFF4F0);
  static const onPhotoMuted = Color(0xFFD9C9D2);
  static const onPhotoBody = Color(0xFFE8D9E0);
  static const blush = Color(0xFFF6C6D8);
}

abstract final class GlamFonts {
  /// Georgia substitute (SIL OFL, metric compatible). Reference: Georgia.
  static const display = 'Gelasio';
  /// Arial substitute (SIL OFL, metric compatible). Reference: Arial.
  static const body = 'Arimo';
}

extension GlamContext on BuildContext {
  GlamPalette get glam => Theme.of(this).brightness == Brightness.dark ? GlamPalette.dark : GlamPalette.light;
  bool get isAndroidStyle => Theme.of(this).platform != TargetPlatform.iOS;
}

ThemeData glamTheme(Brightness brightness, {TargetPlatform? platform}) {
  final p = brightness == Brightness.dark ? GlamPalette.dark : GlamPalette.light;
  return ThemeData(
    useMaterial3: true, brightness: brightness, platform: platform,
    scaffoldBackgroundColor: p.bg, fontFamily: GlamFonts.body,
    colorScheme: ColorScheme.fromSeed(seedColor: p.ac2, brightness: brightness).copyWith(
      primary: p.btn, onPrimary: p.onBtn, surface: p.bg, onSurface: p.tx),
    splashFactory: NoSplash.splashFactory, highlightColor: Colors.transparent,
    textTheme: ThemeData(brightness: brightness).textTheme.apply(fontFamily: GlamFonts.body, bodyColor: p.tx, displayColor: p.tx),
  );
}
