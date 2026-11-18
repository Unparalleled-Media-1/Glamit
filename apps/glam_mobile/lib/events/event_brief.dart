import 'dart:ui' show Color;

/// "Dress for an event": the user's own event, their own dress-code choice, and rule-based inspiration derived only from
/// those choices. Nothing here is a personalised AI result, nothing is uploaded, no culture/faith/body attribute is inferred,
/// and no product, price, stock or weather is claimed (REQUIRES BACKEND VERIFICATION for any of those).

enum DressCode { allWhite, blackTie, cocktail, gardenParty, smartCasual, festival, raceDay, comeAsYouAre, traditional, custom }
enum DayPart { morning, day, evening, night }
enum Setting { outdoors, indoors, mixed }

extension DressCodeLabel on DressCode {
  String get label => switch (this) {
    DressCode.allWhite => 'All white', DressCode.blackTie => 'Black tie', DressCode.cocktail => 'Cocktail',
    DressCode.gardenParty => 'Garden party', DressCode.smartCasual => 'Smart casual', DressCode.festival => 'Festival / beach', DressCode.raceDay => 'Race day', DressCode.comeAsYouAre => 'Come as you are',
    DressCode.traditional => 'Traditional', DressCode.custom => 'Theme colours' };
}
extension DayPartLabel on DayPart { String get label => switch (this) { DayPart.morning => 'Morning', DayPart.day => 'Day', DayPart.evening => 'Evening', DayPart.night => 'Night' }; }
extension SettingLabel on Setting { String get label => switch (this) { Setting.outdoors => 'Outdoors', Setting.indoors => 'Indoors', Setting.mixed => 'Both' }; }

class EventBrief {
  EventBrief({this.name = '', this.venue = '', this.city = '', this.date, this.dayPart = DayPart.day, this.setting = Setting.outdoors,
    this.code, this.customTheme = '', this.modest = false, this.traditionalOptions = false, this.hostNote = '', this.eventTips = const []});
  String name, venue, city, customTheme, hostNote;
  /// Etiquette that belongs to the kind of event (e.g. weddings), shown with the directions.
  List<String> eventTips;
  DateTime? date;
  DayPart dayPart;
  Setting setting;
  DressCode? code;
  bool modest, traditionalOptions;
  String get title => name.trim().isEmpty ? 'Your event' : name.trim();
  bool get hasDate => date != null;
  bool get hasCode => code != null && (code != DressCode.custom || customTheme.trim().isNotEmpty);
}

/// Whole calendar days from [today] to [event] (0 = today, negative = passed). Time of day is ignored.
int daysToGo(DateTime today, DateTime event) => DateTime.utc(event.year, event.month, event.day).difference(DateTime.utc(today.year, today.month, today.day)).inDays;

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
String formatDay(DateTime d) => '${_weekdays[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}';
String formatDayYear(DateTime d) => '${formatDay(d)} ${d.year}';
String countdown(int days) => days < 0 ? 'This event has passed' : days == 0 ? 'Today' : days == 1 ? '1 day to go' : '$days days to go';

class Swatch { const Swatch(this.name, this.color); final String name; final Color color; }
class Piece { const Piece(this.label, this.note); final String label, note; }
class Direction {
  const Direction({required this.title, required this.summary, required this.palette, required this.pieces, required this.footwear, required this.beauty, required this.notes});
  final String title, summary, footwear, beauty;
  final List<Swatch> palette;
  final List<Piece> pieces;
  final List<String> notes;
}

const _white = Swatch('Chalk', Color(0xFFFFFFFF)), _ivory = Swatch('Ivory', Color(0xFFF6F1E7)), _cream = Swatch('Cream', Color(0xFFEFE6D2)),
  _sand = Swatch('Sand', Color(0xFFD9C7A5)), _gold = Swatch('Gold accent', Color(0xFFC9A24B)), _black = Swatch('Black', Color(0xFF111111)),
  _champagne = Swatch('Champagne', Color(0xFFDCC7A8)), _sage = Swatch('Sage', Color(0xFFA9B79A)), _blush = Swatch('Blush', Color(0xFFF1C9D2)),
  _navy = Swatch('Midnight', Color(0xFF1B2440)), _terracotta = Swatch('Terracotta', Color(0xFFC0714F)), _denim = Swatch('Indigo', Color(0xFF3B4F7A));

