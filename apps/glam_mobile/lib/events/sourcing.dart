import 'event_brief.dart';

/// Where to find the outfit and who can do the makeup — guidance that adapts to how many days are left. GLAM names no business, price or
/// stock level: there is no verified merchant or professional directory connected (REQUIRES BACKEND VERIFICATION). The only action is a
/// search the user starts in their own maps app.

class SourceTip {
  const SourceTip(this.title, this.detail, {this.search});
  final String title, detail;
  /// Search text for the user's maps app, or null when the tip is not a place to look.
  final String? search;
}


List<SourceTip> outfitSources(EventBrief b, DateTime today) {
  final d = b.hasDate ? daysToGo(today, b.date!) : null;
  final c = b.city.trim();
  final tips = <SourceTip>[
    const SourceTip('Start with what you have', 'Check your wardrobe and ask friends or family to lend pieces. It is free and you can try it on today.'),
  ];
  if (d == null || d >= 14) {
    tips.add(SourceTip('Boutiques, department stores and online shops', 'There is time to order and return. Check delivery dates and the returns policy before you pay.', search: 'clothing boutique${c.isEmpty ? '' : ' near $c'}'));
    tips.add(SourceTip('Tailor or alterations', 'Ask for a fitting about two weeks before the event so there is room for adjustments.', search: 'tailor alterations${c.isEmpty ? '' : ' near $c'}'));
  } else if (d >= 7) {
    tips.add(SourceTip('Local boutiques and chain stores', 'Buy in store, or order only with fast, tracked delivery. Keep receipts in case of returns.', search: 'clothing store${c.isEmpty ? '' : ' near $c'}'));
    tips.add(SourceTip('Outfit rental', 'If rental is available locally, ask about dates, deposits and cleaning.', search: 'outfit hire dress rental${c.isEmpty ? '' : ' near $c'}'));
    tips.add(SourceTip('Tailor for small fixes', 'Quick hems and fastenings are often possible in under a week — ask first.', search: 'tailor alterations${c.isEmpty ? '' : ' near $c'}'));
  } else if (d >= 3) {
    tips.add(SourceTip('Shop in store, this week', 'Online delivery may not arrive in time. Try things on in person and choose what fits today — skip alterations.', search: 'clothing store${c.isEmpty ? '' : ' near $c'}'));
    tips.add(const SourceTip('Borrow or rent', 'Friends and family are the fastest option; ask today.'));
  } else if (d >= 0) {
    tips.add(SourceTip('Walk-in stores today', 'Choose pieces that fit as they are, and pay attention to opening hours.', search: 'clothing store open now${c.isEmpty ? '' : ' near $c'}'));
    tips.add(const SourceTip('Borrow', 'Ask a friend or family member who is your size.'));
  }
  if (b.setting != Setting.indoors) tips.add(const SourceTip('Shoes for the venue', 'Check the ground (grass, sand or stairs) and wear the shoes beforehand.'));
  return tips;
}

List<SourceTip> beautySources(EventBrief b, DateTime today) {
  final d = b.hasDate ? daysToGo(today, b.date!) : null;
  final c = b.city.trim();
  final near = c.isEmpty ? '' : ' near $c';
  final outdoorsDay = b.setting != Setting.indoors && (b.dayPart == DayPart.morning || b.dayPart == DayPart.day);
  final tips = <SourceTip>[];
  if (d == null || d >= 7) {
    tips.add(SourceTip('Book a makeup artist', 'Weekend slots go early. Ask for a trial if there is time, and show the outfit colours.', search: 'makeup artist$near'));
    tips.add(SourceTip('Hair stylist or braider', 'Book early for protective styles, braids or colour; tell them what you are wearing.', search: 'hair salon$near'));
  } else if (d >= 3) {
    tips.add(SourceTip('Book now', 'Ask about availability for your date straight away; a beauty counter or salon appointment can be quicker than a freelance artist.', search: 'makeup artist$near'));
    tips.add(SourceTip('Beauty counters', 'Many stores offer makeovers; ask if an appointment is needed.', search: 'beauty counter makeover$near'));
  } else if (d >= 0) {
    tips.add(SourceTip('Walk-in salons and counters', 'Appointments are unlikely this close; call ahead and ask about walk-ins.', search: 'walk-in beauty salon$near'));
    tips.add(const SourceTip('Do it yourself or with a friend', 'Plan a simple routine you can do at home, and practise the main step once.'));
  }
  tips.add(SourceTip('Ask before you book', [
    'Ask to see work on skin tones and hair textures like yours',
    'Ask what products and brands they use if you have sensitivities',
    if (outdoorsDay) 'Ask for long-wear, sweat-friendly makeup with SPF underneath',
    'Confirm the price and what it includes in writing',
  ].join(' · ')));
  return tips;
}

/// Maps search for the user's own maps app (opens the Maps app or maps.google.com). Only the visible search text is sent.
Uri mapsSearchUri(String query) => Uri.https('www.google.com', '/maps/search/', {'api': '1', 'query': query.trim()});
