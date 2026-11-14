import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/main.dart';
import 'support/fonts.dart';

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  testWidgets('On iOS the native edge swipe returns from a pushed design screen', (tester) async {
    tester.view.physicalSize = const Size(390, 844); tester.view.devicePixelRatio = 1; addTearDown(tester.view.reset);
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    try {
      await tester.pumpWidget(const AnalyzeApp()); await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsIdentifier('home-analyze')); await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsIdentifier('analyze-start')); await tester.pumpAndSettle();
      expect(find.text('What shall we\nlook at?'), findsOneWidget);
      await tester.dragFrom(const Offset(4, 400), const Offset(320, 0)); await tester.pumpAndSettle();
      expect(find.text('What shall we\nlook at?'), findsNothing);
      expect(find.bySemanticsIdentifier('analyze-start'), findsOneWidget);
    } finally { debugDefaultTargetPlatformOverride = null; await tester.pumpWidget(const SizedBox()); await tester.pumpAndSettle(); }
  });
}
