import 'package:flutter/material.dart';
import '../data/fixtures.dart';
import '../design/photo.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../shell/nav.dart';
import 'state_overlay.dart';

/// Design ID GL-117 — Profile overview (s4.jsx `Profile`).
/// The signed-in name/plan are not read from the account yet (Batch 2 wires
/// Supabase identity); the design's guest copy is shown instead.
class ProfileOverviewScreen extends StatelessWidget {
  const ProfileOverviewScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    final used = credits.remaining / credits.monthly;
    void go(String id) => GlamNav.to(context, id);
    return ScreenStateGate(child: ColoredBox(color: p.bg, child: ListView(padding: const EdgeInsets.fromLTRB(22, 4, 22, 0), children: [
      Padding(padding: const EdgeInsets.only(bottom: 10), child: Row(children: [
        const GlamPhoto(n: 3, width: 72, height: 72, radius: 36),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Your space.', style: display(28, 30, p.tx)),
          Text('Guest · Personal', style: body(12, p.tx2, height: 18)),
        ])),
        GlassIconButton(glyph: '⇄', label: 'Switch role', blur: false, fill: p.sf2, color: p.tx, id: 'profile-roles', onTap: () => go('GL-202')),
      ])),
      GlamCard(onTap: () => go('GL-126'), label: 'AI credits, ${credits.remaining} of ${credits.monthly} this month', child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('AI credits', style: body(15, p.tx, w: FontWeight.w700)), Text('Free plan', style: body(12, p.tx2, height: 18)),
        ]),
        Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text.rich(TextSpan(children: [
          TextSpan(text: '${credits.remaining} ', style: display(34, 40, p.tx)),
          TextSpan(text: 'of ${credits.monthly} this month', style: body(12, p.tx2)),
        ]))),
        GlamBar(used),
      ])),
      GlamCard(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4), child: Column(children: [
        GlamRow(glyph: '✦', title: 'My beauty plans', subtitle: 'Transformations & progress', onTap: () => go('TP-12')),
        GlamRow(glyph: '♡', title: 'Saved looks & collections', onTap: () => go('GL-120')),
        GlamRow(glyph: '◎', title: 'Analysis history', onTap: () => go('GL-121')),
        GlamRow(glyph: '○', title: 'Edit profile', onTap: () => go('GL-118')),
        GlamRow(glyph: '⌂', title: 'Wardrobe & routines', onTap: () => go('GL-122')),
        GlamRow(glyph: '☰', title: 'Orders & bookings', last: true, onTap: () => go('GL-123')),
      ])),
      GlamCard(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4), child: Column(children: [
        GlamRow(glyph: '✧', title: 'Subscription', subtitle: 'Free · Upgrade', onTap: () => go('GL-124')),
        GlamRow(glyph: '↻', title: 'Manage plan', onTap: () => go('GL-125')),
        GlamRow(glyph: '♢', title: 'Notifications', onTap: () => go('GL-129')),
        GlamRow(glyph: '✎', title: 'Beauty preferences', onTap: () => go('GL-119')),
        GlamRow(glyph: '▣', title: 'Billing & payment methods', onTap: () => go('GL-128')),
        GlamRow(glyph: '◌', title: 'Privacy & security', last: true, onTap: () => go('GL-130')),
      ])),
      const SizedBox(height: 100),
    ])));
  }
}
