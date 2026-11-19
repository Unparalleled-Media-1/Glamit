import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../design/analyze_widgets.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../events/event_controller.dart';
import '../shell/nav.dart';
import 'event_dress.dart';

const _categories = [('Dress', 'dress'), ('Top', 'top'), ('Bottom', 'bottom'), ('Suit', 'suit'), ('Outerwear', 'outerwear'), ('Headwear', 'headwear'), ('Other', 'other')];

/// FB-02 — virtual fitting room. A garment you describe, shown on a photo you choose, through the same consented,
/// server-generated try-on as the event journey. When the service is not connected the honest card is shown;
/// there is no avatar, simulation or stand-in image anywhere on this screen.
class FittingRoomScreen extends StatefulWidget {
  const FittingRoomScreen({super.key, required this.controller});
  final EventDressController controller;
  @override State<FittingRoomScreen> createState() => _FittingRoomState();
}
class _FittingRoomState extends State<FittingRoomScreen> {
  final label = TextEditingController();
  String category = 'dress';
  @override void dispose() { label.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) {
    final p = context.glam, inset = MediaQuery.paddingOf(context);
    final text = label.text.trim();
    final garments = text.isEmpty ? const <Map<String, String>>[] : [{'label': text.length > 80 ? text.substring(0, 80) : text, 'category': category}];
    return Scaffold(backgroundColor: p.bg, resizeToAvoidBottomInset: false, body: Stack(children: [
      ListView(keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag, padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 40 + inset.bottom + MediaQuery.viewInsetsOf(context).bottom), children: [
        const Kicker('FITTING ROOM'),
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('Try it on.', style: display(40, 42, p.tx, ls: -1.2))),
        Text('Describe what you want to try on, then see it on a photo of you that you choose. The result is an AI-generated preview, never an avatar.', style: body(15, p.tx2, height: 23)),
        Padding(padding: const EdgeInsets.only(top: 16, bottom: 7), child: Text('What are you trying on?', style: body(13, p.tx, w: FontWeight.w700))),
        Semantics(identifier: 'fitting-garment', textField: true, label: 'What are you trying on?', child: TextField(controller: label, onChanged: (_) => setState(() {}), maxLength: 80, style: body(16, p.tx), textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(hintText: 'e.g. emerald satin evening gown', hintStyle: body(16, p.tx2), filled: true, fillColor: p.sf2, counterText: '', contentPadding: const EdgeInsets.all(14),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.ln)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.ln)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.ac2, width: 2))))),
        Padding(padding: const EdgeInsets.only(top: 12), child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
          for (final c in _categories) Padding(padding: const EdgeInsets.only(right: 8), child: GlamChip(c.$1, selected: category == c.$2, onTap: () => setState(() => category = c.$2)))]))),
        TryOnSection(controller: widget.controller, garments: garments, occasion: 'Fitting room'),
        Padding(padding: const EdgeInsets.only(top: 14), child: GlamButton('Event dress code ›', id: 'fitting-event', kind: GlamButtonKind.ghost, onTap: () => GlamNav.to(context, 'GL-210'))),
      ]),
      GlamTopBar(title: 'Fitting room', onBack: () => context.canPop() ? context.pop() : GlamNav.to(context, 'home')),
    ]));
  }
}
