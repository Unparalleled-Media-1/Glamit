import 'package:flutter/material.dart';
import '../tryon/tryon_controller.dart';
import 'package:flutter/services.dart';
import '../data/fixture_scope.dart';
import '../data/fixtures.dart';
import '../design/analyze_widgets.dart';
import '../design/photo.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../events/event_brief.dart';
import '../events/event_controller.dart';
import '../events/sourcing.dart';
import '../events/themed_events.dart';
import '../shell/nav.dart';
import 'ad_widgets.dart';

const _notice = 'Rule-based inspiration from the choices you make here — not an AI result. Nothing is uploaded unless you choose “See it on me”. Products, prices, stock and weather are not checked.';

/// Shared frame for the five event screens: back bar, scrolling body, bottom tray of actions.
class _EventPage extends StatelessWidget {
  const _EventPage({required this.title, required this.step, required this.headline, required this.children, required this.actions, this.lead});
  final String title, step, headline; final String? lead; final List<Widget> children, actions;
  @override Widget build(BuildContext context) {
    final p = context.glam, inset = MediaQuery.paddingOf(context);
    return Scaffold(backgroundColor: p.bg, resizeToAvoidBottomInset: false, body: Stack(children: [
      ListView(keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 110 + actions.length * 66 + inset.bottom + MediaQuery.viewInsetsOf(context).bottom), children: [
        Kicker(step),
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(headline, style: display(40, 42, p.tx, ls: -1.2))),
        if (lead != null) Padding(padding: const EdgeInsets.only(bottom: 14), child: Text(lead!, style: body(15, p.tx2, height: 23))),
        ...children]),
      GlamTray(child: Column(mainAxisSize: MainAxisSize.min, children: actions)),
      GlamTopBar(title: title, onBack: () => Navigator.of(context).maybePop()),
    ]));
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.controller, required this.onChanged, this.hint, this.id});
  final String label; final TextEditingController controller; final ValueChanged<String> onChanged; final String? hint, id;
  @override Widget build(BuildContext context) {
    final p = context.glam;
    return Padding(padding: const EdgeInsets.only(bottom: 14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(bottom: 7), child: Text(label, style: body(13, p.tx, w: FontWeight.w700))),
      Semantics(identifier: id, textField: true, label: label, child: TextField(controller: controller, onChanged: onChanged, style: body(16, p.tx), textCapitalization: TextCapitalization.sentences,
        decoration: InputDecoration(hintText: hint, hintStyle: body(16, p.tx2), filled: true, fillColor: p.sf2, contentPadding: const EdgeInsets.all(14), isDense: false,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.ln)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.ln)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.ac2, width: 2))))),
    ]));
  }
}

Widget _chips<T>(List<T> values, T? selected, String Function(T) label, ValueChanged<T> on) => Wrap(spacing: 8, runSpacing: 8, children: [
  for (final v in values) GlamChip(label(v), selected: v == selected, onTap: () => on(v))]);

Widget _label(BuildContext c, String t) => Padding(padding: const EdgeInsets.only(top: 6, bottom: 8), child: Text(t, style: body(13, c.glam.tx, w: FontWeight.w700)));

