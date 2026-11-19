import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/data/fixture_scope.dart';
import 'package:glam_mobile/data/fixtures.dart';
import 'package:glam_mobile/design/tokens.dart';
import 'package:glam_mobile/events/event_controller.dart';
import 'package:glam_mobile/screens/ad_widgets.dart';
import 'package:glam_mobile/screens/event_dress.dart';
import 'support/fonts.dart';

Widget app(Widget child, {bool fixtures = true}) => MaterialApp(theme: glamTheme(Brightness.light),
  home: FixtureScope(enabled: fixtures, child: Scaffold(body: child)));

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  Finder id(String s) => find.bySemanticsIdentifier(s);

  testWidgets('ADS-05 card is labelled Sponsored, explains itself and can be hidden', (tester) async {
    tester.view.physicalSize = const Size(360, 740); tester.view.devicePixelRatio = 1; addTearDown(tester.view.reset);
    await tester.pumpWidget(app(const SingleChildScrollView(child: CardAdSlot(adsAnalysis)))); await tester.pumpAndSettle();
    expect(find.text('Sponsored'), findsOneWidget); expect(find.text('Sponsored products'.toUpperCase()), findsOneWidget);
    expect(find.text('Leave-in care for curls'), findsOneWidget); expect(find.textContaining('Not part of your analysis'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Why am I seeing this ad?')); await tester.pumpAndSettle();
    expect(find.textContaining('not from your photos or analysis results'), findsOneWidget);
    await tester.tap(find.text('Hide this ad')); await tester.pumpAndSettle();
    expect(find.text('Leave-in care for curls'), findsNothing);
  });

  testWidgets('ADS-07 designer card sits after the second event on GL-209 and only with fixtures', (tester) async {
    tester.view.physicalSize = const Size(390, 1600); tester.view.devicePixelRatio = 1; addTearDown(tester.view.reset);
    final c = EventDressController();
    await tester.pumpWidget(app(ThemedEventsScreen(controller: c))); await tester.pumpAndSettle();
    expect(id('ad-ADS-07'), findsOneWidget); expect(find.text('Wedding guest collection'), findsOneWidget);
    final second = tester.getTopLeft(id('event-lumiere')).dy, ad = tester.getTopLeft(id('ad-ADS-07')).dy, third = tester.getTopLeft(id('event-garden')).dy;
    expect(ad > second && ad < third, isTrue, reason: 'between the 2nd and 3rd event, as in the design');
    await tester.pumpWidget(app(ThemedEventsScreen(controller: c), fixtures: false)); await tester.pumpAndSettle();
    expect(id('ad-ADS-07'), findsNothing); expect(find.text('Wedding guest collection'), findsNothing);
  });
}
