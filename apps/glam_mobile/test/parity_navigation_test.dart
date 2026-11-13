import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/design/tokens.dart';
import 'package:glam_mobile/main.dart';
import 'package:glam_mobile/screens/generated_page.dart';
import 'package:glam_mobile/screens/state_overlay.dart';
import 'package:go_router/go_router.dart';
import 'package:glam_mobile/shell/nav.dart';
import 'package:glam_mobile/shell/route_table.dart';
import 'support/fonts.dart';

Future<void> _boot(WidgetTester tester, {double scale = 1}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearAllTestValues);
  await tester.pumpWidget(const AnalyzeApp());
  await tester.pumpAndSettle();
}

Finder _id(String id) => find.bySemanticsIdentifier(id);

/// Arrival at a design destination: the pending placeholder shows the id, a generated screen is identified by its page.
Finder _at(String id) => find.byWidgetPredicate((w) => (w is GeneratedPage && w.screen.id == id) || (w is Text && (w.data ?? '').contains(id) && w.data!.length < 40));
Future<void> _back(WidgetTester tester) async {
  final pending = _id('pending-back');
  if (pending.evaluate().isNotEmpty) { await tester.tap(pending); } else { GoRouter.of(tester.element(find.byType(GeneratedPage))).pop(); }
  await tester.pumpAndSettle();
}

/// The app holds a SemanticsHandle for its lifetime, so each widget test unmounts it.
void testApp(String name, Future<void> Function(WidgetTester) body) => testWidgets(name, (tester) async {
  try { await body(tester); } finally { await tester.pumpWidget(const SizedBox()); await tester.pumpAndSettle(); }
});

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  test('route table covers all 232 design screens with unique IDs', () {
    expect(designScreens.length, 232);
    expect({for (final s in designScreens) s.id}.length, 232);
    expect(designScreens.where((s) => s.id.startsWith('GL-')).length, 212);
    expect(designScreens.where((s) => s.id.startsWith('TP-')).length, 14);
    expect(designScreens.where((s) => s.id.startsWith('FB-')).length, 5);
    expect(GlamNav.tabRoots.keys.toSet(), {'home', 'GL-017', 'GL-035', 'GL-069', 'GL-117'});
  });

  test('every design-screen target referenced by Batch 1 screens exists in the registry', () {
    final src = ['home_screen', 'photo_landing', 'discover_screen', 'profile_screen', 'ad_widgets']
        .map((f) => File('lib/screens/$f.dart').readAsStringSync()).join('\n') + File('lib/data/fixtures.dart').readAsStringSync() + File('lib/shell/chrome.dart').readAsStringSync();
    final ids = RegExp(r"'((?:GL|TP|FB)-\d+)'").allMatches(src).map((m) => m.group(1)!).toSet();
    expect(ids, isNotEmpty);
    for (final id in ids) {
      expect(GlamNav.screen(id), isNotNull, reason: '$id is referenced by a control but missing from the registry');
    }
  });

  testApp('five tabs switch branches and keep the design IDs', (tester) async {
    await _boot(tester);
    expect(find.text('Your next look\nstarts here.'), findsOneWidget);
    await tester.tap(_id('tab-analyze')); await tester.pumpAndSettle();
    expect(find.text('Start analysis'), findsOneWidget);
    await tester.tap(_id('tab-studio')); await tester.pumpAndSettle();
    expect(find.text('Make it your own.'), findsOneWidget);
    await tester.tap(_id('tab-discover')); await tester.pumpAndSettle();
    expect(find.text('Rose after hours'), findsOneWidget);
    await tester.tap(_id('tab-profile')); await tester.pumpAndSettle();
    expect(find.text('Your space.'), findsOneWidget);
    await tester.tap(_id('tab-home')); await tester.pumpAndSettle();
    expect(find.text('Your next look\nstarts here.'), findsOneWidget);
  });

  testApp('Studio controls route to their design destinations and back returns', (tester) async {
    await _boot(tester);
    await tester.tap(_id('tab-studio')); await tester.pumpAndSettle();
    await tester.tap(_id('studio-choose')); await tester.pumpAndSettle();
    expect(_at('GL-036'), findsOneWidget);
    await _back(tester);
    expect(find.text('Make it your own.'), findsOneWidget);
    await tester.tap(_id('studio-hair')); await tester.pumpAndSettle();
    expect(_at('GL-044'), findsOneWidget);
  });

  testApp('Home try-a-look switches to the Studio tab; analyze goes to GL-017', (tester) async {
    await _boot(tester);
    await tester.tap(_id('home-try')); await tester.pumpAndSettle();
    expect(find.text('Make it your own.'), findsOneWidget);
    await tester.tap(_id('tab-home')); await tester.pumpAndSettle();
    await tester.tap(_id('home-analyze')); await tester.pumpAndSettle();
    expect(find.text('Start analysis'), findsOneWidget);
  });

  testApp('Discover: Save toggles, Follow toggles, Trending opens GL-072', (tester) async {
    await _boot(tester);
    await tester.tap(_id('tab-discover')); await tester.pumpAndSettle();
    expect(find.text('Follow'), findsOneWidget);
    await tester.tap(_id('discover-follow')); await tester.pumpAndSettle();
    expect(find.text('Following ✓'), findsOneWidget);
    await tester.tap(_id('discover-save')); await tester.pumpAndSettle();
    expect(tester.getSemantics(_id('discover-save')).label, 'Saved');
    await tester.tap(find.text('Trending')); await tester.pumpAndSettle();
    expect(_at('GL-072'), findsOneWidget);
  });

  testApp('Profile rows route to their design IDs', (tester) async {
    await _boot(tester);
    await tester.tap(_id('tab-profile')); await tester.pumpAndSettle();
    await tester.tap(find.text('Analysis history')); await tester.pumpAndSettle();
    expect(_at('GL-121'), findsOneWidget);
  });

  testApp('Sponsored placements are labelled, explainable and hideable', (tester) async {
    await _boot(tester);
    expect(find.text('Sponsored'), findsWidgets);
    await tester.tap(_id('ad-info').first); await tester.pumpAndSettle();
    expect(find.textContaining('not from your photos or analysis results'), findsOneWidget);
    await tester.ensureVisible(find.text('Hide this ad')); await tester.pumpAndSettle();
    await tester.tap(find.text('Hide this ad')); await tester.pumpAndSettle();
    expect(find.text('Shop collection ›'), findsNothing);
  });

  for (final state in ['loading', 'empty', 'error']) {
    testWidgets('ScreenStateGate renders the $state state without exceptions', (tester) async {
      await tester.pumpWidget(MaterialApp(theme: glamTheme(Brightness.dark), home: Scaffold(body: ScreenStateGate(state: state, child: const Text('content')))));
      await tester.pump(const Duration(milliseconds: 100));
      switch (state) {
        case 'loading': expect(find.bySemanticsLabel('Loading'), findsOneWidget);
        case 'empty': expect(find.text('Nothing here yet.'), findsOneWidget);
        case 'error': expect(find.text('Retry'), findsOneWidget);
      }
      expect(tester.takeException(), isNull);
    });
  }

  for (final scale in [1.0, 1.3]) {
    testApp('all five tabs lay out without overflow at text scale $scale', (tester) async {
      await _boot(tester, scale: scale);
      for (final t in ['analyze', 'studio', 'discover', 'profile', 'home']) {
        await tester.tap(_id('tab-$t')); await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: t);
      }
    });
  }
}