/// GL-057 — add your own event (listings need a connected events provider, so the user supplies the details).
class EventAddScreen extends StatefulWidget {
  const EventAddScreen({super.key, required this.controller});
  final EventDressController controller;
  @override State<EventAddScreen> createState() => _EventAddState();
}
class _EventAddState extends State<EventAddScreen> {
  late final name = TextEditingController(text: widget.controller.brief.name), venue = TextEditingController(text: widget.controller.brief.venue), city = TextEditingController(text: widget.controller.brief.city);
  @override void dispose() { name.dispose(); venue.dispose(); city.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    final c = widget.controller;
    return AnimatedBuilder(animation: c, builder: (context, _) => _EventPage(title: 'Your event', step: 'STEP 1 OF 4', headline: 'Add your event.',
      lead: 'Event listings need a connected events provider, so enter the details from your invite or flyer. They stay on this device.',
      children: [
        GlamCard(onTap: () => GlamNav.to(context, 'GL-209'), child: Row(children: [Text('◈', style: body(22, context.glam.ac2)), const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Start from a themed event', style: body(15, context.glam.tx, w: FontWeight.w700)), Text('Bridal, garden, black tie, race day, cultural, pop-ups', style: body(12, context.glam.tx2, height: 18))])), Text('›', style: body(20, context.glam.tx2))])),
        _Field(label: 'Event name', controller: name, hint: 'e.g. Livgreen Summer Club — All White Day Club', id: 'event-name', onChanged: (v) => c.update((b) => b.name = v)),
        _Field(label: 'Venue (optional)', controller: venue, hint: 'e.g. Sandown Sports Ground', id: 'event-venue', onChanged: (v) => c.update((b) => b.venue = v)),
        _Field(label: 'City (optional)', controller: city, hint: 'e.g. Sandton', id: 'event-city', onChanged: (v) => c.update((b) => b.city = v)),
      ],
      actions: [GlamButton('Continue', id: 'event-continue-1', kind: c.brief.name.trim().isEmpty ? GlamButtonKind.disabled : GlamButtonKind.primary, onTap: () => GlamNav.to(context, 'GL-058'))]));
  }
}

/// GL-058 — where and when.
class EventWhenScreen extends StatelessWidget {
  const EventWhenScreen({super.key, required this.controller});
  final EventDressController controller;
  Future<void> _pick(BuildContext context) async {
    final today = controller.today;
    final d = await showDatePicker(context: context, initialDate: controller.brief.date ?? today, firstDate: today, lastDate: today.add(const Duration(days: 365 * 3)), helpText: 'Event date');
    if (d != null) controller.update((b) => b.date = d);
  }
  @override Widget build(BuildContext context) {
    final p = context.glam;
    return AnimatedBuilder(animation: controller, builder: (context, _) {
      final b = controller.brief, days = b.date == null ? null : daysToGo(controller.today, b.date!);
      return _EventPage(title: 'Where & when', step: 'STEP 2 OF 4', headline: 'When is it?',
        lead: '${b.title}${b.venue.trim().isEmpty ? '' : ' · ${b.venue.trim()}'}',
        children: [
          Semantics(identifier: 'event-date', button: true, label: 'Event date', child: GlamCard(onTap: () => _pick(context), child: Row(children: [
            Text('▣', style: body(22, p.ac2)), const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(b.date == null ? 'Choose the date' : formatDayYear(b.date!), style: body(15, p.tx, w: FontWeight.w700)),
              Text(days == null ? 'Tap to open the calendar' : countdown(days), style: body(12, p.tx2, height: 18))])),
            Text('›', style: body(20, p.tx2))]))),
          _label(context, 'Time of day'),
          _chips(DayPart.values, b.dayPart, (v) => v.label, (v) => controller.update((x) => x.dayPart = v)),
          _label(context, 'Setting'),
          _chips(Setting.values, b.setting, (v) => v.label, (v) => controller.update((x) => x.setting = v)),
          GlamCard(color: p.sf2, child: Row(children: [
            Text('☀', style: body(30, p.ac2)), const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Forecast · not connected', style: body(15, p.tx, w: FontWeight.w700)),
              Text('Weather shapes fabric, layers and hair advice, so check the forecast yourself before you choose.', style: body(12, p.tx2, height: 18))]))])),
          if (days != null && days < 0) Text('That date has passed — choose a future date for a plan.', style: body(13, p.err, height: 18)),
        ],
        actions: [GlamButton('Continue', id: 'event-continue-2', kind: (days == null || days < 0) ? GlamButtonKind.disabled : GlamButtonKind.primary, onTap: () => GlamNav.to(context, 'GL-059'))]);
    });
  }
}

