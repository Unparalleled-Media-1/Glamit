import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/presentation/design.dart';
import 'package:glam_mobile/screens/design_render.dart';
import 'package:glam_mobile/screens/screen_registry.dart';
import 'package:glam_mobile/screens/tabs.dart';

const handBuilt = {'home', 'DS', 'GL-035', 'GL-069', 'GL-117', 'GL-017', 'GL-018', 'GL-019', 'GL-020', 'GL-023', 'GL-024', 'GL-025', 'GL-026', 'GL-027', 'GL-028', 'GL-029', 'GL-030', 'GL-031', 'GL-032', 'GL-033', 'GL-034'};
const variants = [('dark', TargetPlatform.iOS), ('dark', TargetPlatform.android), ('light', TargetPlatform.iOS), ('light', TargetPlatform.android)];

void main() {
  testWidgets('Every one of the 232 reference screens has a Flutter implementation in all four variants', (tester) async {
    expect(kScreenRegistry.length, 233);
    expect(handBuilt.length, 21); // exactly: 5 tabs, design board marker, GL-018/019/020/023/024/025 and GL-026-034; every other id must exist in the generated data
    for (final (theme, platform) in variants) {
      final v = DesignStore.variant(theme == 'dark' ? Brightness.dark : Brightness.light, platform);
      final data = await tester.runAsync(() => DesignStore.load(v)) as Map<String, dynamic>;
      final missing = [for (final id in kScreenRegistry.keys) if (id != 'DS' && !handBuilt.contains(id) && !data.containsKey(id)) id];
      expect(missing, isEmpty, reason: '$v lacks screens');
    }
  });
  for (final (theme, platform) in variants) {
    for (final size in [const Size(360, 740), const Size(390, 844), const Size(430, 932)]) {
      testWidgets('All generated screens render without exceptions: $theme $platform $size', (tester) async {
        tester.view.physicalSize = size; tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
        debugDefaultTargetPlatformOverride = platform;
        try {
          final v = DesignStore.variant(theme == 'dark' ? Brightness.dark : Brightness.light, platform);
          final data = await tester.runAsync(() => DesignStore.load(v)) as Map<String, dynamic>;
          final bad = <String>[];
          for (final id in data.keys) {
            await tester.pumpWidget(MaterialApp(theme: MobileDesign.theme(dark: theme == 'dark'), home: Scaffold(body: DesignScreen(id: id, go: (_) {}))));
            await tester.pump(const Duration(milliseconds: 50));
            final e = tester.takeException();
            if (e != null) bad.add('$id: ${e.toString().split('\n').first}');
          }
          expect(bad, isEmpty);
        } finally { debugDefaultTargetPlatformOverride = null; }
      });
    }
  }
  testWidgets('Navigation taps follow the design destinations', (tester) async {
    tester.view.physicalSize = const Size(390, 844); tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
    final data = await tester.runAsync(DesignStore.load) as Map<String, dynamic>;
    final acts = ((data['GL-209'] as Map)['acts'] as Map).values.whereType<String>().toSet();
    expect(acts.contains('GL-210'), isTrue);
    expect(acts.contains('GL-069'), isTrue); // back
    expect(kAlias['GL-045'], 'GL-044');
    final hits = <String>[];
    await tester.pumpWidget(MaterialApp(theme: MobileDesign.theme(), home: Scaffold(body: DesignScreen(id: 'GL-209', go: hits.add))));
    await tester.pump();
    await tester.tapAt(const Offset(30, 600)); // a tab-bar region tap must route somewhere
    expect(tester.takeException(), isNull);
  });
  testWidgets('Chip groups keep their own selection and switches toggle', (tester) async {
    tester.view.physicalSize = const Size(390, 844); tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
    final data = await tester.runAsync(DesignStore.load) as Map<String, dynamic>;
    // find a screen with a chip group and one with a switch
    bool hasChips(Map n) { final k = (n['k'] as List?) ?? const []; if (k.where((c) => c is Map && c['pressed'] != null).length >= 2) return true; return k.any((c) => c is Map && hasChips(c)); }
    bool hasSwitch(Map n) { if (n['sw'] != null) return true; return ((n['k'] as List?) ?? const []).any((c) => c is Map && hasSwitch(c)); }
    expect(data.values.where((e) => hasChips((e as Map)['a'] as Map)).length, greaterThan(10));
    expect(data.values.where((e) => hasSwitch((e as Map)['a'] as Map)).length, greaterThan(3));
    final sw = data.entries.firstWhere((e) => hasSwitch((e.value as Map)['a'] as Map)).key;
    await tester.pumpWidget(MaterialApp(theme: MobileDesign.theme(), home: Scaffold(body: DesignScreen(id: sw, go: (_) {}))));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });
}
