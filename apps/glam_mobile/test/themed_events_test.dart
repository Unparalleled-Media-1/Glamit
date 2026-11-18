import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/events/event_brief.dart';
import 'package:glam_mobile/events/sourcing.dart';
import 'package:glam_mobile/events/themed_events.dart';

ThemedEvent themedEventsByIdOrFail(String id) => themedEventById(id)!;

void main() {
  final today = DateTime(2026, 11, 18);
  test('All six themed events from the design are present and each pre-fills a complete brief', () {
    expect(kThemedEvents.map((e) => e.id), ['bridal', 'lumiere', 'garden', 'nye', 'july', 'heritage']);
    for (final e in kThemedEvents) {
      final b = e.toBrief();
      expect(b.name, e.name); expect(b.venue, e.venue); expect(b.city, e.city); expect(b.date, e.date); expect(b.hasCode, isTrue, reason: e.id);
      expect(directionsFor(b).length, greaterThanOrEqualTo(3), reason: e.id);
      expect(b.hostNote, isNotEmpty); expect(e.location, '${e.venue}, ${e.city}');
    }
    expect(kThemedCategories.skip(1).toSet(), kThemedEvents.map((e) => e.category).toSet());
  });
  test('Category filter returns exactly that category and All returns everything', () {
    expect(themedEventsIn('All').length, 6);
    expect(themedEventsIn('Black tie').single.id, 'nye');
    expect(themedEventsIn('Race day').single.id, 'july');
    expect(themedEventsIn('Cultural').single.id, 'heritage');
    expect(themedEventsIn('Pop-up').single.id, 'lumiere');
    expect(themedEventById('garden')!.name, 'Summer Glow Garden Party'); expect(themedEventById('nope'), isNull);
  });
  test('Bridal events warn against white; the heritage event never infers culture; outdoor garden warns about heels', () {
    expect(themedEventsByIdOrFail('bridal').tips.join(' ').toLowerCase(), contains('avoid white'));
    expect(themedEventsByIdOrFail('heritage').tips.join(' '), contains('never infers culture or faith'));
    expect(themedEventsByIdOrFail('garden').tips.join(' ').toLowerCase(), contains('stilettos'));
    expect(directionsFor(themedEventsByIdOrFail('july').toBrief()).first.title, 'Fashion-forward');
    expect(directionsFor(themedEventsByIdOrFail('lumiere').toBrief()).first.title, 'Your comfortable best');
  });
  test('Race day and come-as-you-are have labels and three directions each', () {
    expect(DressCode.raceDay.label, 'Race day'); expect(DressCode.comeAsYouAre.label, 'Come as you are');
    expect(directionsFor(EventBrief(code: DressCode.raceDay)).length, 3); expect(directionsFor(EventBrief(code: DressCode.comeAsYouAre)).length, 3);
  });
  EventBrief inDays(int d, {String city = 'Sandton', Setting s = Setting.outdoors, DayPart p = DayPart.day}) => EventBrief(name: 'x', city: city, date: today.add(Duration(days: d)), setting: s, dayPart: p, code: DressCode.allWhite);
  test('Outfit sourcing adapts to the days left and never names a business, price or stock level', () {
    expect(outfitSources(inDays(21), today).map((t) => t.title), containsAll(['Boutiques, department stores and online shops', 'Tailor or alterations']));
    expect(outfitSources(inDays(9), today).map((t) => t.title), contains('Outfit rental'));
    final three = outfitSources(inDays(3), today);
    expect(three.map((t) => t.title), contains('Shop in store, this week')); expect(three.first.title, 'Start with what you have');
    expect(three.map((t) => t.detail).join(' '), contains('skip alterations'));
    expect(outfitSources(inDays(1), today).map((t) => t.title), contains('Walk-in stores today'));
    for (final d in [0, 1, 3, 9, 21]) {
      for (final t in [...outfitSources(inDays(d), today), ...beautySources(inDays(d), today)]) { expect(t.detail, isNot(contains(RegExp(r'R ?\d|\$\d|in stock'))), reason: t.title); }
    }
  });
  test('Beauty sourcing: book early with time, walk-ins or DIY when close; outdoor day asks for sweat-friendly makeup', () {
    expect(beautySources(inDays(14), today).map((t) => t.title), contains('Book a makeup artist'));
    expect(beautySources(inDays(4), today).map((t) => t.title), containsAll(['Book now', 'Beauty counters']));
    expect(beautySources(inDays(2), today).map((t) => t.title), containsAll(['Walk-in salons and counters', 'Do it yourself or with a friend']));
    expect(beautySources(inDays(14), today).last.detail, contains('sweat-friendly'));
    expect(beautySources(inDays(14, s: Setting.indoors, p: DayPart.night), today).last.detail, isNot(contains('sweat-friendly')));
    expect(beautySources(inDays(14), today).last.detail, contains('skin tones and hair textures like yours'));
  });
  test('Search text includes the city only when the user gave one', () {
    expect(outfitSources(inDays(21), today)[1].search, 'clothing boutique near Sandton');
    expect(outfitSources(inDays(21, city: ''), today)[1].search, 'clothing boutique');
    expect(outfitSources(inDays(21), today).first.search, isNull, reason: 'wardrobe is not a place to search');
  });
  test('Maps search URL carries only the visible search text', () {
    final u = mapsSearchUri('  makeup artist near Sandton ');
    expect(u.host, 'www.google.com'); expect(u.path, '/maps/search/'); expect(u.queryParameters, {'api': '1', 'query': 'makeup artist near Sandton'});
    expect(mapsSearchUri('hair & nails').toString(), contains('hair+%26+nails'));
  });
}