/// GL-059 — dress code and the user's own preferences (GLAM never infers culture or faith).
class EventCodeScreen extends StatefulWidget {
  const EventCodeScreen({super.key, required this.controller});
  final EventDressController controller;
  @override State<EventCodeScreen> createState() => _EventCodeState();
}
class _EventCodeState extends State<EventCodeScreen> {
  late final theme = TextEditingController(text: widget.controller.brief.customTheme);
  @override void dispose() { theme.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    final p = context.glam, c = widget.controller;
    Widget toggle(String label, bool on, ValueChanged<bool> set, String id) => Container(constraints: const BoxConstraints(minHeight: 56), child: Row(children: [
      GlamSwitch(on: on, label: label, onChanged: set), const SizedBox(width: 14), Expanded(child: Text(label, style: body(14, p.tx, height: 21)))]));
    return AnimatedBuilder(animation: c, builder: (context, _) {
      final b = c.brief;
      return _EventPage(title: 'Dress code', step: 'STEP 3 OF 4', headline: 'Your dress code.',
        lead: 'Pick what the invite says — or the theme you want to follow.',
        children: [
          _chips(DressCode.values, b.code, (v) => v.label, (v) => c.update((x) => x.code = v)),
          if (b.code == DressCode.custom) Padding(padding: const EdgeInsets.only(top: 14), child: _Field(label: 'Theme or colours', controller: theme, hint: 'e.g. emerald green, 90s, tropical', id: 'event-theme', onChanged: (v) => c.update((x) => x.customTheme = v))),
          const SizedBox(height: 10),
          toggle('Prefer modest coverage', b.modest, (v) => c.update((x) => x.modest = v), 'event-modest'),
          toggle('Include traditional attire options', b.traditionalOptions, (v) => c.update((x) => x.traditionalOptions = v), 'event-traditional'),
          Padding(padding: const EdgeInsets.only(top: 6), child: Text('These are your choices — GLAM never infers culture or faith.', style: body(12, p.tx2, height: 18))),
        ],
        actions: [GlamButton('Create outfits', id: 'event-create', kind: b.hasCode ? GlamButtonKind.primary : GlamButtonKind.disabled, onTap: () => GlamNav.to(context, 'GL-063'))]);
    });
  }
}

/// GL-063 — three outfit directions derived from the brief.
class EventIdeasScreen extends StatefulWidget {
  const EventIdeasScreen({super.key, required this.controller});
  final EventDressController controller;
  @override State<EventIdeasScreen> createState() => _EventIdeasState();
}
class _EventIdeasState extends State<EventIdeasScreen> {
  int open = 0;
  @override Widget build(BuildContext context) {
    final p = context.glam, c = widget.controller, b = c.brief, ds = directionsFor(b);
    final days = b.date == null ? null : daysToGo(c.today, b.date!);
    Widget section(String t, String text) => Padding(padding: const EdgeInsets.only(top: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(t.toUpperCase(), style: body(10, p.ac2, w: FontWeight.w700, ls: 1.5)), const SizedBox(height: 4), Text(text, style: body(14, p.tx, height: 21))]));
    return _EventPage(title: 'Outfit ideas', step: 'STEP 4 OF 4', headline: '${ds.length == 3 ? 'Three' : ds.length == 4 ? 'Four' : '${ds.length}'} directions.',
      lead: '${b.title} · ${b.hasDate ? formatDayYear(b.date!) : 'date not set'}${days == null ? '' : ' · ${countdown(days)}'} · ${b.code == DressCode.custom ? b.customTheme.trim() : (b.code?.label ?? '')}',
      children: [
        if (b.hostNote.isNotEmpty || b.eventTips.isNotEmpty) GlamCard(color: p.sf2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Kicker('About this event'),
          if (b.hostNote.isNotEmpty) Text('Host dress code: ${b.hostNote}', style: body(14, p.tx, height: 21, w: FontWeight.w700)),
          for (final t in b.eventTips) Padding(padding: const EdgeInsets.only(top: 8), child: Text('• $t', style: body(14, p.tx, height: 21)))])),
        for (final (i, d) in ds.indexed) GlamCard(onTap: () => setState(() => open = open == i ? -1 : i), padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text(d.title, style: display(22, 26, p.tx))), Text(open == i ? '–' : '+', style: body(20, p.tx2))]),
          const SizedBox(height: 4), Text(d.summary, style: body(14, p.tx2, height: 21)),
          const SizedBox(height: 12),
          Wrap(spacing: 14, runSpacing: 8, children: [for (final s in d.palette) Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 22, height: 22, decoration: BoxDecoration(color: s.color, shape: BoxShape.circle, border: Border.all(color: p.ln))), const SizedBox(width: 6), Text(s.name, style: body(12, p.tx2))])]),
          if (open == i) ...[
            section('Pieces', d.pieces.map((x) => x.note.isEmpty ? '• ${x.label}' : '• ${x.label} — ${x.note}').join('\n')),
            section('Shoes', d.footwear), section('Hair & makeup', d.beauty), section('Good to know', d.notes.map((n) => '• $n').join('\n')),
          ],
        ])),
        SourcingSections(controller: c),
        TryOnSection(controller: c, garments: tryOnGarments(ds[open < 0 ? 0 : open]), occasion: b.title),
        Padding(padding: const EdgeInsets.only(top: 6), child: Text(_notice, style: body(12, p.tx2, height: 18))),
      ],
      actions: [
        GlamButton('Make a styling plan', id: 'event-plan', onTap: () => GlamNav.to(context, 'GL-067')),
        GlamButton('Try makeup in Studio', kind: GlamButtonKind.ghost, onTap: () => GlamNav.to(context, 'GL-035'))]);
  }
}

