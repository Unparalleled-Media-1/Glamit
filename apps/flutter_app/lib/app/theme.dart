import 'package:flutter/material.dart';

/// Brand colours copied from the canonical consumer-design.json, not old layouts.
abstract final class GlamColors {
  static const ivory = Color(0xfff8f3ef);
  static const blush = Color(0xfff6c6d8);
  static const rose = Color(0xffb76d8c);
  static const mauve = Color(0xff78546c);
  static const charcoal = Color(0xff181719);
  static const champagne = Color(0xffdcc7a8);
  static const ink = Color(0xff30252d);
  static const muted = Color(0xff786772);
  static const line = Color(0xffdfd1d5);
}

ThemeData glamTheme() => ThemeData(
  useMaterial3: true,
  fontFamily: 'Manrope',
  scaffoldBackgroundColor: GlamColors.ivory,
  colorScheme: ColorScheme.fromSeed(
    seedColor: GlamColors.mauve,
    primary: GlamColors.mauve,
    surface: GlamColors.ivory,
    onSurface: GlamColors.ink,
  ),
  splashFactory: InkSparkle.splashFactory,
  textTheme: const TextTheme(
    displayLarge: TextStyle(fontFamily: 'Cormorant', fontSize: 58, height: .94),
    displayMedium: TextStyle(fontFamily: 'Cormorant', fontSize: 44, height: 1),
    headlineLarge: TextStyle(fontFamily: 'Cormorant', fontSize: 36, height: 1.05),
    headlineMedium: TextStyle(fontFamily: 'Cormorant', fontSize: 28, height: 1.1),
    bodyLarge: TextStyle(fontSize: 15, height: 1.6),
    bodyMedium: TextStyle(fontSize: 13, height: 1.5),
    labelLarge: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
    labelSmall: TextStyle(fontSize: 10, letterSpacing: 1.4),
  ),
  filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(
    minimumSize: const Size(48, 54),
    shape: const StadiumBorder(),
    backgroundColor: GlamColors.blush,
    foregroundColor: GlamColors.ink,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
  )),
  iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(
    minimumSize: const Size(48, 48),
  )),
  bottomSheetTheme: const BottomSheetThemeData(
    backgroundColor: GlamColors.ivory,
    showDragHandle: true,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
  ),
);
