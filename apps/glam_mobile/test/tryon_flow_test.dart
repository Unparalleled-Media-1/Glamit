import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/design/tokens.dart';
import 'package:glam_mobile/events/event_controller.dart';
import 'package:glam_mobile/screens/event_dress.dart';
import 'package:glam_mobile/tryon/tryon_controller.dart';
import 'support/fake_tryon_service.dart';
import 'support/fonts.dart';

TryOnController make(FakeTryOnService s, {Uint8List? photo}) =>
  TryOnController(s, pickPhoto: () async => photo ?? Uint8List.fromList(List.filled(32, 7)), pollInterval: Duration.zero);
const garments = [{'label': 'Linen shirt', 'category': 'other'}];
Future<void> go(TryOnController c, {bool storage = true, bool tryOn = true}) async {
  await c.check(); await c.begin(); await c.choosePhoto();
  await c.submit(storageChecked: storage, tryOnChecked: tryOn, occasion: 'Garden party', garments: garments);
}

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });

  test('an unconfigured service stays "unavailable" and never offers a journey', () async {
    final s = FakeTryOnService()..available = false; final c = make(s);
    await c.check();
    expect(c.phase, 'unavailable'); await c.begin();
    expect(c.phase, 'unavailable', reason: 'begin() must not run before the service is available');
  });

  test('complete journey: explicit consent, one upload, polling, private result, photo wiped', () async {
    final s = FakeTryOnService(); final photo = Uint8List.fromList(List.filled(32, 9)); final c = make(s, photo: photo);
    await go(c);
    expect(c.phase, 'done'); expect(c.result, isNotNull); expect(c.syntheticTest, isTrue);
    expect(s.calls.where((x) => x.startsWith('grant')).length, 2, reason: 'storage and generation permissions are separate');
    expect(s.uploads, 1); expect(c.photo, isNull); expect(photo.every((b) => b == 0), isTrue);
    expect(s.garments.single, garments);
  });

  test('nothing is granted, uploaded or submitted without both ticked permissions', () async {
    final s = FakeTryOnService(); final c = make(s);
    await go(c, tryOn: false);
    expect(c.error, 'explicit_consent_required'); expect(s.calls.any((x) => x == 'upload' || x == 'submit' || x.startsWith('grant')), isFalse);
    await c.submit(storageChecked: false, tryOnChecked: true, occasion: 'x', garments: garments);
    expect(c.error, 'explicit_consent_required'); expect(s.uploads, 0);
  });

  test('a stored-photo permission already granted is not asked for again', () async {
    final s = FakeTryOnService()..storageGranted = true; final c = make(s);
    await go(c, storage: false);
    expect(c.phase, 'done'); expect(s.calls.where((x) => x.startsWith('grant')).length, 1);
  });

  test('an ineligible account is stopped before any photo is chosen', () async {
    final s = FakeTryOnService()..eligible = false; final c = make(s);
    await c.check(); await c.begin();
    expect(c.error, 'eligibility_required'); expect(c.phase, 'ready');
  });

  test('a failed generation shows no image and keeps the server error', () async {
    final s = FakeTryOnService()..failWith = 'tryon_provider_failed'; final c = make(s);
    await go(c);
    expect(c.phase, 'failed'); expect(c.error, 'tryon_provider_failed'); expect(c.result, isNull);
    expect(s.calls.contains('result'), isFalse);
  });

  test('a retry after a failed submit reuses the same idempotency key and does not upload twice', () async {
    final s = FakeTryOnService()..submitError = 'connection_unavailable'; final c = make(s);
    await go(c);
    expect(c.phase, 'consent'); expect(c.error, 'connection_unavailable');
    await c.submit(storageChecked: true, tryOnChecked: true, occasion: 'Garden party', garments: garments);
    expect(c.phase, 'done'); expect(s.keys.toSet().length, 1, reason: 'same Idempotency-Key'); expect(s.uploads, 1);
  });

  test('cancelling a pending job calls the server and returns to ready', () async {
    final s = FakeTryOnService()..script = ['queued', 'queued', 'queued', 'queued'];
    final c = TryOnController(s, pickPhoto: () async => Uint8List.fromList(List.filled(32, 7)), pollInterval: Duration.zero, maxPolls: 2);
    await go(c);
    expect(c.error, 'still_processing'); expect(c.phase, 'processing');
    await c.remove();
    expect(s.calls.last, 'remove'); expect(c.phase, 'ready'); expect(c.job, isNull);
  });

  test('deleting a finished preview wipes the bytes and calls the server', () async {
    final s = FakeTryOnService(); final c = make(s); await go(c);
    final bytes = c.result!; await c.remove();
    expect(bytes.every((b) => b == 0), isTrue); expect(c.result, isNull); expect(s.calls.last, 'remove');
  });

  test('release sources contain no simulated try-on path', () {
    for (final f in [...Directory('lib/tryon').listSync(), File('lib/screens/event_dress.dart')]) {
      if (f is! File) continue;
      expect(RegExp(r'Fake|Simulat|Mock|avatar\(|Avatar\(', caseSensitive: true).hasMatch(f.readAsStringSync()), isFalse, reason: f.path);
    }
  });

  group('panel', () {
    Future<EventDressController> mount(WidgetTester tester, FakeTryOnService s) async {
      tester.view.physicalSize = const Size(390, 1600); tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final c = EventDressController(tryOn: make(s));
      await tester.pumpWidget(MaterialApp(theme: glamTheme(Brightness.light), home: Scaffold(body: ListView(children: [
        TryOnSection(controller: c, garments: garments, occasion: 'Garden party')]))));
      await tester.pumpAndSettle(); return c;
    }
    Finder id(String s) => find.bySemanticsIdentifier(s);

    testWidgets('when unavailable the honest card is shown and nothing can be started', (tester) async {
      await mount(tester, FakeTryOnService()..available = false);
      expect(find.text('Not available yet'), findsOneWidget); expect(id('tryon-begin'), findsNothing);
    });

    testWidgets('available: consent, photo, submit, labelled result, delete', (tester) async {
      final c = await mount(tester, FakeTryOnService());
      expect(find.text('Not available yet'), findsNothing);
      await tester.tap(id('tryon-begin')); await tester.pumpAndSettle();
      expect(find.text('Create my preview'), findsOneWidget);
      await tester.tap(id('tryon-submit'), warnIfMissed: false); await tester.pumpAndSettle();
      expect(c.tryOn!.phase, 'consent', reason: 'disabled until a photo and both permissions');
      await tester.tap(id('tryon-photo')); await tester.pumpAndSettle();
      await tester.tap(id('tryon-consent-storage')); await tester.tap(id('tryon-consent-generate')); await tester.pumpAndSettle();
      await tester.tap(id('tryon-submit')); await tester.pumpAndSettle();
      expect(id('tryon-result'), findsOneWidget);
      expect(find.text('TEST OUTPUT — not a real try-on'), findsOneWidget);
      expect(find.textContaining('Not a guarantee of fit'), findsOneWidget);
      await tester.tap(id('tryon-delete')); await tester.pumpAndSettle();
      expect(id('tryon-result'), findsNothing); expect(id('tryon-begin'), findsOneWidget);
    });
  });
}