/// GL-067 — checklist with deadlines counted back from the event date.
class EventPlanScreen extends StatelessWidget {
  const EventPlanScreen({super.key, required this.controller});
  final EventDressController controller;
  @override Widget build(BuildContext context) {
    final p = context.glam;
    return AnimatedBuilder(animation: controller, builder: (context, _) {
      final b = controller.brief, today = controller.today, items = planFor(b, today), days = b.date == null ? null : daysToGo(today, b.date!);
      return _EventPage(title: 'Styling plan', step: 'YOUR PLAN', headline: 'Your plan.',
        lead: days == null ? 'Add an event date to get deadlines.' : days < 0 ? 'This event has passed.' : '${b.title} · ${countdown(days)}${days < 7 ? ' — steps are shortened to fit' : ''}',
        children: [
          if (items.isEmpty) GlamCard(child: Text('No plan yet. Go back and choose an upcoming date.', style: body(14, p.tx2, height: 21)))
          else GlamCard(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4), child: Column(children: [
            for (final (i, it) in items.indexed) Semantics(identifier: 'plan-${it.id}', checked: controller.done.contains(it.id), label: it.title, child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: () => controller.toggle(it.id),
              child: Container(constraints: const BoxConstraints(minHeight: 56), padding: const EdgeInsets.symmetric(vertical: 8), decoration: BoxDecoration(border: i == items.length - 1 ? null : Border(bottom: BorderSide(color: p.ln))),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SizedBox(width: 44, height: 44, child: Center(child: Container(width: 24, height: 24, alignment: Alignment.center,
                    decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: controller.done.contains(it.id) ? p.ac2 : p.ln, width: 2), color: controller.done.contains(it.id) ? p.ac2 : Colors.transparent),
                    child: controller.done.contains(it.id) ? const Text('✓', style: TextStyle(color: Colors.white, fontSize: 13)) : null))),
                  const SizedBox(width: 6),
                  Expanded(child: Padding(padding: const EdgeInsets.only(top: 8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(it.title, style: body(14, p.tx, w: FontWeight.w700, height: 20)),
                    Text('${formatDay(it.due)}${it.urgent ? ' · shortened' : ''} · ${it.detail}', style: body(12, p.tx2, height: 18))])))]))))])),
          Padding(padding: const EdgeInsets.only(top: 6), child: Text(_notice, style: body(12, p.tx2, height: 18))),
        ],
        actions: [
          GlamButton('Copy plan', id: 'event-copy', kind: items.isEmpty ? GlamButtonKind.disabled : GlamButtonKind.primary, onTap: () async {
            await Clipboard.setData(ClipboardData(text: planAsText(b, today)));
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Plan copied. Calendar reminders are not connected in this version.')));
          }),
          GlamButton('Edit event', kind: GlamButtonKind.ghost, onTap: () => GlamNav.to(context, 'GL-057'))]);
    });
  }
}

