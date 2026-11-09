import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_beauty/app/app.dart';
import 'package:glam_beauty/app/preview_state.dart';

void main() {
  test('Editorial saves and briefs are local, reversible preview state', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(previewProvider.notifier);
    controller.toggleSaved(0);
    controller.brief('  Rose tones  ');
    expect(container.read(previewProvider).saved, {0});
    expect(container.read(previewProvider).brief, 'Rose tones');
    controller.toggleSaved(0);
    expect(container.read(previewProvider).saved, isEmpty);
    controller.clear();
    expect(container.read(previewProvider).brief, isEmpty);
  });

  for (final size in [const Size(360, 740), const Size(430, 932)]) {
    testWidgets('Five independent branches navigate at $size without overflow', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(const ProviderScope(child: GlamBeautyApp()));
      await tester.pumpAndSettle();
      for (final name in ['home', 'analyze', 'studio', 'discover', 'profile']) {
        await tester.tap(find.byKey(ValueKey('tab-$name')));
        await tester.pumpAndSettle();
        expect(find.byKey(ValueKey('screen-$name')), findsOneWidget);
        expect(tester.takeException(), isNull, reason: '$name at $size');
      }
    });
  }

  testWidgets('Primary screens tolerate large system text on a compact phone', (tester) async {
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpWidget(const ProviderScope(child: GlamBeautyApp()));
    await tester.pumpAndSettle();
    for (final name in ['home', 'analyze', 'studio', 'discover', 'profile']) {
      await tester.tap(find.byKey(ValueKey('tab-$name')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: '$name with large system text');
    }
  });

  testWidgets('Camera preview is honest and native sheet dismisses without photo access', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: GlamBeautyApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('tab-analyze')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('analyze-camera')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('analyze-camera')));
    await tester.pumpAndSettle();
    expect(find.textContaining('Camera capture is not connected'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('photo-guide')));
    await tester.pumpAndSettle();
    expect(find.text('Face forward, comfortably'), findsOneWidget);
  });
}
