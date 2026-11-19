import 'event_brief.dart';

/// The six themed events defined by the design (ui_kits/mobile-v3/p14.jsx `EVT`). They are SAMPLE CONTENT: dates, venues and dress
/// codes come from organisers and must be verified with them. Choosing one only pre-fills the user's own event, which they can edit.
class ThemedEvent {
  const ThemedEvent({required this.id, required this.name, required this.date, required this.venue, required this.city, required this.theme, required this.hostDressCode,
    required this.category, required this.code, required this.dayPart, required this.setting, required this.photo, this.tips = const [], this.hostNote = ''});
  final String id, name, venue, city, theme, hostDressCode, category, hostNote;
  final DateTime date;
  final DressCode code;
  final DayPart dayPart;
  final Setting setting;
  final int photo; // sprite panel in the design's editorial image
  final List<String> tips;
  String get location => '$venue, $city';

  EventBrief toBrief() => EventBrief(name: name, venue: venue, city: city, date: date, dayPart: dayPart, setting: setting, code: code, hostNote: hostNote.isEmpty ? hostDressCode : hostNote, eventTips: tips);
}

const kThemedCategories = ['All', 'Bridal', 'Garden', 'Black tie', 'Cultural', 'Race day', 'Pop-up'];

final kThemedEvents = <ThemedEvent>[
  ThemedEvent(id: 'bridal', name: 'Cape Town Bridal Showcase', date: DateTime(2026, 12, 12), venue: 'V&A Waterfront', city: 'Cape Town', theme: 'Bridal & wedding guest',
    hostDressCode: 'Cocktail · soft pastels or jewel tones', category: 'Bridal', code: DressCode.cocktail, dayPart: DayPart.day, setting: Setting.indoors, photo: 1,
    tips: const ['At weddings and bridal events, avoid white, ivory and cream unless the hosts ask for it — those are usually kept for the bride.', 'Soft pastels and jewel tones are the host\'s suggestion; check the invitation for anything more specific.']),
  ThemedEvent(id: 'lumiere', name: 'Lumière Beauty Open Day', date: DateTime(2026, 12, 5), venue: 'Lumière Atelier', city: 'Cape Town', theme: 'Beauty pop-up',
    hostDressCode: 'Come as you are', category: 'Pop-up', code: DressCode.comeAsYouAre, dayPart: DayPart.day, setting: Setting.indoors, photo: 0,
    tips: const ['Beauty events often include live demos and photos — comfortable, camera-friendly pieces help.', 'Arrive with clean, moisturised skin if you want to try products; this is your choice.']),
  ThemedEvent(id: 'garden', name: 'Summer Glow Garden Party', date: DateTime(2026, 12, 19), venue: 'Constantia', city: 'Cape Town', theme: 'Garden party',
    hostDressCode: 'Smart casual · florals and linen', category: 'Garden', code: DressCode.gardenParty, dayPart: DayPart.day, setting: Setting.outdoors, photo: 0,
    tips: const ['Lawns swallow stilettos: choose wedges, block heels or flats.', 'Linen creases — steam it, and pick a fabric blend if you want it to stay crisp.']),
  ThemedEvent(id: 'nye', name: 'Gold & Midnight NYE Gala', date: DateTime(2026, 12, 31), venue: 'Sandton', city: 'Johannesburg', theme: 'Black tie',
    hostDressCode: 'Black tie · metallics, deep jewel tones', category: 'Black tie', code: DressCode.blackTie, dayPart: DayPart.night, setting: Setting.indoors, photo: 2,
    tips: const ['Black tie usually means floor-length or formal tailoring; confirm with the host if unsure.', 'New Year\'s Eve is late: choose shoes you can wear until the countdown.']),
  ThemedEvent(id: 'july', name: 'Durban July Race Day', date: DateTime(2027, 7, 3), venue: 'Greyville Racecourse', city: 'Durban', theme: 'Race day',
    hostDressCode: 'Fashion-forward · hats and fascinators', category: 'Race day', code: DressCode.raceDay, dayPart: DayPart.day, setting: Setting.outdoors, photo: 1,
    tips: const ['Plan the headpiece first — it shapes the rest of the outfit and the hair.', 'Winter days in Durban can turn cool and breezy; the forecast is not connected here, so check it before you finalise layers.']),
  ThemedEvent(id: 'heritage', name: 'Heritage Day Celebration', date: DateTime(2027, 9, 24), venue: 'Durban', city: 'Durban', theme: 'Cultural celebration',
    hostDressCode: 'Traditional attire welcome — your choice', category: 'Cultural', code: DressCode.traditional, dayPart: DayPart.day, setting: Setting.mixed, photo: 3,
    hostNote: 'Traditional attire welcome — your choice', tips: const ['What traditional attire means is your choice; GLAM never infers culture or faith, and these directions only follow the dress code you pick.']),
];

ThemedEvent? themedEventById(String id) { for (final e in kThemedEvents) { if (e.id == id) return e; } return null; }
List<ThemedEvent> themedEventsIn(String category) => category == 'All' ? kThemedEvents : [for (final e in kThemedEvents) if (e.category == category) e];
