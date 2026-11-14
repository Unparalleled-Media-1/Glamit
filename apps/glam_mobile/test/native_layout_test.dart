import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:glam_mobile/shell/nav.dart';
import 'package:glam_mobile/main.dart';
import 'package:glam_mobile/presentation/design.dart';
import 'support/fonts.dart';
void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  for(final size in [const Size(360,740),const Size(430,932)]) {
    for(final scale in [1.0,2.0]) {
      testWidgets('Camera-first analysis is reachable from the tab shell at $size and text scale $scale',(tester)async {
        tester.view.physicalSize=size;tester.view.devicePixelRatio=1;
        tester.platformDispatcher.textScaleFactorTestValue=scale;
        addTearDown(tester.view.resetPhysicalSize);addTearDown(tester.view.resetDevicePixelRatio);addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        await tester.pumpWidget(const AnalyzeApp());await tester.pumpAndSettle();
        // The design's GL-033 (analysis history) opens the real journey on its camera surface; the GL-018 -> GL-019 path is covered in analyze_intro_test.
        GoRouter.of(tester.element(find.byType(Scaffold).first)).push(GlamNav.location('GL-033'));
        for(var i=0;i<8;i++){await tester.pump(const Duration(milliseconds:200));}
        expect(find.byKey(const ValueKey('native-shutter')),findsOneWidget);
        expect(tester.getRect(find.byKey(const ValueKey('native-shutter'))).bottom,lessThan(size.height));
        expect(find.byType(NavigationBar),findsNothing);
        await tester.tap(find.bySemanticsLabel('Account'));await tester.pumpAndSettle();
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
  testWidgets('Private decoded photo is evicted after the review surface is removed',(tester)async {
    final bytes=File('test/fixtures/picker-fixture.png').readAsBytesSync();
    final provider=MemoryImage(bytes);
    await tester.pumpWidget(MaterialApp(home:PrivatePhoto(bytes:bytes)));
    await tester.runAsync(() => precacheImage(provider,tester.element(find.byType(PrivatePhoto))));
    await tester.pumpAndSettle();
    expect(PaintingBinding.instance.imageCache.containsKey(provider),isTrue);
    await tester.pumpWidget(const SizedBox());await tester.pumpAndSettle();
    expect(PaintingBinding.instance.imageCache.containsKey(provider),isFalse);
  });

}
