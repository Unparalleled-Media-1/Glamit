import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/screens/design_render.dart';
import 'package:glam_mobile/screens/screen_registry.dart';
import 'package:glam_mobile/screens/tabs.dart';

const handBuilt = {'home', 'DS', 'GL-035', 'GL-069', 'GL-117', 'GL-017', 'GL-018', 'GL-019', 'GL-020', 'GL-021', 'GL-022', 'GL-023', 'GL-024', 'GL-025', 'GL-026', 'GL-027', 'GL-028', 'GL-029', 'GL-030', 'GL-031', 'GL-032', 'GL-033', 'GL-034'};

void main() {
  testWidgets('Every one of the 232 reference screens has a Flutter implementation', (tester) async {
    final data = await tester.runAsync(DesignStore.load) as Map<String, dynamic>;
    final missing = [for (final id in kScreenRegistry.keys) if (id != 'DS' && !handBuilt.contains(id) && !data.containsKey(id)) id];
    expect(missing, isEmpty, reason: 'registry ids with no hand-built or generated screen');
    expect(kScreenRegistry.length, 233);
  });
  for (final size in [const Size(360, 740), const Size(390, 844), const Size(430, 932)]) {
    testWidgets('All generated screens render without exceptions at $size', (tester) async {
      tester.view.physicalSize = size; tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
      final data = await tester.runAsync(DesignStore.load) as Map<String, dynamic>;
      final bad = <String>[];
      for (final id in data.keys) {
        await tester.pumpWidget(MaterialApp(home: Scaffold(body: DesignScreen(id: id, go: (_) {}))));
        await tester.pump(const Duration(milliseconds: 50));
        final e = tester.takeException();
        if (e != null) bad.add('$id: ${e.toString().split('\n').first}');
      }
      expect(bad, isEmpty);
    });
  }
  testWidgets('Navigation taps follow the design destinations', (tester) async {
    tester.view.physicalSize = const Size(390, 844); tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
    final data = await tester.runAsync(DesignStore.load) as Map<String, dynamic>;
    final hits = <String>[];
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: DesignScreen(id: 'GL-209', go: hits.add))));
    await tester.pump();
    final acts = ((data['GL-209'] as Map)['acts'] as Map).values.whereType<String>().toSet();
    expect(acts.contains('GL-210'), isTrue);
    expect(kAlias['GL-045'], 'GL-044');
  });
}