/// Footwear follows the setting, never the person: grass and sand punish stilettos, ballrooms do not.
String _footwear(Setting s, {required String indoor, required String outdoor}) => switch (s) {
  Setting.outdoors => outdoor, Setting.indoors => indoor, Setting.mixed => '$outdoor — they also work indoors' };

List<Direction> directionsFor(EventBrief b) {
  final code = b.code ?? DressCode.smartCasual;
  final day = b.dayPart == DayPart.morning || b.dayPart == DayPart.day;
  final out = switch (code) {
    DressCode.allWhite => [
      Direction(title: 'Linen & ease', summary: 'Relaxed, breathable tailoring in head-to-toe white — easy to move and dance in.',
        palette: const [_white, _ivory, _cream, _sand], pieces: const [Piece('Linen or cotton shirt, or a co-ord set', 'Lined or midweight so it is not see-through'), Piece('Wide-leg trousers or a longer short', 'Press it the day before'), Piece('Light layer', 'A white overshirt or wrap for the evening breeze')],
        footwear: _footwear(b.setting, indoor: 'Clean white loafers, mules or sandals', outdoor: 'Flat sandals, white sneakers or block heels'),
        beauty: day ? 'Fresh skin, SPF under makeup, a soft bronze or coral. Hair that stays put in the heat — braids, a sleek tie-back or a protected style.' : 'Glowy skin, a warm lip, soft shimmer on the lids. Hair that holds after a long day.',
        notes: const ['White shows sweat and spills: choose natural, breathable fabrics and keep a stain pen and wipes in your bag.', 'If a fabric is thin, line it — or wear a layer that matches your skin tone underneath.']),
      Direction(title: 'Fluid & flowing', summary: 'Movement and drape: a flowing dress, jumpsuit or kaftan-style set in white or cream.',
        palette: const [_white, _cream, _champagne, _gold], pieces: const [Piece('Flowing dress, jumpsuit or two-piece', 'Crepe, cotton voile or satin with a lining'), Piece('Statement gold or shell jewellery', 'Keep metals warm against the white'), Piece('Light wrap or shawl', 'For sun or cooler evenings')],
        footwear: _footwear(b.setting, indoor: 'Strappy heels or metallic flats', outdoor: 'Wedges, block heels or flat sandals (avoid stilettos on grass)'),
        beauty: day ? 'Dewy base, bronzer, glossy lip; sunglasses for the day.' : 'Luminous skin, defined eyes, a rosy or nude lip.',
        notes: const ['Check the hem length for dancing and for grass.', 'Hold up the outfit in daylight to check it is opaque.']),
      Direction(title: 'Sharp white', summary: 'Clean, structured and polished: a tailored set or suit in white or ivory.',
        palette: const [_white, _ivory, _sand, _black], pieces: const [Piece('Tailored set, suit or structured dress', 'Crisp cotton, twill or a linen blend'), Piece('Fitted tee, shell or fine knit', 'White or cream'), Piece('Slim belt or sleek bag', 'One quiet accent')],
        footwear: _footwear(b.setting, indoor: 'Pointed flats, clean heels or loafers', outdoor: 'Clean white leather sneakers or flat sandals; block heels if you like'),
        beauty: 'Polished and minimal: even skin, defined brows, a clean lip colour. Hair sleek or sculpted.',
        notes: const ['Sharp white needs a fit that works now — alterations take time.', 'Steam, do not iron, delicate blends.']),
    ],
    DressCode.blackTie => [
      Direction(title: 'Classic evening', summary: 'Floor-length or full tailoring in black, midnight or deep jewel tones.', palette: const [_black, _navy, _champagne, _gold],
        pieces: const [Piece('Evening gown or formal tuxedo-style set', 'Black, midnight or a deep jewel tone'), Piece('Evening bag and fine jewellery', 'Warm or cool metals — pick one'), Piece('Wrap or formal coat', 'For arrivals and exits')],
        footwear: _footwear(b.setting, indoor: 'Formal heels, dress shoes or polished flats', outdoor: 'Block heels or formal flats; carry a spare pair for lawns'), beauty: 'Defined eyes or a bold lip, not both. Hair styled up or sleek down.', notes: const ['Black tie usually means floor-length or formal tailoring — confirm with the host if unsure.']),
      Direction(title: 'Modern formal', summary: 'A sleek jumpsuit, column dress or tailored tuxedo set with one statement piece.', palette: const [_black, _ivory, _gold, _navy],
        pieces: const [Piece('Tailored jumpsuit or sharp tuxedo set', 'Structured, with a clean line'), Piece('Statement earrings or cuff', 'The one bold piece'), Piece('Slim clutch', 'Hands-free if you can')],
        footwear: _footwear(b.setting, indoor: 'Pointed heels or polished loafers', outdoor: 'Block heels or formal boots'), beauty: 'Satin skin, strong brows, a soft lip. Hair that photographs well.', notes: const ['Rehearse getting in and out of a car in the outfit.']),
      Direction(title: 'Jewel tones', summary: 'Colour within the formal brief: emerald, sapphire or ruby in a rich fabric.', palette: const [_navy, _sage, _blush, _gold],
        pieces: const [Piece('Gown or formal set in a jewel tone', 'Velvet, satin or crepe'), Piece('Metallic accessories', 'Gold or silver'), Piece('Formal wrap', 'Matching or neutral')],
        footwear: _footwear(b.setting, indoor: 'Metallic heels or satin flats', outdoor: 'Block heels or flats'), beauty: 'Let the colour lead: neutral lids, a rosy lip.', notes: const ['Keep jewellery simple if the fabric is rich.']),
    ],
    DressCode.cocktail || DressCode.gardenParty => [
      Direction(title: 'Polished & bright', summary: 'A knee-to-midi dress or smart separates in a confident colour.', palette: const [_blush, _sage, _terracotta, _cream],
        pieces: const [Piece('Midi dress, or blouse with tailored trousers/skirt', 'Colour or a soft print'), Piece('Light jacket or wrap', 'For the evening'), Piece('Small bag and simple jewellery', '')],
        footwear: _footwear(b.setting, indoor: 'Heels, dress flats or loafers', outdoor: 'Wedges, block heels or flat sandals — lawns swallow stilettos'), beauty: day ? 'Fresh skin and SPF, a rosy cheek, a glossy lip.' : 'Warm eyes, a defined lip, hair with some polish.', notes: const ['Cocktail sits between casual and black tie — slightly dressier than you would wear to work.']),
      Direction(title: 'Tailored', summary: 'A sharp blazer set, jumpsuit or shirt-and-trouser look with a dressy detail.', palette: const [_navy, _ivory, _gold, _terracotta],
        pieces: const [Piece('Blazer set or jumpsuit', 'Midweight, wrinkle-resistant'), Piece('Silk or satin top', 'Adds the dressy note'), Piece('Statement earrings', '')],
        footwear: _footwear(b.setting, indoor: 'Heels or polished loafers', outdoor: 'Block heels or clean flats'), beauty: 'Defined brows and a clean lip colour.', notes: const ['Wrinkle-resistant fabrics survive a long day better than linen.']),
      Direction(title: 'Soft & floaty', summary: 'A flowing midi or maxi with movement, in pastel or print.', palette: const [_blush, _sage, _champagne, _sand],
        pieces: const [Piece('Flowing midi or maxi', 'Chiffon, crepe or cotton voile with a lining'), Piece('Light shawl', ''), Piece('Delicate jewellery', '')],
        footwear: _footwear(b.setting, indoor: 'Strappy sandals or dress flats', outdoor: 'Wedges or flat sandals'), beauty: 'A dewy base and a soft cheek; hair loose, braided or pinned.', notes: const ['Check how the fabric moves in wind.']),
    ],
    DressCode.festival => [
      Direction(title: 'Light & loud', summary: 'Breathable pieces with colour, made for dancing and heat.', palette: const [_terracotta, _sage, _sand, _gold], pieces: const [Piece('Co-ord set, shorts or a short dress', 'Breathable cotton or linen'), Piece('Light layer', 'For after sunset'), Piece('Hat or sunglasses', 'Sun protection')],
        footwear: _footwear(b.setting, indoor: 'Comfortable sneakers or sandals', outdoor: 'Closed, comfortable shoes you can dance in; sandals if it is dry'), beauty: 'SPF first, then colour. Waterproof makeup, hair off your neck.', notes: const ['A small cross-body bag keeps your hands free.']),
      Direction(title: 'Beach-ready', summary: 'Easy resort pieces: loose shirts, wraps and light fabrics.', palette: const [_white, _sand, _denim, _gold], pieces: const [Piece('Open shirt or kaftan over swimwear/shorts', ''), Piece('Wrap skirt or relaxed trousers', ''), Piece('Wide-brim hat', '')],
        footwear: _footwear(b.setting, indoor: 'Sandals', outdoor: 'Flat sandals or slides'), beauty: 'Water-resistant SPF, minimal makeup, salt-friendly hair.', notes: const ['Sand and salt are hard on fabrics — pick washable pieces.']),
      Direction(title: 'Street festival', summary: 'Relaxed layers and sneakers with one standout item.', palette: const [_black, _denim, _terracotta, _cream], pieces: const [Piece('Relaxed trousers or skirt', ''), Piece('Statement top or jacket', 'The standout'), Piece('Cross-body bag', '')],
        footwear: _footwear(b.setting, indoor: 'Sneakers or boots', outdoor: 'Broken-in sneakers'), beauty: 'Bold liner or a bright lip; hair you can forget about.', notes: const ['Wear shoes you have already broken in.']),
    ],
    DressCode.raceDay => [
      Direction(title: 'Fashion-forward', summary: 'A statement dress or tailored set with a headpiece — the day rewards confidence.', palette: const [_blush, _champagne, _terracotta, _sage],
        pieces: const [Piece('Statement dress, jumpsuit or tailored set', 'Colour or print; structured shoulders photograph well'), Piece('Hat, fascinator or headband', 'Practise wearing it for a few hours'), Piece('Small bag', 'Hands free for the bar and the betting slip')],
        footwear: _footwear(b.setting, indoor: 'Polished heels or loafers', outdoor: 'Block heels or wedges — turf and grandstand steps are unforgiving; carry flats'), beauty: day ? 'Skin that survives sun and wind: SPF, matte-to-satin base, a long-wear lip. Hair that works with the hat.' : 'Defined eyes, a rosy lip; hair styled around the headpiece.', notes: const ['Pin hats and fascinators securely — breezes are common.', 'Check the host or course dress rules on headwear and hem length.']),
      Direction(title: 'Tailored & sharp', summary: 'Sleek tailoring in a bold colour with one statement accessory.', palette: const [_navy, _terracotta, _ivory, _gold], pieces: const [Piece('Tailored suit, set or structured dress', ''), Piece('Statement hat or hair accessory', ''), Piece('Pocket square, scarf or bold earrings', '')],
        footwear: _footwear(b.setting, indoor: 'Polished loafers or heels', outdoor: 'Block heels or smart boots'), beauty: 'Clean, polished; let the hat lead.', notes: const ['Mid-weight fabrics hold up over a long day outdoors.']),
      Direction(title: 'Print & movement', summary: 'A flowing print dress or co-ord with a coordinated headpiece.', palette: const [_blush, _sage, _champagne, _terracotta], pieces: const [Piece('Printed midi or maxi, or co-ord', 'Lined, crease-resistant'), Piece('Headpiece in a matching shade', ''), Piece('Light wrap', 'Grandstands get breezy')],
        footwear: _footwear(b.setting, indoor: 'Strappy sandals', outdoor: 'Wedges or block heels'), beauty: 'Dewy base, soft cheek, a glossy lip.', notes: const ['Choose a print you will still love in the photos.']),
    ],
    DressCode.comeAsYouAre => [
      Direction(title: 'Your comfortable best', summary: 'Whatever makes you feel like you — clean, comfortable and pulled together.', palette: const [_ivory, _sand, _blush, _sage], pieces: const [Piece('A favourite outfit that fits well', 'Pressed or steamed'), Piece('Layer for the venue temperature', ''), Piece('Simple bag', '')],
        footwear: _footwear(b.setting, indoor: 'Comfortable shoes you love', outdoor: 'Comfortable shoes for standing and walking'), beauty: 'Your usual routine, plus SPF if you are outdoors.', notes: const ['No dress code means no wrong answer — comfort for a few hours matters most.']),
      Direction(title: 'A little extra', summary: 'Everyday pieces with one detail that feels special.', palette: const [_champagne, _cream, _terracotta, _navy], pieces: const [Piece('Everyday base', ''), Piece('One special piece', 'Jewellery, a jacket, a bold lip'), Piece('Comfortable shoes', '')],
        footwear: _footwear(b.setting, indoor: 'Your favourite pair', outdoor: 'Comfortable closed shoes or sandals'), beauty: 'One feature to play up: lips, lids or nails.', notes: const ['One special detail is plenty.']),
      Direction(title: 'Brand-friendly', summary: 'If the event is hosted by a brand, a look that suits their world without copying it.', palette: const [_blush, _ivory, _gold, _sand], pieces: const [Piece('Outfit in the brand\'s colour family', ''), Piece('Camera-ready detail', 'Texture or a simple shine'), Piece('Comfortable shoes', '')],
        footwear: _footwear(b.setting, indoor: 'Comfortable shoes', outdoor: 'Comfortable shoes'), beauty: 'Photo-friendly skin and a lip colour you love.', notes: const ['Check the invite or social page for the host\'s own styling cues.']),
    ],
    DressCode.traditional => [
      Direction(title: 'Your own attire', summary: 'You decide what traditional attire means for you; GLAM only helps you plan around it.', palette: const [_gold, _cream, _terracotta, _navy], pieces: const [Piece('The outfit you choose', 'Your own garment, borrowed or tailored'), Piece('Accessories that complete it', ''), Piece('A backup layer', 'For weather and movement')],
        footwear: _footwear(b.setting, indoor: 'Whatever suits the outfit', outdoor: 'Comfortable shoes for long standing and walking'), beauty: 'Follow the outfit: let one feature lead.', notes: const ['GLAM never infers culture or faith — this direction only uses your choice of dress code.', 'If it needs tailoring, start now.']),
      Direction(title: 'Modern with a nod', summary: 'Contemporary tailoring with one traditional piece you choose.', palette: const [_navy, _gold, _ivory, _terracotta], pieces: const [Piece('Contemporary base (dress, suit or set)', ''), Piece('One traditional piece you own or love', 'Headwrap, jewellery, textile, embroidery…'), Piece('Simple shoes', '')],
        footwear: _footwear(b.setting, indoor: 'Polished shoes', outdoor: 'Block heels or flats'), beauty: 'Keep makeup balanced with the pattern or colour.', notes: const ['Mixing rule: one statement, everything else quiet.']),
      Direction(title: 'Quiet & respectful', summary: 'Clean lines and longer lengths with understated detail.', palette: const [_ivory, _sand, _sage, _navy], pieces: const [Piece('Long-sleeved, longer-length outfit', ''), Piece('Light scarf or layer', ''), Piece('Neutral bag', '')],
        footwear: _footwear(b.setting, indoor: 'Closed flats or low heels', outdoor: 'Comfortable closed shoes'), beauty: 'Soft, natural; hair neat.', notes: const ['If unsure of expectations, ask the host.']),
    ],
    DressCode.custom => [
      Direction(title: 'Head-to-toe theme', summary: 'Commit to "${b.customTheme.trim()}" with a matching outfit from the top down.', palette: const [_champagne, _ivory, _gold, _sand], pieces: [Piece('Main outfit in the theme: ${b.customTheme.trim()}', 'Own, borrow or buy'), const Piece('Matching accessories', ''), const Piece('Neutral backup layer', '')],
        footwear: _footwear(b.setting, indoor: 'Shoes that suit the outfit', outdoor: 'Comfortable shoes that can handle grass or sand'), beauty: 'Let the theme colour reappear once, on lips, lids or nails.', notes: const ['Swatches show neutrals to pair with your theme; pick the main colour yourself.']),
      Direction(title: 'Accent theme', summary: 'Neutral outfit with the theme colour in one bold accessory or layer.', palette: const [_ivory, _sand, _black, _gold], pieces: [const Piece('Neutral base outfit', ''), Piece('One piece in the theme: ${b.customTheme.trim()}', 'Scarf, bag, shoes or jacket'), const Piece('Simple jewellery', '')],
        footwear: _footwear(b.setting, indoor: 'Neutral shoes', outdoor: 'Neutral block heels or flats'), beauty: 'Understated base, one echo of the theme.', notes: const ['Works well if you are short on time.']),
      Direction(title: 'Tone on tone', summary: 'Shades of one colour from light to deep for depth without busyness.', palette: const [_cream, _sand, _terracotta, _navy], pieces: [const Piece('Two or three shades in the same family', ''), Piece('Texture instead of pattern', 'Linen, knit, satin'), const Piece('Small accessories', '')],
        footwear: _footwear(b.setting, indoor: 'Matching or neutral shoes', outdoor: 'Matching flats or block heels'), beauty: 'Monochrome makeup in the same family.', notes: const ['Lay the pieces out together before deciding.']),
    ],
    DressCode.smartCasual => [
      Direction(title: 'Elevated everyday', summary: 'Your best everyday pieces, pressed and put together.', palette: const [_ivory, _navy, _sand, _terracotta], pieces: const [Piece('Good trousers or skirt', ''), Piece('Smart top, shirt or knit', ''), Piece('Light jacket', '')],
        footwear: _footwear(b.setting, indoor: 'Loafers, clean sneakers or flats', outdoor: 'Clean sneakers or low block heels'), beauty: 'Natural, polished.', notes: const ['Smart casual: no creases, no sports logos.']),
      Direction(title: 'Relaxed tailoring', summary: 'Unstructured blazer or overshirt over simple basics.', palette: const [_sand, _black, _cream, _sage], pieces: const [Piece('Unstructured blazer or overshirt', ''), Piece('Simple tee or shell', ''), Piece('Straight trousers', '')],
        footwear: _footwear(b.setting, indoor: 'Loafers or minimal sneakers', outdoor: 'Minimal sneakers'), beauty: 'Fresh and easy.', notes: const ['Layers adapt to the day.']),
      Direction(title: 'Easy dress', summary: 'A simple midi dress or shirt dress with one accessory.', palette: const [_blush, _denim, _cream, _gold], pieces: const [Piece('Midi or shirt dress', ''), Piece('Belt or bag', ''), Piece('Light layer', '')],
        footwear: _footwear(b.setting, indoor: 'Flat sandals or low heels', outdoor: 'Flat sandals or white sneakers'), beauty: 'Light base, a touch of colour.', notes: const ['One accessory is plenty.']),
    ],
  };
  if (b.traditionalOptions && code != DressCode.traditional) {
    out.add(const Direction(title: 'Your heritage piece', summary: 'Work a traditional or heritage piece of your choosing into any direction above.', palette: [_gold, _cream, _terracotta, _navy],
      pieces: [Piece('A garment, textile or accessory you choose', 'You decide what it is — GLAM does not assume'), Piece('Keep the rest quiet', 'One statement keeps it balanced')],
      footwear: 'Choose shoes for the rest of the outfit.', beauty: 'Let the piece lead; keep makeup balanced with it.', notes: ['This option appears only because you turned on traditional options.']));
  }
  if (b.modest) {
    return [for (final d in out) Direction(title: d.title, summary: d.summary, palette: d.palette, pieces: d.pieces, footwear: d.footwear, beauty: d.beauty,
      notes: ['Built for modest coverage (you chose this): choose longer sleeves and hems, or add a layer over any piece.', ...d.notes])];
  }
  return out;
}