/// "Where to find the outfit" and "Makeup & hair" guidance. No business, price or stock is named or claimed; the only action is a search the
/// user starts in their own maps app.
class SourcingSections extends StatelessWidget {
  const SourcingSections({super.key, required this.controller, this.brief});
  final EventDressController controller; final EventBrief? brief;
  Future<void> _search(BuildContext context, String q) async {
    final ok = await controller.openUrl(mapsSearchUri(q));
    if (!ok) {
      await Clipboard.setData(ClipboardData(text: q));
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open a maps app. The search text was copied instead.')));
    }
  }
  @override Widget build(BuildContext context) {
    final p = context.glam, b = brief ?? controller.brief, today = controller.today;
    Widget group(String kick, List<SourceTip> tips, String idPrefix) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(top: 14), child: Kicker(kick)),
      GlamCard(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6), child: Column(children: [
        for (final (i, t) in tips.indexed) Container(padding: const EdgeInsets.symmetric(vertical: 12), decoration: BoxDecoration(border: i == tips.length - 1 ? null : Border(bottom: BorderSide(color: p.ln))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t.title, style: body(15, p.tx, w: FontWeight.w700)), const SizedBox(height: 2), Text(t.detail, style: body(13, p.tx2, height: 19)),
            if (t.search != null) Padding(padding: const EdgeInsets.only(top: 8), child: Semantics(identifier: '$idPrefix-$i', child: GlamChip('Search “${t.search}” ›', selected: false, onTap: () => _search(context, t.search!))))]))])),
    ]);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      group('Where to find your outfit', outfitSources(b, today), 'search-outfit'),
      group('Makeup & hair', beautySources(b, today), 'search-beauty'),
      Padding(padding: const EdgeInsets.only(top: 4), child: Text('Search buttons open your maps app with the text shown. GLAM has not verified any business, price or stock${b.city.trim().isEmpty ? '; add a city to your event to search nearby' : ''}.', style: body(12, p.tx2, height: 18))),
    ]);
  }
}

/// A picture of you in the outfit needs a generation service that is not connected. GLAM shows no avatar and no stand-in image.
class TryOnStatusCard extends StatelessWidget {
  const TryOnStatusCard({super.key});
  @override Widget build(BuildContext context) {
    final p = context.glam;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(padding: EdgeInsets.only(top: 14), child: Kicker('See it on you')),
      Semantics(identifier: 'tryon-status', container: true, child: GlamCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Not available yet', style: display(22, 26, p.tx)),
        const SizedBox(height: 6),
        Text('A picture of you in this outfit needs an image-generation service that is not connected. Until it is, GLAM will not show an avatar or a stand-in picture.', style: body(14, p.tx2, height: 21)),
        const SizedBox(height: 8),
        Text('When it is available it will use only a photo you choose, ask for its own permission, and label the result as AI-generated.', style: body(14, p.tx2, height: 21)),
        const SizedBox(height: 6),
        GlamButton('See it on me — not available yet', kind: GlamButtonKind.disabled, onTap: null)]))),
    ]);
  }
}

/// GL-209 — themed events directory (sample events from the design; verify details with the organiser).
class ThemedEventsScreen extends StatefulWidget {
  const ThemedEventsScreen({super.key, required this.controller});
  final EventDressController controller;
  @override State<ThemedEventsScreen> createState() => _ThemedEventsState();
}
class _ThemedEventsState extends State<ThemedEventsScreen> {
  String category = 'All';
  @override Widget build(BuildContext context) {
    final p = context.glam, c = widget.controller, events = themedEventsIn(category);
    return _EventPage(title: 'Themed events', step: 'SAMPLE EVENTS', headline: 'Themed events.',
      lead: 'Sample events for design only. Dates, venues and dress codes come from organisers and need verifying.',
      children: [
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [for (final k in kThemedCategories) Padding(padding: const EdgeInsets.only(right: 8), child: GlamChip(k, selected: k == category, onTap: () => setState(() => category = k)))])),
        const SizedBox(height: 8),
        for (final (i, e) in events.indexed) ...[Semantics(identifier: 'event-${e.id}', button: true, label: e.name, child: GlamCard(onTap: () { c.select(e); GlamNav.to(context, 'GL-210'); }, padding: const EdgeInsets.all(14), child: Row(children: [
          GlamPhoto(n: e.photo, width: 72, height: 72, radius: 16), const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(e.name, style: body(15, p.tx, w: FontWeight.w700)), const SizedBox(height: 2),
            Text('${formatDayYear(e.date)} · ${e.location}', style: body(12, p.tx2, height: 18)), const SizedBox(height: 2),
            Text(e.theme, style: body(12, p.ac2, w: FontWeight.w700))])),
          Text('›', style: body(20, p.tx2))]))),
          if (FixtureScope.of(context) && i == 1) const CardAdSlot(adsDesigner)],
        if (FixtureScope.of(context) && events.length == 1) const CardAdSlot(adsDesigner),
        if (events.isEmpty) Text('No events in this category.', style: body(14, p.tx2)),
        GlamCard(onTap: () => GlamNav.to(context, 'GL-057'), child: Row(children: [Text('＋', style: body(22, p.ac2)), const SizedBox(width: 14),
          Expanded(child: Text('Add my own event', style: body(15, p.tx, w: FontWeight.w700))), Text('›', style: body(20, p.tx2))])),
      ],
      actions: [GlamButton('Add my own event', kind: GlamButtonKind.ghost, onTap: () => GlamNav.to(context, 'GL-057'))]);
  }
}

