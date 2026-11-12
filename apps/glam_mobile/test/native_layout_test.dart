import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/main.dart';
import 'package:glam_mobile/presentation/design.dart';
void main() {
  for(final size in [const Size(360,740),const Size(430,932)]) {
    for(final scale in [1.0,2.0]) {
      testWidgets('Analyze tab reaches the real camera and is reachable at $size and text scale $scale',(tester)async {
        tester.view.physicalSize=size;tester.view.devicePixelRatio=1;
        tester.platformDispatcher.textScaleFactorTestValue=scale;
        addTearDown(tester.view.resetPhysicalSize);addTearDown(tester.view.resetDevicePixelRatio);addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        await tester.pumpWidget(const AnalyzeApp());await tester.pumpAndSettle();
        await tester.tap(find.text('Analyze').last);await tester.pumpAndSettle();
        await tester.tap(find.text('History'));for(var i=0;i<6;i++){await tester.pump(const Duration(milliseconds:200));}
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
