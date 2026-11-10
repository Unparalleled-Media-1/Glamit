import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/main.dart';
import 'package:glam_mobile/presentation/design.dart';
void main() {
  for(final size in [const Size(360,740),const Size(430,932)]) {
    for(final scale in [1.0,2.0]) {
      testWidgets('Camera-first entry is reachable at $size and text scale $scale',(tester)async {
        tester.view.physicalSize=size;tester.view.devicePixelRatio=1;
        tester.platformDispatcher.textScaleFactorTestValue=scale;
        addTearDown(tester.view.resetPhysicalSize);addTearDown(tester.view.resetDevicePixelRatio);addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        await tester.pumpWidget(const AnalyzeApp());await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('native-shutter')),findsOneWidget);
        expect(tester.getRect(find.byKey(const ValueKey('native-shutter'))).bottom,lessThan(size.height));
        expect(find.byType(NavigationBar),findsNothing);
        await tester.tap(find.byTooltip('Account'));await tester.pumpAndSettle();
        expect(find.text('Sign-in is unavailable in this build. Your photo has not been uploaded.'),findsOneWidget);
        expect(tester.takeException(),isNull);
        await tester.pumpWidget(const SizedBox());await tester.pumpAndSettle();
      });
    }
  }
  testWidgets('Errors describe unavailable services without fabricated output',(tester)async {
    await tester.pumpWidget(MaterialApp(theme:MobileDesign.theme(),home:Scaffold(body:Text(message('analysis_unavailable')))));
    expect(find.textContaining('not been simulated'),findsOneWidget);
  });
}
