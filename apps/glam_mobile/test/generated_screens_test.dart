import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/design/tokens.dart';
import 'package:glam_mobile/screens/design_render.dart';
import 'package:glam_mobile/screens/generated_ids.dart';
import 'package:glam_mobile/shell/route_table.dart';

/// Ids that are NOT rendered by the generator: the five consumer tabs (hand-built shell screens) and the Analyze path
/// (hand-built over the real private-analysis logic, or still the interim flow until its batch lands).
const handBuilt = {'home', 'GL-017', 'GL-035', 'GL-069', 'GL-117', 'GL-018', 'GL-019', 'GL-020', 'GL-023', 'GL-024', 'GL-025', 'GL-026', 'GL-027', 'GL-028', 'GL-029', 'GL-030', 'GL-031', 'GL-032', 'GL-033', 'GL-034'};
const variants = [(Brightness.dark, TargetPlatform.iOS), (Brightness.dark, TargetPlatform.android), (Brightness.light, TargetPlatform.iOS), (Brightness.light, TargetPlatform.android)];

void main() {
  test('Generated ids plus the hand-built set cover the whole registry exactly', () {
    final all = designScreens.map((s) => s.id).toSet();
    expect(all.length, 232); // the design-system board ('DS') is a specimen, not a route
    expect(kGeneratedScreenIds.intersection(handBuilt), isEmpty);
    expect(all.difference(kGeneratedScreenIds).difference(handBuilt), isEmpty, reason: 'every route must be generated or hand-built');
    expect(kGeneratedScreenIds.difference(all), isEmpty);
  });
  testWidgets('Every generated id is present in the data of all four variants', (tester) async {
    for (final (b, p) in variants) {
      final v = DesignStore.variant(b, p);
      final data = await tester.runAsync(() => DesignStore.load(v)) as Map<String, dynamic>;
      expect(kGeneratedScreenIds.difference(data.keys.toSet()), isEmpty, reason: '$v lacks screens');
    }
  });
  for (final (brightness, platform) in variants) {
    for (final size in [const Size(360, 740), const Size(390, 844), const Size(430, 932)]) {
      testWidgets('All generated screens render without exceptions: $brightness $platform $size', (tester) async {
        tester.view.physicalSize = size; tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
        debugDefaultTargetPlatformOverride = platform;
        try {
          final v = DesignStore.variant(brightness, platform);
          final data = await tester.runAsync(() => DesignStore.load(v)) as Map<String, dynamic>;
          final bad = <String>[];
          for (final id in data.keys) {
            await tester.pumpWidget(MaterialApp(theme: glamTheme(brightness, platform: platform), home: Scaffold(body: GeneratedScreen(id: id, go: (_) {}))));
            await tester.pump(const Duration(milliseconds: 50));
            final e = tester.takeException();
            if (e != null) bad.add('$id: ${e.toString().split('\n').first}');
          }
          expect(bad, isEmpty);
        } finally { debugDefaultTargetPlatformOverride = null; }
      });
    }
  }
  testWidgets('Navigation data follows the design and chips/switches exist', (tester) async {
    final data = await tester.runAsync(DesignStore.load) as Map<String, dynamic>;
    final acts = ((data['GL-209'] as Map)['acts'] as Map).values.whereType<String>().toSet();
    expect(acts.contains('GL-210'), isTrue);
    expect(acts.contains('GL-069'), isTrue);
    bool has(Map n, bool Function(Map) t) => t(n) || ((n['k'] as List?) ?? const []).any((c) => c is Map && has(c, t));
    expect(data.values.where((e) => has((e as Map)['a'] as Map, (n) => n['pressed'] != null)).length, greaterThan(10));
    expect(data.values.where((e) => has((e as Map)['a'] as Map, (n) => n['sw'] != null)).length, greaterThan(3));
  });
}
