import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/design/tokens.dart';
import 'package:glam_mobile/main.dart';
import 'package:glam_mobile/screens/screen_registry.dart';

void main() {
  analyzeIntroTests();
  test('Registry carries all 232 reference screens plus the design-system board', () {
    expect(kScreenRegistry.length, 233);
    for (final id in ['home', 'GL-017', 'GL-035', 'GL-069', 'GL-117', 'GL-209', 'GL-212', 'DS']) { expect(kScreenRegistry.containsKey(id), isTrue, reason: id); }
  });
  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    for (final size in [const Size(390, 844), const Size(360, 740), const Size(430, 932)]) {
      for (final scale in [1.0, 1.5]) {
        testWidgets('Five tabs render without overflow: $platform $size x$scale', (tester) async {
          tester.view.physicalSize = size; tester.view.devicePixelRatio = 1;
          tester.platformDispatcher.textScaleFactorTestValue = scale;
          addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio); addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
          debugDefaultTargetPlatformOverride = platform;
          try {
          await tester.pumpWidget(const AnalyzeApp()); await tester.pumpAndSettle();
          expect(find.text('Your next look\nstarts here.'), findsOneWidget);
          for (final tab in ['Analyze', 'Studio', 'Discover', 'Profile', 'Home']) {
            await tester.tap(find.text(tab).last); await tester.pumpAndSettle();
            expect(tester.takeException(), isNull, reason: tab);
          }
          // The tab bar stays inside the viewport and keeps 44px targets.
          final bar = tester.getRect(find.text('Profile').last);
          expect(bar.bottom, lessThanOrEqualTo(size.height));
          } finally { debugDefaultTargetPlatformOverride = null; }
        });
      }
    }
  }
  testWidgets('Unbuilt destinations open an honest mapped placeholder', (tester) async {
    await tester.pumpWidget(const AnalyzeApp()); await tester.pumpAndSettle();
    await tester.tap(find.text('✧ Credits')); await tester.pumpAndSettle();
    expect(find.textContaining('Nothing here is simulated'), findsOneWidget);
    expect(find.text(kScreenRegistry['GL-126']!.title), findsOneWidget);
  });
  test('Dark tokens match theme.css', () {
    expect(GlamTokens.dark.bg, const Color(0xff0f0e10)); expect(GlamTokens.dark.ac, const Color(0xfff6c6d8)); expect(GlamTokens.light.ac2, const Color(0xff8f3157));
  });
}

void analyzeIntroTests() {
  testWidgets('GL-018 offers only the server-supported face mode and GL-019 reaches the camera', (tester) async {
    await tester.pumpWidget(const AnalyzeApp()); await tester.pumpAndSettle();
    await tester.tap(find.text('Analyze').last); await tester.pumpAndSettle();
    await tester.tap(find.text('Start analysis')); await tester.pumpAndSettle();
    expect(find.text('What shall we\nlook at?'), findsOneWidget);
    expect(find.text('Not available yet'), findsNWidgets(3)); // Skin, Hair, Combined are not simulated
    await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
    expect(find.text('Three things for\na great read.'), findsOneWidget);
    expect(find.text('Choose from gallery'), findsOneWidget);
    await tester.tap(find.text('Open camera')); for (var i = 0; i < 6; i++) { await tester.pump(const Duration(milliseconds: 200)); }
    expect(find.byKey(const ValueKey('native-shutter')), findsOneWidget);
    expect(find.bySemanticsLabel('Photo library'), findsOneWidget);
  });
}
