// Visual regression baseline for the five owner-approved consumer screens.
// The goldens are Dart-engine renders (390x844, fixtures on, iOS styling); they detect UNINTENDED
// changes to the approved design. They are not native-device evidence and not a parity score.
// Update intentionally with:  flutter test --update-goldens test/visual_regression_test.dart
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/main.dart';
import 'support/fonts.dart';

class _TolerantComparator extends LocalFileComparator {
  _TolerantComparator(super.testFile, this.tolerance);
  final double tolerance; // allowed fraction of differing pixels (0.01 = 1%)
  @override
  Future<bool> compare(Uint8List imageBytes, Uri golden) async {
    final result = await GoldenFileComparator.compareLists(imageBytes, await getGoldenBytes(golden));
    if (result.passed || result.diffPercent <= tolerance) return true;
    throw FlutterError(await generateFailureOutput(result, golden, basedir));
  }
}

const _screens = {'home': 'Home', 'GL-017': 'Analyze', 'GL-035': 'Studio', 'GL-069': 'Discover', 'GL-117': 'Profile'};

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await loadGlamFonts();
    goldenFileComparator = _TolerantComparator(Uri.parse('test/visual_regression_test.dart'), 0.01);
  });

  for (final dark in [true, false]) {
    testWidgets('approved five-screen baseline (${dark ? 'dark' : 'light'}, iOS styling)', (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      tester.view.padding = const FakeViewPadding(top: 44, bottom: 24);
      tester.view.viewPadding = const FakeViewPadding(top: 44, bottom: 24);
      tester.platformDispatcher.platformBrightnessTestValue = dark ? Brightness.dark : Brightness.light;
      addTearDown(tester.view.reset);
      addTearDown(tester.platformDispatcher.clearAllTestValues);
      try {
        await tester.pumpWidget(const AnalyzeApp(fixtures: true));
        for (final e in _screens.entries) {
          if (e.key != 'home') await tester.tap(find.bySemanticsIdentifier('tab-${e.value.toLowerCase()}'));
          await tester.pump(const Duration(milliseconds: 600));
          await tester.runAsync(() async {
            await Future<void>.delayed(const Duration(milliseconds: 900)); // decode the editorial WebP
            await tester.pump(const Duration(milliseconds: 100));
            await Future<void>.delayed(const Duration(milliseconds: 200));
          });
          await tester.pump();
          await expectLater(find.byType(AnalyzeApp), matchesGoldenFile('goldens/${e.key}_${dark ? 'dark' : 'light'}_ios.png'));
        }
      } finally {
        debugDefaultTargetPlatformOverride = null;
        await tester.pumpWidget(const SizedBox());
      }
    });
  }
}
