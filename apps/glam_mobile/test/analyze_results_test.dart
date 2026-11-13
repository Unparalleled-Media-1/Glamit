import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/design/tokens.dart';
import 'package:glam_mobile/presentation/design.dart';
import 'package:glam_mobile/screens/analyze_results.dart';

void main() {
  for (final entry in {'skin': skinScreen, 'hair': hairScreen, 'routine': routineScreen}.entries) {
    testWidgets('${entry.key} screen states plainly that the service does not provide it', (tester) async {
      tester.view.physicalSize = const Size(360, 740); tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(MaterialApp(theme: MobileDesign.theme(), home: entry.value()));
      await tester.pumpAndSettle();
      expect(find.text('NOT AVAILABLE YET'), findsOneWidget);
      expect(find.textContaining('Nothing is estimated'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
  test('Finding titles cover every server key', () {
    for (final k in ['face-shape', 'eyes', 'brows', 'lips', 'undertone']) { expect(findingTitle(k).contains('-'), isFalse); expect(findingGlyph(k), isNotEmpty); }
    expect(GlamTokens.dark.bg, const Color(0xff0f0e10));
  });
}
