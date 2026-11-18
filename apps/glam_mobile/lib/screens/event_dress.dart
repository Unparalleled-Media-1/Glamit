import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../design/analyze_widgets.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../events/event_brief.dart';
import '../events/event_controller.dart';
import '../shell/nav.dart';

const _notice = 'Rule-based inspiration from the choices you make here — not an AI result, and nothing is uploaded or saved on a server. Products, prices, stock and weather are not checked.';

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
