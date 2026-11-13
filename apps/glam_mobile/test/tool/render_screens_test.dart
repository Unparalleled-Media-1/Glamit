// Developer render harness: draws the five Batch 1 screens with the Flutter
// engine at the design's 390x844 viewport and writes PNGs to $GLAM_RENDER_DIR.
// These are Dart-engine renders for fast iteration ONLY. They are not native
// iOS/Android evidence and never mark a screen visually verified.
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/main.dart';

Future<void> _font(String family, String asset) async {
  final loader = FontLoader(family)..addFont(rootBundle.load(asset));
  await loader.load();
}

void main() {
  final dir = Platform.environment['GLAM_RENDER_DIR'];
  if (dir == null) return;
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await _font('Gelasio', 'assets/fonts/Gelasio.ttf');
    await _font('Arimo', 'assets/fonts/Arimo.ttf');
  });
  final tabs = {'home': 'Home', 'GL-017': 'Analyze', 'GL-035': 'Studio', 'GL-069': 'Discover', 'GL-117': 'Profile'};
  for (final dark in [true, false]) {
    for (final android in [false, true]) {
      testWidgets('render ${dark ? 'dark' : 'light'} ${android ? 'android' : 'ios'}', (tester) async {
        debugDefaultTargetPlatformOverride = android ? TargetPlatform.android : TargetPlatform.iOS;
        tester.view.physicalSize = const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        tester.view.padding = const FakeViewPadding(top: 44, bottom: 24);
        tester.view.viewPadding = const FakeViewPadding(top: 44, bottom: 24);
        tester.platformDispatcher.platformBrightnessTestValue = dark ? Brightness.dark : Brightness.light;
        addTearDown(tester.view.reset);
        addTearDown(tester.platformDispatcher.clearAllTestValues);
        final key = GlobalKey();
        await tester.pumpWidget(RepaintBoundary(key: key, child: AnalyzeApp(controller: null)));
        try {
        for (final e in tabs.entries) {
          if (e.key != 'home') {
            await tester.tap(find.bySemanticsIdentifier('tab-${e.value.toLowerCase()}'));
          }
          await tester.pump(const Duration(milliseconds: 600));
          await tester.runAsync(() async {
            await Future<void>.delayed(const Duration(milliseconds: 800));
            await tester.pump(const Duration(milliseconds: 100));
            await Future<void>.delayed(const Duration(milliseconds: 200));
            final boundary = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
            final image = await boundary.toImage(pixelRatio: 1);
            final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
            File('$dir/${e.key}_${dark ? 'dark' : 'light'}_${android ? 'android' : 'ios'}.png').writeAsBytesSync(bytes!.buffer.asUint8List());
          });
        }
        } finally { debugDefaultTargetPlatformOverride = null; }
      });
    }
  }
}
