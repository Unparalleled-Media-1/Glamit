import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
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
    final failures = <String>[];
    for (final name in ['home', 'analyze', 'studio', 'discover', 'profile']) {
      await tester.tap(find.byKey(ValueKey('tab-$name')));
      await tester.pumpAndSettle();
      final error = tester.takeException();
      if (error != null) failures.add('$name: $error');
    }
    expect(failures, isEmpty, reason: 'Every primary screen must support large system text');
  });

  testWidgets('A creative brief and saved edit survive native stack round trips', (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const ProviderScope(child: GlamBeautyApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('tab-studio')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('studio-brief')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('studio-brief')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('brief-input')), 'Soft rose, an effortless evening');
    await tester.tap(find.text('What are you imagining?'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('brief-save')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('brief-save')));
    await tester.pumpAndSettle();
    expect(find.text('Brief kept for this preview. No AI image generated.'), findsOneWidget);
    expect(find.byWidgetPredicate((widget) => widget is Semantics && widget.properties.identifier == 'brief-status-saved'), findsOneWidget);
    expect(find.text('Refine my brief'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('tab-discover')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('save-look-0')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-look-0')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('screen-look')), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('tab-profile')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Saved inspiration'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Saved inspiration'));
    await tester.pumpAndSettle();
    expect(find.text('The soft-focus edit'), findsOneWidget);
    expect(tester.takeException(), isNull);
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
  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    testWidgets('Camera and Studio controls stay on the first viewport on $platform', (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(const ProviderScope(child: GlamBeautyApp()));
      await tester.pumpAndSettle();
      expect(find.byType(platform == TargetPlatform.iOS ? CupertinoTabBar : NavigationBar), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('tab-analyze')));
      await tester.pumpAndSettle();
      final camera = tester.getRect(find.byKey(const ValueKey('analyze-camera')));
      expect(camera.bottom, lessThan(tester.getRect(find.byType(platform == TargetPlatform.iOS ? CupertinoTabBar : NavigationBar)).top));
      expect(camera.height, greaterThanOrEqualTo(48));
      await tester.tap(find.byKey(const ValueKey('tab-studio')));
      await tester.pumpAndSettle();
      final canvas = tester.getRect(find.byKey(const ValueKey('studio-canvas')));
      expect(canvas.height, greaterThan(160));
      await tester.tap(find.byKey(const ValueKey('studio-brief')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('brief-input')), findsOneWidget);
      expect(tester.takeException(), isNull);
    }, variant: TargetPlatformVariant({platform}));
  }

}
