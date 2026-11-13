import 'package:flutter/material.dart';
import '../analysis/contracts.dart';
import '../analysis/controller.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../main.dart' show PrivatePhoto, ReportScreen;
import 'pending.dart';

const kMedical = 'Cosmetic styling observations only — not a medical diagnosis.';
const _titles = {'face-shape': 'Face shape', 'eyes': 'Eyes', 'brows': 'Brows', 'lips': 'Lips', 'undertone': 'Undertone'};
const _glyphs = {'face-shape': '◎', 'eyes': '◉', 'brows': '⌒', 'lips': '◡', 'undertone': '✧'};
String findingTitle(String key) => _titles[key] ?? key.replaceAll('-', ' ');
String findingGlyph(String key) => _glyphs[key] ?? '◎';
String certaintyLabel(Finding f) => f.userCorrected ? 'Your correction' : switch (f.certainty) {
  'supported' => 'Supported', 'tentative' => 'Tentative', _ => 'Not enough evidence' };

Widget _photoHero(AnalyzeController c, double h, {double dim = 0}) => Positioned(top: 0, left: 0, right: 0, height: h, child: Stack(fit: StackFit.expand, children: [
  if (c.photo != null) PrivatePhoto(bytes: c.photo!, fit: BoxFit.cover)
  else const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(colors: [Color(0xff45333e), Color(0xff0f0e10)], radius: .9))),
  if (dim > 0) ColoredBox(color: Color.fromRGBO(0, 0, 0, dim)),
  const Scrim(fraction: .45)]));

/// Shared plain-screen frame: back bar, scrolling body.
class _Page extends StatelessWidget {
  const _Page({required this.title, required this.children});
  final String title; final List<Widget> children;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), inset = MediaQuery.paddingOf(context);
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      ListView(padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 24 + inset.bottom), children: children),
      GlamTopBar(title: title, onBack: () => Navigator.of(context).maybePop()),
    ]));
  }
}

/// GL-027: one finding with its uncertainty and the correction control.
class FindingDetailScreen extends StatelessWidget {
  const FindingDetailScreen({super.key, required this.controller, required this.findingKey});
  final AnalyzeController controller; final String findingKey;
  @override Widget build(BuildContext context) => AnimatedBuilder(animation: controller, builder: (context, _) {
    final t = GlamTokens.of(context), report = controller.report;
    final f = report?.findings.where((x) => x.key == findingKey).firstOrNull;
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      _photoHero(controller, 420),
      ListView(padding: EdgeInsets.fromLTRB(22, 440, 22, 24 + MediaQuery.paddingOf(context).bottom), children: [
        if (f == null) Text('This record is no longer available.', style: GlamType.body(15, height: 23, color: t.tx2)) else ...[
          Kick(findingTitle(f.key)),
          Text(f.value ?? 'Not enough evidence', style: GlamType.display(34, height: 38, spacing: -.8, color: t.tx)),
          Padding(padding: const EdgeInsets.only(top: 12, bottom: 4), child: Text(certaintyLabel(f), style: GlamType.body(13, w: FontWeight.w700, color: t.ac2))),
          Text(f.uncertainty, style: GlamType.body(15, height: 23, color: t.tx2)),
          Padding(padding: const EdgeInsets.symmetric(vertical: 14), child: Text('$kMedical Tap correct to say what you see; your correction is kept separately from the observation.', style: GlamType.body(12, height: 18, color: t.tx2))),
          PillButton('Correct this observation', kind: controller.busy ? BtnKind.disabled : BtnKind.primary, onTap: () => ReportScreen.edit(context, controller, f)),
          if (f.userCorrected) PillButton('Reset to observation', kind: BtnKind.ghost, onTap: controller.busy ? null : () => controller.correct(f.key, null)),
        ],
      ]),
      GlamTopBar(title: f == null ? 'Observation' : findingTitle(f.key), onGlass: true, onBack: () => Navigator.of(context).maybePop()),
    ]));
  });
}

/// GL-028/029/031/032 honest state for modes the service does not provide.
class UnavailableModeScreen extends StatelessWidget {
  const UnavailableModeScreen({super.key, required this.title, required this.headline, required this.what});
  final String title, headline, what;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return _Page(title: title, children: [
      Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(headline, style: GlamType.display(40, height: 42, spacing: -1.2, color: t.tx))),
      GlamCard(color: t.sf2, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Kick('Not available yet'),
        Text(what, style: GlamType.body(15, height: 23, color: t.tx))])),
      Text('Nothing is estimated or shown as a placeholder result. $kMedical', style: GlamType.body(12, height: 18, color: t.tx2)),
    ]);
  }
}
UnavailableModeScreen skinScreen() => const UnavailableModeScreen(title: 'Skin appearance', headline: 'Skin, soon.',
  what: 'The analysis service currently reports face features and undertone only. Skin appearance observations will appear here once it supports them.');
UnavailableModeScreen hairScreen() => const UnavailableModeScreen(title: 'Hair type', headline: 'Hair, soon.',
  what: 'Hair type and texture are not reported by the analysis service yet, so no hairstyle or colour ideas are shown.');
UnavailableModeScreen routineScreen() => const UnavailableModeScreen(title: 'My routine', headline: 'A routine of\nyour own.',
  what: 'Routines are built from skin observations, which the service does not provide yet.');

