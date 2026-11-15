import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/main.dart';
import 'support/fonts.dart';

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  testWidgets('GL-018 offers only the server-supported face mode; GL-019 offers camera and gallery', (tester) async {
    tester.view.physicalSize = const Size(390, 844); tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    try {
      await tester.pumpWidget(const AnalyzeApp()); await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsIdentifier('home-analyze')); await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsIdentifier('analyze-start')); await tester.pumpAndSettle();
      expect(find.text('What shall we\nlook at?'), findsOneWidget);
      expect(find.text('Not available yet'), findsNWidgets(3)); // Skin, Hair, Combined are not simulated
      await tester.tap(find.text('Continue')); await tester.pumpAndSettle();
      expect(find.text('Three things for\na great read.'), findsOneWidget);
      expect(find.text('Choose from gallery'), findsOneWidget);
      expect(find.text('Open camera'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally { await tester.pumpWidget(const SizedBox()); await tester.pumpAndSettle(); }
  });
}
