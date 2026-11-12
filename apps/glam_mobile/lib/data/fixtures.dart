/// Design-reference content for Batch 1 (the sample copy shown in the supplied
/// design). NOT live data: no endpoint is confirmed for feed ranking, ad
/// serving, events or credits (see docs/mobile-parity/BACKEND_CONTRACT_MAP.csv).
/// Release builds must set --dart-define=GLAM_REFERENCE_FIXTURES=false once the
/// matching server contracts are wired; screens then show their empty state.
const bool kReferenceFixtures = bool.fromEnvironment('GLAM_REFERENCE_FIXTURES', defaultValue: true);

/// `default|loading|empty|error` override used for visual-state capture; the
/// design's State toggle. Production keeps `default`.
const String kReferenceState = String.fromEnvironment('GLAM_REFERENCE_STATE', defaultValue: 'default');

class AdItem { const AdItem(this.title, this.portrait); final String title; final int portrait; }

class HeroAd {
  const HeroAd({required this.id, required this.advertiser, required this.title, required this.cta, required this.dest, required this.asset, required this.portrait});
  final String id, advertiser, title, cta, dest, asset;
  final int portrait;
}

class CarouselAd {
  const CarouselAd({required this.id, required this.advertiser, required this.heading, required this.cta, required this.dest, required this.items});
  final String id, advertiser, heading, cta, dest;
  final List<AdItem> items;
}

class PostAd {
  const PostAd({required this.id, required this.advertiser, required this.title, required this.cta, required this.dest, required this.portrait});
  final String id, advertiser, title, cta, dest;
  final int portrait;
}

const adsHero = HeroAd(id: 'ADS-01', advertiser: 'Lumière Beauty', title: 'This season’s beauty collection', cta: 'Shop collection', dest: 'GL-092', asset: 'assets/imagery/beauty-products.webp', portrait: 0);
const adsCarousel = CarouselAd(id: 'ADS-02', advertiser: 'Atelier Noor', heading: 'Sponsored collections', cta: 'Shop the look', dest: 'GL-093',
  items: [AdItem('Gold hour edit', 1), AdItem('Wedding guest', 2), AdItem('Soft tailoring', 3)]);
const adsPost = PostAd(id: 'ADS-03', advertiser: '@glowlab', title: 'Glass skin in 5 steps', cta: 'Shop the Look', dest: 'GL-074', portrait: 3);

class ThemedEvent {
  const ThemedEvent(this.id, this.name, this.date, this.city, this.category, this.portrait, {this.sponsored = false});
  final String id, name, date, city, category;
  final int portrait;
  final bool sponsored;
}

const featuredEvents = <ThemedEvent>[
  ThemedEvent('bridal', 'Cape Town Bridal Showcase', 'Sat 12 Dec', 'Cape Town', 'Bridal', 1),
  ThemedEvent('lumiere', 'Lumière Beauty Open Day', 'Sat 5 Dec', 'Cape Town', 'Pop-up', 0, sponsored: true),
  ThemedEvent('garden', 'Summer Glow Garden Party', 'Sat 19 Dec', 'Cape Town', 'Garden', 0),
  ThemedEvent('nye', 'Gold & Midnight NYE Gala', 'Thu 31 Dec', 'Johannesburg', 'Black tie', 2),
  ThemedEvent('heritage', 'Heritage Day Celebration', 'Fri 24 Sep', 'Durban', 'Cultural', 3),
];

const homeLooks = ['Soft bronze', 'Rose after hours', 'Everyday natural', 'Clean & considered'];

class CreditsFixture { const CreditsFixture(this.remaining, this.monthly); final int remaining, monthly; }
const credits = CreditsFixture(12, 20);