/// GL-210 — themed event detail: facts, host dress code, preparation timeline, where to buy / get makeup done, and the dress-up entry.
class ThemedEventDetailScreen extends StatelessWidget {
  const ThemedEventDetailScreen({super.key, required this.controller});
  final EventDressController controller;
  @override Widget build(BuildContext context) => AnimatedBuilder(animation: controller, builder: (context, _) {
    final p = context.glam, inset = MediaQuery.paddingOf(context), e = controller.selectedEvent, today = controller.today, preset = e.toBrief();
    final days = daysToGo(today, e.date), plan = planFor(preset, today);
    Widget fact(String k, String v) => Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(width: 92, child: Text(k, style: body(12, p.tx2, w: FontWeight.w700, ls: .5))), Expanded(child: Text(v, style: body(14, p.tx, height: 20)))]));
    return Scaffold(backgroundColor: p.bg, body: Stack(children: [
      ListView(padding: EdgeInsets.only(bottom: 220 + inset.bottom), children: [
        SizedBox(height: 300, child: Stack(fit: StackFit.expand, children: [
          GlamPhoto(n: e.photo, height: 300), const Scrim(fraction: .7),
          Positioned(left: 22, right: 22, bottom: 18, child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Kicker(e.theme, color: GlamPalette.blush, bottom: 6), Text(e.name, style: display(30, 33, GlamPalette.onPhoto, ls: -.6))]))])),
        Padding(padding: const EdgeInsets.fromLTRB(22, 14, 22, 0), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          GlamCard(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8), child: Column(children: [
            fact('DATE', '${formatDayYear(e.date)} · ${countdown(days)}'), fact('LOCATION', e.location), fact('THEME', e.theme), fact('DRESS CODE', e.hostDressCode)])),
          Text('Sample event from the design. Confirm the date, venue and dress code with the organiser.', style: body(12, p.tx2, height: 18)),
          if (e.tips.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 14), child: Kicker('Good to know')),
          if (e.tips.isNotEmpty) GlamCard(color: p.sf2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [for (final t in e.tips) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('• $t', style: body(14, p.tx, height: 21)))])),
          const Padding(padding: EdgeInsets.only(top: 6), child: Kicker('Preparation timeline')),
          if (plan.isEmpty) Text('This event has passed.', style: body(14, p.tx2)) else GlamCard(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4), child: Column(children: [
            for (final (i, it) in plan.indexed) Container(constraints: const BoxConstraints(minHeight: 48), padding: const EdgeInsets.symmetric(vertical: 8), decoration: BoxDecoration(border: i == plan.length - 1 ? null : Border(bottom: BorderSide(color: p.ln))),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [SizedBox(width: 74, child: Text(formatDay(it.due), style: body(12, p.ac2, w: FontWeight.w700, height: 20))), Expanded(child: Text(it.title, style: body(14, p.tx, height: 20)))]))])),
          if (FixtureScope.of(context)) const CardAdSlot(adsDesigner),
          SourcingSections(controller: controller, brief: preset),
          TryOnSection(controller: controller, garments: tryOnGarments(directionsFor(e.toBrief())[0]), occasion: e.name),
        ])),
      ]),
      GlamTray(child: Column(mainAxisSize: MainAxisSize.min, children: [
        GlamButton('Dress for this event', id: 'event-dress', onTap: () { controller.applyThemed(e); GlamNav.to(context, 'GL-063'); }),
        GlamButton('Edit details first', kind: GlamButtonKind.ghost, onTap: () { controller.applyThemed(e); GlamNav.to(context, 'GL-057'); })])),
      GlamTopBar(title: '', onBack: () => Navigator.of(context).maybePop(), onPhoto: true),
    ]));
  });
}


