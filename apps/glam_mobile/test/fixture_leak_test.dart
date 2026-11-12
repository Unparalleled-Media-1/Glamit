import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/data/fixtures.dart';
import 'package:glam_mobile/main.dart';
import 'support/fonts.dart';

/// Sample advertisements, events, creator content and credit balances come from
/// the design reference, not from any service. They must never reach production.
Future<void> _boot(WidgetTester tester, {required bool fixtures}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(AnalyzeApp(fixtures: fixtures));
  await tester.pumpAndSettle();
}

Iterable<String> _visibleMarkers(WidgetTester tester) => fixtureMarkers.where((m) => find.textContaining(m, skipOffstage: false).evaluate().isNotEmpty);

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });

  test('release builds disable fixtures by default (dart.vm.product) and the override stays explicit', () {
    final src = File('lib/data/fixtures.dart').readAsStringSync();
    expect(src, contains("defaultValue: !bool.fromEnvironment('dart.vm.product')"));
    expect(File('pubspec.yaml').readAsStringSync(), isNot(contains('GLAM_REFERENCE_FIXTURES')));
  });

  test('no CI release/store build passes GLAM_REFERENCE_FIXTURES=true', () {
    for (final f in Directory('../../.github/workflows').listSync().whereType<File>()) {
      for (final line in f.readAsLinesSync().where((l) => l.contains('GLAM_REFERENCE_FIXTURES=true') && l.contains('--release'))) {
        fail('${f.path} builds a release with fixtures enabled: $line');
      }
    }
  });

  testWidgets('with fixtures disabled none of the sample content is visible on any tab', (tester) async {
    await _boot(tester, fixtures: false);
    final seen = <String, List<String>>{};
    for (final t in ['home', 'analyze', 'studio', 'discover', 'profile']) {
      await tester.tap(find.bySemanticsIdentifier('tab-$t'));
      await tester.pumpAndSettle();
      seen[t] = _visibleMarkers(tester).toList();
    }
    await tester.pumpWidget(const SizedBox());
    expect(seen.values.expand((v) => v), isEmpty, reason: 'sample content leaked: $seen');
  });

  testWidgets('with fixtures enabled the markers exist, so the leak test is meaningful', (tester) async {
    await _boot(tester, fixtures: true);
    final found = <String>{..._visibleMarkers(tester)};
    for (final t in ['studio', 'discover', 'profile']) {
      await tester.tap(find.bySemanticsIdentifier('tab-$t'));
      await tester.pumpAndSettle();
      found.addAll(_visibleMarkers(tester));
    }
    await tester.pumpWidget(const SizedBox());
    expect(found, containsAll(['Lumière', '@amarabeauty', 'Rose after hours', 'of 20 this month', '12 credits', 'Sponsored']));
  });

  testWidgets('Discover shows the honest empty state and Profile a neutral credits card without fixtures', (tester) async {
    await _boot(tester, fixtures: false);
    await tester.tap(find.bySemanticsIdentifier('tab-discover')); await tester.pumpAndSettle();
    expect(find.text('Nothing here yet.'), findsOneWidget);
    await tester.tap(find.bySemanticsIdentifier('tab-profile')); await tester.pumpAndSettle();
    expect(find.textContaining('balance appears here'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
