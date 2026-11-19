import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/events/event_brief.dart';
import 'package:glam_mobile/events/event_controller.dart';
import 'package:glam_mobile/design/widgets.dart';
import 'package:glam_mobile/events/themed_events.dart';
import 'package:glam_mobile/main.dart';
import 'package:glam_mobile/shell/nav.dart';
import 'package:go_router/go_router.dart';
import 'support/fonts.dart';

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  Finder id(String s) => find.bySemanticsIdentifier(s);
  Future<void> boot(WidgetTester tester, EventDressController c, {Size size = const Size(390, 844), double scale = 1}) async {
    tester.view.physicalSize = size; tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = scale;
    addTearDown(tester.view.reset); addTearDown(tester.platformDispatcher.clearAllTestValues);
    await tester.pumpWidget(AnalyzeApp(eventDress: c)); await tester.pumpAndSettle();
  }
  void go(WidgetTester tester, String screen) => GoRouter.of(tester.element(find.byType(Scaffold).first)).push(GlamNav.location(screen));
  Future<void> unmount(WidgetTester tester) async { await tester.pumpWidget(const SizedBox()); await tester.pumpAndSettle(); }
  /// Scrolls the screen's list until [f] is built, then lifts it clear of the bottom action tray.
  Future<void> reveal(WidgetTester tester, Finder f) async {
    final list = find.byType(Scrollable).first;
    await tester.scrollUntilVisible(f, 250, scrollable: list);
    final h = tester.view.physicalSize.height;
    for (var i = 0; i < 30; i++) { // nudge until the element sits between the top bar and the bottom action tray
      final r = tester.getRect(f);
      if (r.bottom > h - 250) { await tester.drag(list, const Offset(0, -80)); } else if (r.top < 90) { await tester.drag(list, const Offset(0, 40)); } else { break; }
      await tester.pumpAndSettle();
    }
  }

  testWidgets('Directory lists all six themed events, filters by category, and opens a detail', (tester) async {
    final c = EventDressController(now: () => DateTime(2026, 11, 18));
    await boot(tester, c);
    try {
      go(tester, 'GL-209'); await tester.pumpAndSettle();
      expect(find.text('Themed events.'), findsOneWidget); expect(find.textContaining('Sample events for design only'), findsOneWidget);
      expect(find.text('Cape Town Bridal Showcase'), findsOneWidget);
      await tester.ensureVisible(find.widgetWithText(GlamChip, 'Black tie')); await tester.tap(find.widgetWithText(GlamChip, 'Black tie')); await tester.pumpAndSettle();
      expect(find.text('Gold & Midnight NYE Gala'), findsOneWidget); expect(find.text('Cape Town Bridal Showcase'), findsNothing);
      await tester.ensureVisible(find.widgetWithText(GlamChip, 'Race day')); await tester.tap(find.widgetWithText(GlamChip, 'Race day')); await tester.pumpAndSettle();
      expect(find.text('Durban July Race Day'), findsOneWidget);
      await tester.ensureVisible(find.widgetWithText(GlamChip, 'All')); await tester.tap(find.widgetWithText(GlamChip, 'All')); await tester.pumpAndSettle();
      for (final n in ['Cape Town Bridal Showcase', 'Lumière Beauty Open Day', 'Summer Glow Garden Party']) { expect(find.text(n), findsOneWidget, reason: n); }
      await tester.tap(find.text('Cape Town Bridal Showcase')); await tester.pumpAndSettle();
      expect(c.selectedEvent.id, 'bridal');
      expect(find.text('Sat 12 Dec 2026 · 24 days to go'), findsOneWidget);
      expect(find.textContaining('Confirm the date, venue and dress code with the organiser'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally { await unmount(tester); }
  });

  testWidgets('Every themed event opens its detail and "Dress for this event" pre-fills the journey', (tester) async {
    for (final e in kThemedEvents) {
      final c = EventDressController(now: () => DateTime(2026, 11, 18)); c.select(e);
      await boot(tester, c);
      try {
        go(tester, 'GL-210'); await tester.pumpAndSettle();
        expect(find.text(e.name), findsWidgets, reason: e.id);
        await tester.tap(id('event-dress')); await tester.pumpAndSettle();
        expect(c.brief.name, e.name, reason: e.id); expect(c.brief.code, e.code);
        expect(find.textContaining(' directions.'), findsOneWidget, reason: e.id);
        expect(find.textContaining(e.hostDressCode), findsWidgets, reason: 'host dress code is shown with the directions: ${e.id}');
        expect(tester.takeException(), isNull, reason: e.id);
      } finally { await unmount(tester); }
    }
  });

  testWidgets('Bridal guidance warns against white; sourcing and makeup sections are present; try-on says it is not available', (tester) async {
    final c = EventDressController(now: () => DateTime(2026, 11, 18)); c.applyThemed(themedEventById('bridal')!);
    await boot(tester, c);
    try {
      go(tester, 'GL-063'); await tester.pumpAndSettle();
      expect(find.textContaining('avoid white'), findsOneWidget);
      await reveal(tester, find.text('WHERE TO FIND YOUR OUTFIT')); expect(find.text('WHERE TO FIND YOUR OUTFIT'), findsOneWidget);
      await reveal(tester, find.text('MAKEUP & HAIR')); expect(find.text('MAKEUP & HAIR'), findsOneWidget);
      await reveal(tester, find.text('Book a makeup artist')); expect(find.text('Book a makeup artist'), findsOneWidget);
      await reveal(tester, find.text('SEE IT ON YOU')); await reveal(tester, id('tryon-status'));
      expect(find.textContaining('will not show an avatar or a stand-in picture'), findsOneWidget);
      expect(find.textContaining('label the result as AI-generated'), findsOneWidget);
      expect(find.text('See it on me — not available yet'), findsOneWidget);
      await tester.tap(find.text('See it on me — not available yet'), warnIfMissed: false); await tester.pump();
      expect(find.byType(Image).evaluate().where((e) => (e.widget as Image).image is MemoryImage).isEmpty, isTrue, reason: 'no generated or user image is ever fabricated');
    } finally { await unmount(tester); }
  });

  testWidgets('Search opens the maps app with the visible text; if nothing can open it, the text is copied', (tester) async {
    final opened = <Uri>[]; var succeed = true; String? copied;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') copied = (call.arguments as Map)['text'] as String;
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    final c = EventDressController(now: () => DateTime(2026, 11, 18), openUrl: (u) async { opened.add(u); return succeed; });
    c.applyThemed(themedEventById('garden')!);
    await boot(tester, c);
    try {
      go(tester, 'GL-063'); await tester.pumpAndSettle();
      await reveal(tester, id('search-outfit-1')); await tester.tap(id('search-outfit-1')); await tester.pumpAndSettle();
      expect(opened.single.host, 'www.google.com'); expect(opened.single.queryParameters['query'], contains('near Cape Town')); expect(copied, isNull);
      succeed = false;
      await tester.tap(id('search-outfit-1')); await tester.pumpAndSettle();
      expect(copied, contains('near Cape Town')); expect(find.textContaining('search text was copied'), findsOneWidget);
    } finally { await unmount(tester); }
  });

  testWidgets('Themed event screens lay out without overflow at 360x740 and text scale 2', (tester) async {
    final c = EventDressController(now: () => DateTime(2026, 11, 18)); c.applyThemed(themedEventById('nye')!);
    await boot(tester, c, size: const Size(360, 740), scale: 2);
    try {
      for (final s in ['GL-209', 'GL-210', 'GL-063', 'GL-057']) { go(tester, s); await tester.pumpAndSettle(); expect(tester.takeException(), isNull, reason: s); }
    } finally { await unmount(tester); }
  });

  testWidgets('From the add-event screen, the themed events entry opens the directory', (tester) async {
    final c = EventDressController(now: () => DateTime(2026, 11, 18));
    await boot(tester, c);
    try {
      go(tester, 'GL-057'); await tester.pumpAndSettle();
      await tester.tap(find.text('Start from a themed event')); await tester.pumpAndSettle();
      expect(find.text('Themed events.'), findsOneWidget);
    } finally { await unmount(tester); }
  });

  test('applyThemed keeps every field editable and clears earlier checklist ticks', () {
    final c = EventDressController(now: () => DateTime(2026, 11, 18)); c.toggle('direction'); c.applyThemed(themedEventById('nye')!);
    expect(c.done, isEmpty); c.update((b) => b.city = 'Pretoria'); expect(c.brief.city, 'Pretoria'); expect(c.brief.code, DressCode.blackTie);
  });
}
