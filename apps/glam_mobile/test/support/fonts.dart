import 'package:flutter/services.dart';

/// Widget tests otherwise fall back to the Ahem test font, whose 1em-wide glyphs
/// cause false overflow. Loads the bundled reference-typography substitutes.
Future<void> loadGlamFonts() async {
  for (final (family, asset) in [('Gelasio', 'assets/fonts/Gelasio.ttf'), ('Arimo', 'assets/fonts/Arimo.ttf')]) {
    final loader = FontLoader(family)..addFont(rootBundle.load(asset));
    await loader.load();
  }
}
