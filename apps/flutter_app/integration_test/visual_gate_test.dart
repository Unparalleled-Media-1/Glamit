import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:glam_beauty/main.dart' as app;

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('F1 actual installed Flutter five-screen visual and interaction evidence', (tester) async {
    app.main();
    await tester.pumpAndSettle();
    if (Platform.isAndroid) {
      await binding.convertFlutterSurfaceToImage();
      await tester.pumpAndSettle();
    }
    Future<void> screen(String tab, String file) async {
      await tester.tap(find.byKey(ValueKey('tab-$tab')));
      await tester.pumpAndSettle();
      expect(find.byKey(ValueKey('screen-$tab')), findsOneWidget);
      await binding.takeScreenshot(file);
    }

    await screen('home', '01-home');
    await screen('analyze', '02-analyze');
    await tester.ensureVisible(find.byKey(const ValueKey('analyze-camera')));
    await tester.tap(find.byKey(const ValueKey('analyze-camera')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Camera capture is not connected'), findsOneWidget);
    await binding.takeScreenshot('06-native-photo-sheet');
    await tester.tap(find.byKey(const ValueKey('photo-guide')));
    await tester.pumpAndSettle();
    expect(find.text('Face forward, comfortably'), findsOneWidget);

    await screen('studio', '03-studio');
    await tester.drag(find.byKey(const ValueKey('studio-comparison')), const Offset(60, 0));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('studio-brief')));
    await tester.tap(find.byKey(const ValueKey('studio-brief')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('brief-input')), 'Soft rose, an effortless evening');
    await tester.testTextInput.hide();
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('brief-save')));
    await tester.pumpAndSettle();
    expect(find.text('Brief kept for this preview. No AI image generated.'), findsOneWidget);

    await screen('discover', '04-discover');
    await tester.tap(find.byKey(const ValueKey('save-look-0')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-look-0')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('screen-look')), findsOneWidget);
    await binding.takeScreenshot('07-native-look-stack');
    await tester.pageBack();
    await tester.pumpAndSettle();
    await screen('profile', '05-profile');
    await tester.ensureVisible(find.text('Saved inspiration'));
    await tester.tap(find.text('Saved inspiration'));
    await tester.pumpAndSettle();
    expect(find.text('The soft-focus edit'), findsOneWidget);
    await binding.takeScreenshot('08-local-saved-inspiration');
    expect(tester.takeException(), isNull);
  });
}