List<Map<String, String>> tryOnGarments(Direction d) =>
  [for (final x in d.pieces.take(6)) {'label': x.label.length > 80 ? x.label.substring(0, 80) : x.label, 'category': 'other'}];

String tryOnMessage(String? code) => switch (code) {
  'sign_in_required' => 'Sign in to see an outfit on you.',
  'eligibility_required' => 'This needs an account that is confirmed as eligible.',
  'explicit_consent_required' => 'Tick the permission boxes to continue.',
  'photo_required' => 'Choose a photo first.',
  'outfit_required' => 'Say what you want to try on first.',
  'tryon_insufficient_credits' || 'request_rejected' => 'You do not have enough GLAM AI credits for this preview.',
  'rate_limited' => 'You have reached the hourly limit. Try again later.',
  'still_processing' => 'Still working. You can check again or cancel.',
  'tryon_provider_rejected' => 'The service could not create a preview from this photo. You were not charged.',
  'tryon_outcome_ambiguous' || 'tryon_provider_timeout' => 'The service did not confirm a result. You were not charged.',
  'service_unavailable' => 'The service is not available right now.',
  null => '',
  _ => 'Something went wrong. You were not charged. Try again.',
};

/// "See it on you". Shows the honest "not available" card unless the server reports the service configured.
/// Never draws an avatar or stand-in image: the only picture shown is a server-generated result of the user's own photo.
class TryOnSection extends StatefulWidget {
  const TryOnSection({super.key, required this.controller, required this.garments, this.occasion = ''});
  final EventDressController controller;
  final List<Map<String, String>> garments;
  final String occasion;
  @override State<TryOnSection> createState() => _TryOnSectionState();
}
class _TryOnSectionState extends State<TryOnSection> {
  bool storage = false, tryOn = false;
  TryOnController? get t => widget.controller.tryOn;
  @override void initState() { super.initState(); t?.addListener(_changed); if (t?.phase == 'unknown') t!.check(); }
  @override void dispose() { t?.removeListener(_changed); super.dispose(); }
  void _changed() { if (mounted) setState(() {}); }
  String get _occasion { final o = widget.occasion.trim(); return o.isEmpty ? 'Event outfit' : (o.length > 80 ? o.substring(0, 80) : o); }
  @override Widget build(BuildContext context) {
    final c = t;
    if (c == null || c.phase == 'unknown' || c.phase == 'unavailable') return const TryOnStatusCard();
    final p = context.glam;
    Widget check(String id, bool v, ValueChanged<bool> on, String label) => Semantics(identifier: id, checked: v, child: InkWell(onTap: c.busy ? null : () => on(!v),
      child: Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(v ? Icons.check_box : Icons.check_box_outline_blank, color: p.ac2), const SizedBox(width: 10), Expanded(child: Text(label, style: body(14, p.tx, height: 21)))]))));
    final err = tryOnMessage(c.error);
    final body_ = switch (c.phase) {
      'consent' => [
        Text('Choose a photo of yourself that you are allowed to use. It is stored privately, sent to the image service only to make this preview, and you can delete it any time.', style: body(14, p.tx2, height: 21)),
        const SizedBox(height: 8), Text(c.policy!.content, maxLines: 6, overflow: TextOverflow.ellipsis, style: body(12, p.tx2, height: 18)),
        const SizedBox(height: 8),
        GlamButton(!c.hasPhoto ? 'Choose a photo' : 'Photo chosen — change', id: 'tryon-photo', kind: GlamButtonKind.ghost, onTap: c.busy ? null : c.choosePhoto),
        if (!c.storageGranted) check('tryon-consent-storage', storage, (v) => setState(() => storage = v), 'I allow GLAM to store this photo privately for my previews.'),
        check('tryon-consent-generate', tryOn, (v) => setState(() => tryOn = v), 'I allow this photo to be sent to an image-generation service to create an AI-generated preview of me in this outfit.'),
        if (c.quote != null) Text('Uses ${c.quote!.units} GLAM AI credits only if a preview is created.', style: body(12, p.tx2, height: 18)),
        const SizedBox(height: 8),
        GlamButton('Create my preview', id: 'tryon-submit',
          kind: c.hasPhoto && tryOn && (c.storageGranted || storage) ? GlamButtonKind.primary : GlamButtonKind.disabled,
          onTap: c.busy || !c.hasPhoto || !tryOn || !(c.storageGranted || storage) ? null : () => c.submit(storageChecked: storage || c.storageGranted, tryOnChecked: tryOn, occasion: _occasion, garments: widget.garments)),
      ],
      'submitting' || 'processing' => [
        Text(c.phase == 'submitting' ? 'Sending your request…' : 'Creating your preview…', style: display(22, 26, p.tx)),
        const SizedBox(height: 6), Text('This can take a minute. If it fails or you cancel, you are not charged.', style: body(14, p.tx2, height: 21)),
        const SizedBox(height: 8), if (c.phase == 'processing' && err.isNotEmpty) GlamButton('Check again', id: 'tryon-refresh', kind: GlamButtonKind.ghost, onTap: c.busy ? null : c.refresh),
        if (c.job != null) GlamButton('Cancel', id: 'tryon-cancel', kind: GlamButtonKind.ghost, onTap: c.busy && c.phase == 'submitting' ? null : c.remove),
      ],
      'done' => [
        Semantics(identifier: 'tryon-result', image: true, label: 'AI-generated preview of you in this outfit', child: ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.memory(c.result!, fit: BoxFit.cover, gaplessPlayback: true))),
        const SizedBox(height: 8),
        Semantics(identifier: 'tryon-label', child: Text(c.syntheticTest ? 'TEST OUTPUT — not a real try-on' : 'AI-generated preview', style: body(13, p.ac2, w: FontWeight.w700))),
        Text('Not a guarantee of fit or of how the outfit will look in person. Only you can see this. Saving or sharing it is up to you.', style: body(12, p.tx2, height: 18)),
        const SizedBox(height: 8), GlamButton('Delete this preview', id: 'tryon-delete', kind: GlamButtonKind.ghost, onTap: c.busy ? null : c.remove),
      ],
      'failed' || 'cancelled' => [
        Text(c.phase == 'cancelled' ? 'Cancelled. You were not charged.' : 'No preview was made', style: display(22, 26, p.tx)),
        if (c.phase == 'failed') Text(err, style: body(14, p.tx2, height: 21)),
        const SizedBox(height: 8), GlamButton('Start again', id: 'tryon-restart', kind: GlamButtonKind.ghost, onTap: () => c.reset(keepAvailability: true)),
      ],
      _ => [
        Text('See this outfit on you', style: display(22, 26, p.tx)), const SizedBox(height: 6),
        Text('Uses a photo you choose, asks for its own permission, and shows the result labelled as an AI-generated preview. It is never an avatar.', style: body(14, p.tx2, height: 21)),
        const SizedBox(height: 8), GlamButton('See it on me', id: 'tryon-begin', onTap: c.busy ? null : c.begin),
      ],
    };
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(padding: EdgeInsets.only(top: 14), child: Kicker('See it on you')),
      Semantics(identifier: 'tryon-status', container: true, child: GlamCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ...body_,
        if (err.isNotEmpty && !['failed', 'processing'].contains(c.phase)) Padding(padding: const EdgeInsets.only(top: 8), child: Text(err, style: body(13, p.ac2, w: FontWeight.w700))),
      ]))),
    ]);
  }
}
