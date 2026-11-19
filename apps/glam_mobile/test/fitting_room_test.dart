import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/design/tokens.dart';
import 'package:glam_mobile/events/event_controller.dart';
import 'package:glam_mobile/screens/fitting_room.dart';
import 'package:glam_mobile/tryon/tryon_controller.dart';
import 'support/fake_tryon_service.dart';
import 'support/fonts.dart';

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  Finder id(String s) => find.bySemanticsIdentifier(s);
  Future<(EventDressController, FakeTryOnService)> mount(WidgetTester tester, {bool available = true}) async {
    tester.view.physicalSize = const Size(390, 2400); tester.view.devicePixelRatio = 1; addTearDown(tester.view.reset);
    final s = FakeTryOnService()..available = available;
    final c = EventDressController(tryOn: TryOnController(s, pickPhoto: () async => Uint8List.fromList(List.filled(32, 5)), pollInterval: Duration.zero));
    await tester.pumpWidget(MaterialApp(theme: glamTheme(Brightness.light), home: FittingRoomScreen(controller: c))); await tester.pumpAndSettle();
    return (c, s);
  }

  testWidgets('without a connected service the honest card shows and nothing can be started', (tester) async {
    await mount(tester, available: false);
    expect(find.text('Not available yet'), findsOneWidget); expect(id('tryon-begin'), findsNothing);
    expect(find.textContaining('never an avatar'), findsOneWidget);
  });

  testWidgets('describe a garment, consent, and get a labelled AI preview through the real flow', (tester) async {
    final (c, s) = await mount(tester);
    await tester.enterText(id('fitting-garment'), 'Emerald satin evening gown'); await tester.pump();
    await tester.tap(find.text('Suit')); await tester.pump();
    await tester.tap(id('tryon-begin')); await tester.pumpAndSettle();
    await tester.tap(id('tryon-photo')); await tester.pumpAndSettle();
    await tester.tap(id('tryon-consent-storage')); await tester.tap(id('tryon-consent-generate')); await tester.pumpAndSettle();
    await tester.tap(id('tryon-submit')); await tester.pumpAndSettle();
    expect(c.tryOn!.phase, 'done'); expect(id('tryon-result'), findsOneWidget);
    expect(s.garments.single, [{'label': 'Emerald satin evening gown', 'category': 'suit'}]);
    expect(find.text('TEST OUTPUT — not a real try-on'), findsOneWidget);
  });

  testWidgets('submitting with no garment described is refused before anything is uploaded', (tester) async {
    final (c, s) = await mount(tester);
    await tester.tap(id('tryon-begin')); await tester.pumpAndSettle();
    await tester.tap(id('tryon-photo')); await tester.pumpAndSettle();
    await tester.tap(id('tryon-consent-storage')); await tester.tap(id('tryon-consent-generate')); await tester.pumpAndSettle();
    await tester.tap(id('tryon-submit')); await tester.pumpAndSettle();
    expect(c.tryOn!.error, 'outfit_required'); expect(s.uploads, 0); expect(find.text('Say what you want to try on first.'), findsOneWidget);
  });
}