class PlanItem {
  const PlanItem({required this.id, required this.title, required this.detail, required this.due, this.urgent = false});
  final String id, title, detail;
  final DateTime due;
  /// True when the usual lead time no longer fits and the step was changed to something realistic.
  final bool urgent;
}

/// Checklist with deadlines counted back from the event date. When time is short the steps change honestly instead of
/// quoting deadlines that have already passed.
List<PlanItem> planFor(EventBrief b, DateTime today) {
  final date = b.date; if (date == null) return const [];
  final d = daysToGo(today, date);
  if (d < 0) return const [];
  final day0 = DateTime(today.year, today.month, today.day), event = DateTime(date.year, date.month, date.day);
  DateTime due(int daysBefore) { final t = event.subtract(Duration(days: daysBefore)); return t.isBefore(day0) ? day0 : t; }
  final items = <PlanItem>[];
  items.add(PlanItem(id: 'direction', title: 'Choose a direction and check what you already own', detail: 'Lay out candidates from your wardrobe first.', due: due(14), urgent: d < 14));
  if (d >= 7) {
    items.add(PlanItem(id: 'order', title: 'Order missing pieces', detail: 'Leave time for delivery and returns. Prices and stock are not checked by GLAM.', due: due(10)));
  } else {
    items.add(PlanItem(id: 'order', title: 'Buy in store, borrow or rent what is missing', detail: 'Online delivery may not arrive in time with $d day${d == 1 ? '' : 's'} left.', due: d >= 3 ? due(d - 1) : day0, urgent: true));
  }
  if (d >= 7) {
    items.add(PlanItem(id: 'book', title: 'Book hair, makeup or alterations', detail: 'Popular slots go early for weekend events.', due: due(7)));
  } else if (d >= 3) {
    items.add(PlanItem(id: 'book', title: 'Book hair and makeup now — skip alterations', detail: 'Alterations need more time than you have; choose pieces that fit today.', due: day0, urgent: true));
  } else {
    items.add(PlanItem(id: 'book', title: 'Sort hair and makeup yourself or ask a friend', detail: 'Last-minute appointments are unlikely; plan a simple routine you can do at home.', due: day0, urgent: true));
  }
  items.add(PlanItem(id: 'tryon', title: 'Try everything on together', detail: 'Sit, dance and walk in it. ${(b.code == DressCode.allWhite) ? 'Check white is opaque in daylight. ' : ''}Steam or press.', due: due(d >= 5 ? 3 : 1), urgent: d < 5));
  items.add(PlanItem(id: 'ready', title: 'Shoes, bag and accessories ready', detail: [if (b.setting != Setting.indoors) 'Sun protection and a spare layer', 'Touch-up kit and a stain pen'].join(' · '), due: due(1)));
  items.add(PlanItem(id: 'day', title: 'Event day', detail: 'Check the weather before you dress — the forecast is not connected in this version.', due: due(0)));
  items.sort((a, b) => a.due.compareTo(b.due));
  return items;
}

String planAsText(EventBrief b, DateTime today) {
  final buf = StringBuffer(b.title);
  if (b.hasDate) buf.write(' — ${formatDayYear(b.date!)} (${countdown(daysToGo(today, b.date!))})');
  buf.writeln();
  if (b.venue.trim().isNotEmpty || b.city.trim().isNotEmpty) buf.writeln([b.venue.trim(), b.city.trim()].where((s) => s.isNotEmpty).join(', '));
  if (b.code != null) buf.writeln('Dress code: ${b.code == DressCode.custom ? b.customTheme.trim() : b.code!.label}');
  buf.writeln();
  for (final p in planFor(b, today)) { buf.writeln('• ${formatDay(p.due)} — ${p.title}'); }
  return buf.toString().trimRight();
}
