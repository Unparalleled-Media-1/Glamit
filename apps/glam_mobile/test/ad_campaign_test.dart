import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/data/ad_placements.dart';
import 'package:glam_mobile/design/analyze_widgets.dart';
import 'package:glam_mobile/design/tokens.dart';
import 'package:glam_mobile/screens/ad_campaign.dart';
import 'support/fonts.dart';

void main() {
  setUpAll(() async { TestWidgetsFlutterBinding.ensureInitialized(); await loadGlamFonts(); });
  Finder id(String s) => find.bySemanticsIdentifier(s);
  Future<void> mount(WidgetTester tester, Widget w) async {
    tester.view.physicalSize = const Size(390, 2400); tester.view.devicePixelRatio = 1; addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(theme: glamTheme(Brightness.light), home: w)); await tester.pumpAndSettle();
  }

  test('design data: ten placements, all ADS ids unique, sensitive screens never listed', () {
    expect(adPlacements.length, 10); expect({for (final p in adPlacements) p.id}.length, 10);
    for (final p in adPlacements) { expect(p.screens.any(adBlockedScreens.contains), isFalse, reason: p.id); }
  });

  testWidgets('GL-211 selection drives the preview button, and an empty selection disables it', (tester) async {
    final d = AdCampaignDraft();
    await mount(tester, AdPlacementsScreen(draft: d));
    expect(find.text('Preview in the app · 5'), findsOneWidget);
    expect(find.textContaining('advertiser service is not connected'), findsOneWidget);
    expect(find.text('Home · sponsored hero card'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Home · sponsored hero card')); await tester.pumpAndSettle();
    expect(d.selected.contains('ADS-01'), isFalse); expect(find.text('Preview in the app · 4'), findsOneWidget);
    for (final x in [...d.selected]) { d.toggle(x); }
    await tester.pumpAndSettle();
    expect(find.text('Select a placement to preview'), findsOneWidget); expect(find.textContaining('Preview in the app ·'), findsNothing);
  });

  testWidgets('GL-212 previews each selected placement per group with no-fill simulation and details', (tester) async {
    await mount(tester, AdPreviewScreen(draft: AdCampaignDraft()));
    for (final g in ['Home', 'Discover', 'Analysis', 'Events', 'Professionals']) { expect(find.text(g), findsWidgets); }
    expect(id('preview-ADS-01'), findsOneWidget); expect(find.text('Summer glow'), findsWidgets);
    expect(find.textContaining('GL-092'), findsOneWidget);
    await tester.tap(find.text('Events').first); await tester.pumpAndSettle();
    expect(id('preview-ADS-07'), findsOneWidget); expect(find.text('Featured event designer'.toUpperCase()), findsOneWidget);
    expect(find.textContaining('GL-093'), findsOneWidget); expect(find.text('Sponsored'), findsWidgets);
    await tester.scrollUntilVisible(find.text('Simulate no ad available'), 200, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.byType(GlamSwitch).last); await tester.pumpAndSettle();
    expect(find.textContaining('No ad available'), findsWidgets); expect(find.text('Sponsored'), findsNothing);
  });

  testWidgets('GL-212 with nothing selected offers to choose placements', (tester) async {
    await mount(tester, AdPreviewScreen(draft: AdCampaignDraft([])));
    expect(find.text('No placements selected.'), findsOneWidget); expect(id('ad-choose'), findsOneWidget);
  });
}
