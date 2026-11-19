import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/events/event_brief.dart';
import 'package:glam_mobile/events/event_controller.dart';
import 'package:glam_mobile/main.dart';
import 'package:glam_mobile/shell/nav.dart';
import 'package:go_router/go_router.dart';
import 'support/fonts.dart';

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  Future<void> boot(WidgetTester tester, EventDressController c, {double scale = 1}) async {
    tester.view.physicalSize = const Size(390, 844); tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = scale;
    addTearDown(tester.view.reset); addTearDown(tester.platformDispatcher.clearAllTestValues);
    await tester.pumpWidget(AnalyzeApp(eventDress: c)); await tester.pumpAndSettle();
    GoRouter.of(tester.element(find.byType(Scaffold).first)).push(GlamNav.location('GL-057')); await tester.pumpAndSettle();
  }
  Finder id(String s) => find.bySemanticsIdentifier(s);
  Future<void> unmount(WidgetTester tester) async { await tester.pumpWidget(const SizedBox()); await tester.pumpAndSettle(); }

  testWidgets('Dress for an all-white day club three days out: details -> dress code -> directions -> compressed plan', (tester) async {
    final c = EventDressController(now: () => DateTime(2026, 11, 18, 16, 29));
    await boot(tester, c);
    try {
      expect(find.text('Add your event.'), findsOneWidget);
      await tester.tap(id('event-continue-1'), warnIfMissed: false); await tester.pumpAndSettle();
      expect(find.text('Add your event.'), findsOneWidget, reason: 'cannot continue without a name');
      await tester.enterText(find.byType(TextField).first, 'Liv Summer Club — All White Day Club');
      await tester.enterText(find.byType(TextField).at(1), 'Sandown Sports Ground');
      await tester.pump();
      await tester.tap(id('event-continue-1')); await tester.pumpAndSettle();
      expect(find.text('When is it?'), findsOneWidget);
      // the date comes from the real calendar picker
      await tester.tap(id('event-date')); await tester.pumpAndSettle();
      await tester.tap(find.text('21').last); await tester.pumpAndSettle();
      await tester.tap(find.text('OK')); await tester.pumpAndSettle();
      expect(find.text('Sat 21 Nov 2026'), findsOneWidget); expect(find.text('3 days to go'), findsOneWidget);
      expect(find.textContaining('not connected'), findsWidgets);
      await tester.tap(find.text('Evening')); await tester.pumpAndSettle();
      await tester.tap(id('event-continue-2')); await tester.pumpAndSettle();
      expect(find.text('Your dress code.'), findsOneWidget);
      await tester.tap(id('event-create'), warnIfMissed: false); await tester.pumpAndSettle();
      expect(find.text('Your dress code.'), findsOneWidget, reason: 'a dress code is required');
      await tester.tap(find.text('All white')); await tester.pumpAndSettle();
      expect(find.textContaining('never infers culture or faith'), findsOneWidget);
      await tester.tap(id('event-create')); await tester.pumpAndSettle();
      expect(find.text('Three directions.'), findsOneWidget);
      expect(find.textContaining('3 days to go'), findsOneWidget);
      expect(find.text('Linen & ease'), findsOneWidget); expect(find.text('Fluid & flowing'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Sharp white'), 200, scrollable: find.byType(Scrollable).first); expect(find.text('Sharp white'), findsOneWidget);
      await tester.scrollUntilVisible(find.textContaining('Rule-based inspiration'), 200, scrollable: find.byType(Scrollable).first); expect(find.textContaining('Rule-based inspiration'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Linen & ease'), -200, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.text('Fluid & flowing')); await tester.pumpAndSettle();
      expect(find.textContaining('avoid stilettos on grass'), findsOneWidget);
      await tester.ensureVisible(id('event-plan')); await tester.tap(id('event-plan')); await tester.pumpAndSettle();
      expect(find.text('Your plan.'), findsOneWidget);
      expect(find.textContaining('steps are shortened to fit'), findsOneWidget);
      expect(find.textContaining('Buy in store, borrow or rent'), findsOneWidget);
      expect(find.textContaining('may not arrive in time'), findsOneWidget);
      await tester.tap(id('plan-direction')); await tester.pumpAndSettle();
      expect(c.done, {'direction'});
      expect(tester.takeException(), isNull);
    } finally { await unmount(tester); }
  });

  testWidgets('Copy plan puts a plain-text plan on the clipboard', (tester) async {
    String? copied;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') copied = (call.arguments as Map)['text'] as String;
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    final c = EventDressController(now: () => DateTime(2026, 11, 18));
    c.brief = EventBrief(name: 'Liv Summer Club', venue: 'Sandown Sports Ground', date: DateTime(2026, 11, 21), code: DressCode.allWhite);
    await boot(tester, c);
    try {
      GoRouter.of(tester.element(find.byType(Scaffold).first)).push(GlamNav.location('GL-067')); await tester.pumpAndSettle();
      await tester.tap(id('event-copy')); await tester.pumpAndSettle();
      expect(copied, allOf(contains('Liv Summer Club'), contains('Sat 21 Nov 2026'), contains('Dress code: All white'), contains('Buy in store')));
      expect(find.textContaining('Plan copied'), findsOneWidget);
    } finally { await unmount(tester); }
  });

  for (final scale in [1.0, 2.0]) {
    testWidgets('Event screens lay out without overflow at 360x740 and text scale $scale', (tester) async {
      tester.view.physicalSize = const Size(360, 740); tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = scale;
      addTearDown(tester.view.reset); addTearDown(tester.platformDispatcher.clearAllTestValues);
      final c = EventDressController(now: () => DateTime(2026, 11, 18));
      c.brief = EventBrief(name: 'Liv Summer Club — All White Day Club', venue: 'Sandown Sports Ground', city: 'Sandton', date: DateTime(2026, 11, 21), code: DressCode.allWhite, modest: true, traditionalOptions: true);
      await tester.pumpWidget(AnalyzeApp(eventDress: c)); await tester.pumpAndSettle();
      try {
        for (final screen in ['GL-057', 'GL-058', 'GL-059', 'GL-063', 'GL-067']) {
          GoRouter.of(tester.element(find.byType(Scaffold).first)).push(GlamNav.location(screen)); await tester.pumpAndSettle();
          expect(tester.takeException(), isNull, reason: screen);
        }
      } finally { await unmount(tester); }
    });
  }
}
