import 'package:flutter_test/flutter_test.dart';
import 'package:glam_mobile/events/event_brief.dart';

void main() {
  final today = DateTime(2026, 11, 18);
  EventBrief flyer({int days = 3, DressCode code = DressCode.allWhite, Setting s = Setting.outdoors, DayPart p = DayPart.day}) => EventBrief(
    name: 'Liv Summer Club — All White Day Club', venue: 'Sandown Sports Ground', city: 'Sandton', date: today.add(Duration(days: days)), dayPart: p, setting: s, code: code);

  test('Countdown counts whole calendar days and ignores the time of day', () {
    expect(daysToGo(DateTime(2026, 11, 18, 23, 59), DateTime(2026, 11, 21, 1)), 3);
    expect(daysToGo(today, today), 0);
    expect(daysToGo(today, DateTime(2026, 11, 17)), -1);
    expect(countdown(3), '3 days to go'); expect(countdown(1), '1 day to go'); expect(countdown(0), 'Today'); expect(countdown(-2), 'This event has passed');
  });
  test('Every dress code yields three directions with a palette, pieces, footwear and beauty notes', () {
    for (final code in DressCode.values) {
      final ds = directionsFor(EventBrief(code: code, customTheme: 'emerald'));
      expect(ds.length, 3, reason: code.name);
      for (final d in ds) {
        expect(d.palette, isNotEmpty); expect(d.pieces, isNotEmpty); expect(d.footwear, isNotEmpty); expect(d.beauty, isNotEmpty); expect(d.title, isNotEmpty);
      }
    }
  });
  test('All white: opacity/stain guidance is present and grass-proof footwear outdoors', () {
    final ds = directionsFor(flyer());
    expect(ds.map((d) => d.title), ['Linen & ease', 'Fluid & flowing', 'Sharp white']);
    expect(ds.expand((d) => d.notes).join(' ').toLowerCase(), allOf(contains('opaque'), contains('stain')));
    expect(ds.every((d) => d.footwear.toLowerCase().contains('stiletto') ? d.footwear.toLowerCase().contains('avoid') : true), isTrue);
    expect(ds[1].footwear, contains('avoid stilettos on grass'));
  });
  test('Footwear follows the setting, not the person', () {
    expect(directionsFor(flyer(s: Setting.indoors))[1].footwear, isNot(contains('grass')));
    expect(directionsFor(flyer(s: Setting.mixed))[0].footwear, contains('also work indoors'));
  });
  test('Choices only: modest and traditional options are added exactly when the user turned them on; nothing is inferred', () {
    final plain = directionsFor(flyer());
    final modest = directionsFor(EventBrief(code: DressCode.cocktail, modest: true));
    expect(plain.length, 3);
    expect(modest.every((d) => d.notes.first.contains('you chose this')), isTrue);
    final trad = directionsFor(EventBrief(code: DressCode.cocktail, traditionalOptions: true));
    expect(trad.length, 4); expect(trad.last.title, 'Your heritage piece'); expect(trad.last.notes.single, contains('only because you turned on'));
    expect(directionsFor(EventBrief(code: DressCode.traditional)).expand((d) => d.notes).join(' '), contains('never infers culture or faith'));
  });
  test('Custom theme directions use the colour the user typed', () {
    final ds = directionsFor(EventBrief(code: DressCode.custom, customTheme: 'emerald green'));
    expect(ds.first.summary, contains('emerald green')); expect(ds.first.pieces.first.label, contains('emerald green'));
  });
  test('Three days to go: the plan compresses honestly instead of quoting passed deadlines', () {
    final items = planFor(flyer(days: 3), today);
    final byId = {for (final i in items) i.id: i};
    expect(items.every((i) => !i.due.isBefore(today)), isTrue, reason: 'no deadline in the past');
    expect(items.every((i) => !i.due.isAfter(DateTime(2026, 11, 21))), isTrue);
    expect(byId['order']!.title, startsWith('Buy in store')); expect(byId['order']!.detail, contains('may not arrive in time')); expect(byId['order']!.urgent, isTrue);
    expect(byId['book']!.title, contains('skip alterations'));
    expect(byId['order']!.due, DateTime(2026, 11, 20 - 1)); // tomorrow
    expect(byId['tryon']!.due, DateTime(2026, 11, 20));
    expect(byId['day']!.due, DateTime(2026, 11, 21));
    expect(byId['tryon']!.detail, contains('opaque in daylight'));
    expect(items.map((i) => i.due).toList(), orderedEquals([...items.map((i) => i.due)]..sort()));
  });
  test('Two weeks out: the usual lead times apply and nothing is marked urgent', () {
    final items = planFor(flyer(days: 21), today);
    final byId = {for (final i in items) i.id: i};
    expect(byId['order']!.title, 'Order missing pieces'); expect(byId['order']!.due, today.add(const Duration(days: 11)));
    expect(byId['book']!.due, today.add(const Duration(days: 14)));
    expect(items.any((i) => i.urgent), isFalse);
  });
  test('Event today collapses to today; a passed event has no plan; no date has no plan', () {
    expect(planFor(flyer(days: 0), today).every((i) => i.due == today), isTrue);
    expect(planFor(flyer(days: -1), today), isEmpty);
    expect(planFor(EventBrief(code: DressCode.allWhite), today), isEmpty);
  });
  test('Plan text is plain, dated and carries the dress code', () {
    final t = planAsText(flyer(), today);
    expect(t, contains('Liv Summer Club')); expect(t, contains('Sat 21 Nov 2026')); expect(t, contains('3 days to go')); expect(t, contains('Dress code: All white')); expect(t, contains('Sandown Sports Ground, Sandton'));
    expect(planAsText(EventBrief(code: DressCode.custom, customTheme: 'emerald', date: today.add(const Duration(days: 5))), today), contains('Dress code: emerald'));
  });
  test('Dates format without a locale dependency', () {
    expect(formatDay(DateTime(2026, 11, 21)), 'Sat 21 Nov'); expect(formatDayYear(DateTime(2026, 12, 1)), 'Tue 1 Dec 2026');
  });
}