/// GL-030: style directions that the report actually returned.
class DirectionsScreen extends StatefulWidget {
  const DirectionsScreen({super.key, required this.controller});
  final AnalyzeController controller;
  @override State<DirectionsScreen> createState() => _DirectionsState();
}
class _DirectionsState extends State<DirectionsScreen> {
  int i = 0;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), c = widget.controller, ds = c.report?.directions ?? const [];
    final d = ds.isEmpty ? null : ds[i.clamp(0, ds.length - 1)];
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      _photoHero(c, 470),
      Positioned(left: 22, right: 22, top: 470 - 120, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Kick('From your analysis', color: kHeroKick),
        Text(d?.title ?? 'No directions yet', style: GlamType.display(34, height: 38, spacing: -.8, color: kHeroText))])),
      Positioned.fill(top: 470, child: ListView(padding: EdgeInsets.fromLTRB(0, 8, 0, 24 + MediaQuery.paddingOf(context).bottom), children: [
        if (ds.length > 1) Padding(padding: const EdgeInsets.only(bottom: 10), child: SizedBox(height: 44, child: ChipRow(items: [for (var k = 0; k < ds.length; k++) '${k + 1}. ${ds[k].title}'],
          value: '${i + 1}. ${ds[i].title}', onChanged: (v) => setState(() => i = int.parse(v.split('.').first) - 1)))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 22), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(d?.rationale ?? 'This report did not include style directions.', style: GlamType.body(15, height: 23, color: t.tx2)),
          Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text('Directions are inspiration, not verified products. $kMedical', style: GlamType.body(12, height: 18, color: t.tx2))),
          PillButton('More options', onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => SaveShareScreen(controller: c)))),
          PillButton('Hairstyle ideas', kind: BtnKind.ghost, onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => hairScreen()))),
        ])),
      ])),
      GlamTopBar(title: 'Style directions', onGlass: true, onBack: () => Navigator.of(context).maybePop()),
    ]));
  }
}

/// GL-034: what next. Only the real save is live; the rest say why they are not.
class SaveShareScreen extends StatelessWidget {
  const SaveShareScreen({super.key, required this.controller});
  final AnalyzeController controller;
  @override Widget build(BuildContext context) => AnimatedBuilder(animation: controller, builder: (context, _) {
    final t = GlamTokens.of(context), inset = MediaQuery.paddingOf(context);
    void pending(String id) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => PendingScreen(id: id, go: (_) {})));
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      _photoHero(controller, MediaQuery.sizeOf(context).height, dim: .5),
      GlamTray(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('What next?', style: GlamType.display(26, height: 30, spacing: -.6, color: t.tx))),
        GlamRow(glyph: '♡', title: controller.saved ? 'Saved to your account' : 'Save to Style Passport', subtitle: 'Your observations and corrections',
          onTap: controller.busy || controller.saved || controller.report == null ? null : () async { await controller.save(); }),
        GlamRow(glyph: '↗', title: 'Share', subtitle: 'Not available yet — nothing leaves your account', onTap: null),
        GlamRow(glyph: '✧', title: 'Continue in Studio', onTap: () => pending('GL-037')),
        GlamRow(glyph: '☰', title: 'Shop what suits me', last: true, onTap: () => pending('GL-052')),
      ])),
      Positioned(top: inset.top + 6, left: 14, child: GlassCircle(glyph: '✕', label: 'Close', onTap: () => Navigator.of(context).maybePop())),
    ]));
  });
}

/// GL-033: real server history in the design's list layout.
class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key, required this.controller});
  final AnalyzeController controller;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context), inset = MediaQuery.paddingOf(context);
    return Scaffold(backgroundColor: t.bg, body: Stack(children: [
      RefreshIndicator(onRefresh: controller.loadHistory, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: EdgeInsets.fromLTRB(22, inset.top + 68, 22, 24 + inset.bottom), children: [
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('Your analyses.', style: GlamType.display(40, height: 42, spacing: -1.2, color: t.tx))),
        if (controller.pending != null) PillButton('Resume previous request', kind: controller.busy ? BtnKind.disabled : BtnKind.ghost, onTap: controller.resume),
        if (controller.history.isEmpty) GlamCard(child: Column(children: [
          Text('No analysis records', style: GlamType.display(22, color: t.tx)), const SizedBox(height: 8),
          Text('New analyses appear here after the server accepts them. Run another to compare changes over time.', textAlign: TextAlign.center, style: GlamType.body(12, height: 18, color: t.tx2))])),
        for (final job in controller.history) GlamCard(onTap: controller.busy ? null : () => controller.openHistory(job.id), child: Row(children: [
          Container(width: 64, height: 64, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center,
            child: Text(controller.selectedReportId == job.id ? '♡' : '◎', style: GlamType.body(22, color: t.ac2))),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(MaterialLocalizations.of(context).formatFullDate(job.created.toLocal()), style: GlamType.body(15, w: FontWeight.w700, color: t.tx)),
            Text(controller.selectedReportId == job.id ? 'Saved to Style Passport · ${job.state}' : job.state, style: GlamType.body(12, height: 18, color: t.tx2))])),
          Text('›', style: GlamType.body(20, color: t.tx2))])),
      ])),
      GlamTopBar(title: 'History', onBack: controller.backToCapture),
      Positioned(top: inset.top + 6, right: 14, child: GlassCircle(glyph: '↻', label: 'Refresh analysis history', solid: t.sf2, solidFg: t.tx, onTap: controller.busy ? null : controller.loadHistory)),
    ]));
  }
}
