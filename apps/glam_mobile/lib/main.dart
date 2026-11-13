import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter/semantics.dart';
import 'package:http/http.dart' as http;
import 'analysis/controller.dart';
import 'analysis/contracts.dart';
import 'analysis/repository.dart';
import 'core/config.dart';
import 'core/session.dart';
import 'core/transport.dart';
import 'presentation/camera_surface.dart';
import 'presentation/design.dart';
import 'design/tokens.dart';
import 'design/widgets.dart';
import 'screens/analyze_intro.dart';
import 'screens/analyze_results.dart';
import 'screens/tabs.dart';

void main() { WidgetsFlutterBinding.ensureInitialized(); runApp(const AnalyzeApp()); }
class AnalyzeApp extends StatefulWidget {
  const AnalyzeApp({super.key, this.controller});
  final AnalyzeController? controller;
  @override State<AnalyzeApp> createState() => _AnalyzeAppState();
}
class _AnalyzeAppState extends State<AnalyzeApp> with WidgetsBindingObserver {
  final navigator = GlobalKey<NavigatorState>();
  late final AnalyzeController controller;
  late final Transport transport;
  late final SemanticsHandle semantics;
  bool obscured = false;
  @override void initState() {
    super.initState(); WidgetsBinding.instance.addObserver(this);
    semantics = WidgetsBinding.instance.ensureSemantics();
    transport = Transport(http.Client());
    const config = MobileConfig(); final vault = DeviceVault();
    final session = Session(config, transport, vault);
    controller = widget.controller ?? AnalyzeController(AnalysisRepository(config, session, transport), session, vault);
  }
  @override void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive) setState(() => obscured = true);
    if (state == AppLifecycleState.paused) {
      controller.lock(); navigator.currentState?.popUntil((route) => route.isFirst);
      PaintingBinding.instance.imageCache.clear(); PaintingBinding.instance.imageCache.clearLiveImages();
    }
    if (state == AppLifecycleState.resumed) setState(() => obscured = false);
  }
  @override void dispose() {
    WidgetsBinding.instance.removeObserver(this); semantics.dispose();
    if (widget.controller == null) controller.dispose(); transport.dispose(); super.dispose();
  }
  void _journey(CaptureStart how, {bool history = false}) {
    final nav = navigator.currentState!;
    nav.push(MobileDesign.route(nav.context, AnalyzeJourney(controller: controller, start: how)));
    if (history && controller.session.authenticated) controller.loadHistory();
  }
  /// Design ids whose real behaviour lives in hand-built screens (never replaced by sample-content renderings).
  bool _openHand(String id) {
    final nav = navigator.currentState!;
    switch (id) {
      case 'GL-018':
        nav.push(MobileDesign.route(nav.context, ChooseAnalysisScreen(onContinue: () => nav.push(MobileDesign.route(nav.context, PrepareScreen(onStart: (how) => _journey(how)))))));
      case 'GL-019': nav.push(MobileDesign.route(nav.context, PrepareScreen(onStart: (how) => _journey(how))));
      case 'GL-020' || 'GL-023' || 'GL-024' || 'GL-025': _journey(CaptureStart.camera);
      case 'GL-026' || 'GL-027' || 'GL-028' || 'GL-029' || 'GL-030' || 'GL-031' || 'GL-032' || 'GL-033' || 'GL-034': _journey(CaptureStart.idle, history: true);
      default: return false;
    }
    return true;
  }
  @override Widget build(BuildContext context) => MaterialApp(navigatorKey: navigator, title: 'GLAM Beauty',
    debugShowCheckedModeBanner: false, theme: MobileDesign.theme(dark: false), darkTheme: MobileDesign.theme(), themeMode: ThemeMode.system,
    home: GlamShell(openAnalyze: ({required bool history}) {
      final nav = navigator.currentState!;
      if (history) { _journey(CaptureStart.idle, history: true); return; }
      nav.push(MobileDesign.route(nav.context, ChooseAnalysisScreen(onContinue: () =>
        nav.push(MobileDesign.route(nav.context, PrepareScreen(onStart: (how) => _journey(how))))))); }, openHand: _openHand), builder: (context, child) => Stack(children: [
      child!, if (obscured) Positioned.fill(child: ColoredBox(color: Theme.of(context).scaffoldBackgroundColor)),
    ]));
}
class AnalyzeJourney extends StatefulWidget {
  const AnalyzeJourney({super.key, required this.controller, this.start = CaptureStart.idle});
  final AnalyzeController controller;
  final CaptureStart start;
  @override State<AnalyzeJourney> createState() => _AnalyzeJourneyState();
}
class _AnalyzeJourneyState extends State<AnalyzeJourney> {
  final featureNavigator = GlobalKey<NavigatorState>();
  AnalyzeController get controller => widget.controller;
  Page<void> page(String key, Widget child) => Theme.of(context).platform == TargetPlatform.iOS
    ? CupertinoPage<void>(key: ValueKey(key), child: child)
    : MaterialPage<void>(key: ValueKey(key), child: child);
  Future<void> _account(BuildContext context) async {
    if (controller.session.authenticated) {
      final removing = ValueNotifier(false);
      try { await MobileDesign.sheet<void>(context, Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Your account', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)), const SizedBox(height: 12),
        const Text('Private analysis is scoped to your signed-in account.'), const SizedBox(height: 20),
        ValueListenableBuilder<bool>(valueListenable: removing, builder: (_, busy, _) => FilledButton(onPressed: busy ? null : () async {
          if (removing.value) return; removing.value = true;
          String? notice;
          try { final revoked = await controller.session.signOut(); if (!revoked) notice = 'This device is cleared. Server sign-out could not be confirmed.'; }
          on Failure catch (e) { notice = message(e.code); }
          controller.lock();
          if (context.mounted) {
            if (Navigator.of(context, rootNavigator:true).canPop()) Navigator.of(context, rootNavigator:true).pop();
            if (notice != null) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(notice)));
          }
        }, child: Text(busy ? 'Removing session…' : 'Sign out on this device'))),
      ])); } finally { removing.dispose(); }
    } else { await MobileDesign.sheet<void>(context, SignInSheet(controller: controller)); }
  }
  Future<void> _analyze(BuildContext context) async {
    if (!controller.session.authenticated) { await _account(context); if (!context.mounted || !controller.session.authenticated) return; }
    await controller.policies();
  }
  @override Widget build(BuildContext context) => AnnotatedRegion<SystemUiOverlayStyle>(value: SystemUiOverlayStyle.light,
    child: Scaffold(body: AnimatedBuilder(animation: controller, builder: (context, _) {
      Widget content;
      switch (controller.phase) {
        case 'capture': content = const SizedBox.shrink();
        case 'photo':
          content = PhotoReview(photo: controller.photo!, busy: controller.busy, onRetake: controller.retake, onAnalyze: () => _analyze(context));
        case 'consent': content = ConsentScreen(controller: controller);
        case 'report': content = ReportScreen(controller: controller);
        case 'history': content = AnalysisHistory(controller:controller);
        default: content = _status(context);
      }
      final camera = CameraSurface(start: widget.start, onClose: () { controller.backToCapture(); Navigator.of(context, rootNavigator: true).maybePop(); }, onPhoto: controller.select, onAccount: () => _account(context),
        onSaved: () async {
          if (!controller.session.authenticated) await _account(context);
          if (context.mounted && controller.session.authenticated) await controller.loadHistory();
        });
      return Stack(children: [NavigatorPopHandler<Object?>(
        onPopWithResult: (_) => featureNavigator.currentState?.pop(),
        child: Navigator(key: featureNavigator,
          pages: [page('camera', camera), if (controller.phase != 'capture') page('analyze-flow', Scaffold(body: content))],
          onDidRemovePage: (removed) {
            if (removed.key == const ValueKey('analyze-flow') && controller.phase != 'capture') controller.backToCapture();
          })),
        if (controller.error != null) Align(alignment: Alignment.topCenter, child: SafeArea(child: Padding(padding: const EdgeInsets.all(12),
          child: Material(color: const Color(0xff44303d), borderRadius: BorderRadius.circular(16), child: Padding(padding: const EdgeInsets.all(16),
            child: Row(children: [const Icon(Icons.info_outline), const SizedBox(width: 12), Expanded(child: Text(message(controller.error)))])))))),
      ]);
    })));
  Widget _status(BuildContext context) {
    final phase = controller.phase;
    final title = switch (phase) {
      'uploading' => 'Uploading privately', 'submitting' => 'Requesting analysis', 'processing' => 'Your analysis is processing',
      'uncertain' => 'Confirm the previous request', 'expired' => 'This report has expired', 'deletion_requested' => 'Removal requested',
      'loading_history' => 'Loading your analysis', 'empty' => 'No saved analysis', _ => 'Analysis is not available',
    };
    final body = switch (phase) {
      'uncertain' => 'Your previous request may already exist. Resume checks it safely without starting a second analysis.',
      'deletion_requested' => 'The server accepted cancellation and removal. Physical deletion is handled separately by the retention service.',
      'empty' => 'Choose a photo to create your first analysis.',
      'expired' => 'The private report is no longer shown. Reload to confirm the current server state.',
      'processing' => 'You can reopen this request from your account after returning.',
      _ => 'Results appear only after the server confirms completion.',
    };
    final t = GlamTokens.of(context);
    final working = controller.busy || phase == 'processing';
    Widget action(String label, VoidCallback? on, [BtnKind kind = BtnKind.glass]) => PillButton(label, kind: on == null ? BtnKind.disabled : kind, onTap: on);
    final controls = Padding(padding: EdgeInsets.fromLTRB(22, 0, 22, 60 + MediaQuery.paddingOf(context).bottom), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Kick(working ? 'Analyzing' : 'Status', color: kHeroKick),
      Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(title, style: GlamType.display(26, height: 30, spacing: -.6, color: kHeroText))),
      Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(body, style: GlamType.body(15, height: 23, color: const Color(0xffe8d9e0)))),
      if (phase == 'loading_history' && !controller.busy) action('Reload history', controller.loadHistory),
      if (phase == 'uncertain') action('Resume previous request', controller.busy ? null : controller.confirmResume, BtnKind.primary),
      if (['processing','stopped','expired'].contains(phase)) action('Reload from account', controller.busy ? null : controller.resume),
      if (controller.job != null) action('Cancel and remove photo', controller.busy ? null : controller.remove, BtnKind.ghost),
      action('Return to camera', controller.backToCapture, BtnKind.ghost),
    ]));
    if (controller.photo == null) return ColoredBox(color: t.bg, child: Stack(fit: StackFit.expand, children: [if (working) const ScanLine(), Align(alignment: Alignment.bottomCenter, child: SingleChildScrollView(reverse: true, child: controls))]));
    return Stack(fit:StackFit.expand, children:[
      PrivatePhoto(bytes:controller.photo!, fit: BoxFit.cover),
      const ColoredBox(color: Color(0x8c000000)),
      const OvalGuide(),
      if (working) const ScanLine(),
      Align(alignment:Alignment.bottomCenter,child:ConstrainedBox(constraints:BoxConstraints(maxHeight:MediaQuery.sizeOf(context).height*.6),child:SingleChildScrollView(reverse:true,child:controls))),
    ]);
  }
}
class PhotoReview extends StatelessWidget {
  const PhotoReview({super.key, required this.photo, required this.busy, required this.onRetake, required this.onAnalyze});
  final Uint8List photo;
  final bool busy;
  final VoidCallback onRetake, onAnalyze;
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    return Semantics(identifier: 'native-photo-review', child: Stack(fit: StackFit.expand, children: [
      Positioned(top: 0, left: 0, right: 0, height: 480, child: PrivatePhoto(bytes: photo, fit: BoxFit.cover)),
      GlamTopBar(title: 'Photo check', onGlass: true, onBack: busy ? null : onRetake),
      GlamTray(top: 430, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.only(bottom: 6), child: Text('Photo ready.', style: GlamType.display(26, height: 30, spacing: -.6, color: t.tx))),
        Padding(padding: const EdgeInsets.only(bottom: 6), child: Text('Quality checks are not computed on this device. No analysis has started.', style: GlamType.body(12, height: 18, color: t.tx2))),
        for (final r in const [('Stored on', 'This device only'), ('Upload', 'Not started'), ('Analysis', 'Needs your permission')])
          Container(constraints: const BoxConstraints(minHeight: 46), padding: const EdgeInsets.symmetric(vertical: 8), decoration: BoxDecoration(border: Border(bottom: BorderSide(color: t.ln))),
            child: Row(children: [Expanded(child: Text(r.$1, style: GlamType.body(14, w: FontWeight.w600, color: t.tx))), Text(r.$2, style: GlamType.body(13, color: t.tx2))])),
        PillButton('Analyze this photo', kind: busy ? BtnKind.disabled : BtnKind.primary, onTap: onAnalyze),
        PillButton('Retake', kind: BtnKind.ghost, onTap: busy ? null : onRetake),
      ])),
    ]));
  }
}
class PrivatePhoto extends StatefulWidget {
  const PrivatePhoto({super.key, required this.bytes, this.fit = BoxFit.contain});
  final Uint8List bytes;
  final BoxFit fit;
  @override State<PrivatePhoto> createState() => _PrivatePhotoState();
}
class _PrivatePhotoState extends State<PrivatePhoto> {
  @override void didUpdateWidget(PrivatePhoto oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.bytes, widget.bytes)) unawaited(MemoryImage(oldWidget.bytes).evict());
  }
  @override void dispose() { unawaited(MemoryImage(widget.bytes).evict()); super.dispose(); }
  @override Widget build(BuildContext context) => Image.memory(widget.bytes, fit: widget.fit, excludeFromSemantics: true);
}
class SignInSheet extends StatefulWidget {
  const SignInSheet({super.key, required this.controller});
  final AnalyzeController controller;
  @override State<SignInSheet> createState() => _SignInSheetState();
}
class _SignInSheetState extends State<SignInSheet> {
  final email = TextEditingController(), password = TextEditingController();
  bool busy = false; String? error;
  @override void dispose() { password.clear(); password.dispose(); email.dispose(); super.dispose(); }
  Future<void> signIn() async {
    setState(() { busy = true; error = null; });
    try {
      await widget.controller.session.signIn(email.text, password.text);
      if (mounted) Navigator.of(context, rootNavigator: true).pop();
    } on Failure catch (e) { if (mounted) setState(() => error = e.code); }
    catch (_) { if (mounted) setState(() => error = 'sign_in_required'); }
    finally { if (mounted) { password.clear(); setState(() => busy = false); } }
  }
  @override Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const Text('Sign in for private analysis', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
    const SizedBox(height: 12),
    if (!widget.controller.session.config.authConfigured) Semantics(identifier: 'auth-unconfigured', container: true, child: const Text('Sign-in is unavailable in this build. Your photo has not been uploaded.'))
    else ...[
      const Text('Sign in to your existing account. Your photo will not upload until you approve the displayed policies.'), const SizedBox(height: 20),
      TextField(controller: email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.username], decoration: const InputDecoration(labelText: 'Email')),
      const SizedBox(height: 12), TextField(controller: password, obscureText: true, enableSuggestions: false, autocorrect: false,
        autofillHints: const [AutofillHints.password], decoration: const InputDecoration(labelText: 'Password')),
      const SizedBox(height: 20), FilledButton(onPressed: busy ? null : signIn, child: Text(busy ? 'Checking account…' : 'Sign in')),
    ],
    if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message(error))),
    TextButton(onPressed: busy ? null : () => Navigator.of(context, rootNavigator: true).pop(), child: const Text('Close sign-in')),
  ]);
}
class ConsentScreen extends StatefulWidget {
  const ConsentScreen({super.key, required this.controller});
  final AnalyzeController controller;
  @override State<ConsentScreen> createState() => _ConsentScreenState();
}
class _ConsentScreenState extends State<ConsentScreen> {
  bool storage = false, analysis = false;
  @override Widget build(BuildContext context) {
    final c = widget.controller, p = c.permissions!, t = GlamTokens.of(context);
    Widget policy(String title, String content, bool value, ValueChanged<bool> set, String agree) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(top: 6, bottom: 8), child: Text(title, style: GlamType.body(15, w: FontWeight.w700, color: t.tx))),
      Text(content, style: GlamType.body(15, height: 23, color: t.tx2)),
      Container(constraints: const BoxConstraints(minHeight: 56), child: Row(children: [GlamSwitch(on: value, label: agree, onChanged: c.busy ? null : set), const SizedBox(width: 14),
        Expanded(child: Text(agree, style: GlamType.body(14, height: 21, color: t.tx)))])),
    ]);
    return Stack(fit: StackFit.expand, children: [
      if (c.photo != null) PrivatePhoto(bytes: c.photo!, fit: BoxFit.cover),
      const ColoredBox(color: Color(0x8c000000)), // design: brightness(.45)
      GlamTray(top: 250 + MediaQuery.paddingOf(context).top * 0, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('Your photo.\nYour permission.', style: GlamType.display(32, height: 35, spacing: -1, color: t.tx))),
        Flexible(child: ListView(shrinkWrap: true, padding: EdgeInsets.zero, children: [
          policy('Private photo storage · ${p.storage.version}', p.storage.content, storage, (v) => setState(() => storage = v), 'I agree to private photo storage'),
          policy('Cosmetic analysis · ${p.analysis.version}', p.analysis.content, analysis, (v) => setState(() => analysis = v), 'I agree to cosmetic photo analysis'),
          Padding(padding: const EdgeInsets.only(top: 4, bottom: 12), child: Text('Cosmetic observations are not medical diagnoses, and never rank or score you. Account eligibility and current consent are enforced by the server.', style: GlamType.body(12, height: 18, color: t.tx2))),
        ])),
        PillButton('Upload privately & analyze', kind: c.busy || !storage || !analysis ? BtnKind.disabled : BtnKind.primary,
          onTap: () => c.analyze(storageChecked: storage, analysisChecked: analysis)),
        PillButton('Back to photo', kind: BtnKind.ghost, onTap: c.busy ? null : c.backToPhoto),
      ])),
      Positioned(top: MediaQuery.paddingOf(context).top + 6, left: 14, child: GlassCircle(glyph: isAndroid(context) ? '←' : '‹', label: 'Back to photo', onTap: c.busy ? null : c.backToPhoto)),
    ]);
  }
}
class ReportScreen extends StatelessWidget {
  const ReportScreen({super.key, required this.controller});
  final AnalyzeController controller;
  static Future<void> edit(BuildContext context, AnalyzeController controller, Finding finding) async {
    final input = TextEditingController(text: finding.value ?? '');
    try {
      final result = await MobileDesign.sheet<String>(context, Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Your correction', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)), const SizedBox(height: 16),
        TextField(controller: input, maxLength: 240, decoration: InputDecoration(labelText: findingTitle(finding.key))), const SizedBox(height: 12),
        FilledButton(onPressed: () => Navigator.of(context, rootNavigator: true).pop(input.text), child: const Text('Save correction')),
      ]));
      if (result != null) await controller.correct(finding.key, result);
    } finally { input.dispose(); }
  }
  void _push(BuildContext context, Widget page) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
  @override Widget build(BuildContext context) {
    final report = controller.report!, t = GlamTokens.of(context);
    final headline = [for (final k in const ['face-shape', 'undertone']) report.findings.where((f) => f.key == k && f.value != null).map((f) => f.value!).firstOrNull].whereType<String>().join(' · ');
    return Stack(fit: StackFit.expand, children: [
      if (controller.photo != null) PrivatePhoto(bytes: controller.photo!, fit: BoxFit.cover)
      else const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(colors: [Color(0xff45333e), MobileDesign.background], radius: .9))),
      const Scrim(fraction: .6),
      Positioned(left: 22, right: 22, top: MediaQuery.sizeOf(context).height * .22, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Kick('Your result', color: kHeroKick),
        Text(headline.isEmpty ? 'Your analysis' : headline, style: GlamType.display(34, height: 38, spacing: -.8, color: kHeroText))])),
      GlamTopBar(title: 'Your analysis', onGlass: true, onBack: controller.busy ? null : controller.backToCapture),
      Positioned(top: MediaQuery.paddingOf(context).top + 6, right: 14, child: GlassCircle(glyph: '↗', label: 'More options', onTap: () => _push(context, SaveShareScreen(controller: controller)))),
      DraggableScrollableSheet(initialChildSize: .58, minChildSize: .32, maxChildSize: .94, builder: (context, scroll) => Material(
        key: const ValueKey('native-results-sheet'), color: t.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(28)), clipBehavior: Clip.antiAlias,
        child: SafeArea(top: false, child: Column(children: [
          Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Container(width: 40, height: 4, decoration: BoxDecoration(color: t.ln, borderRadius: BorderRadius.circular(2)))),
          Expanded(child: ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(22, 0, 22, 16), children: [
            if (controller.photoError != null) GlamCard(child: Row(children: [
              Expanded(child: Text('Photo could not be loaded. Your verified observations are still available.', style: GlamType.body(12, height: 18, color: t.tx2))),
              GlassCircle(glyph: '↻', label: 'Reload private photo', solid: t.sf2, solidFg: t.tx, onTap: controller.busy ? null : controller.reloadPhoto)])),
            for (final f in report.findings) GlamCard(onTap: controller.busy ? null : () => _push(context, FindingDetailScreen(controller: controller, findingKey: f.key)),
              child: Row(children: [
                Container(width: 44, height: 44, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: Text(findingGlyph(f.key), style: GlamType.body(17, color: t.ac2))),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(findingTitle(f.key), style: GlamType.body(15, w: FontWeight.w700, color: t.tx)),
                  Text(f.value ?? 'Not enough evidence', style: GlamType.body(12, height: 18, color: t.tx2)),
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text('${certaintyLabel(f)} · you can correct this', style: GlamType.body(12, height: 18, color: t.tx2)))])),
                Text('›', style: GlamType.body(20, color: t.tx2))])),
            for (final m in [('❖', 'Skin appearance', skinScreen), ('∿', 'Hair type & texture', hairScreen)]) GlamCard(onTap: () => _push(context, m.$3()), child: Row(children: [
              Container(width: 44, height: 44, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: Text(m.$1, style: GlamType.body(17, color: t.ac2))),
              const SizedBox(width: 14), Expanded(child: Text(m.$2, style: GlamType.body(15, w: FontWeight.w700, color: t.tx))),
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: t.sf2, borderRadius: BorderRadius.circular(12)), child: Text('Not available yet', style: GlamType.body(11, w: FontWeight.w700, color: t.tx2)))])),
            Padding(padding: const EdgeInsets.fromLTRB(0, 8, 0, 8), child: Text(kMedical, style: GlamType.body(12, height: 18, color: t.tx2))),
            if (report.directions.isNotEmpty) PillButton('Style directions', kind: BtnKind.ghost, onTap: () => _push(context, DirectionsScreen(controller: controller))),
            Text('OpenAI · ${report.model}', style: GlamType.body(11, color: t.tx2)),
            PillButton('Remove analysis and stored photo', kind: BtnKind.ghost, onTap: controller.busy ? null : controller.remove),
          ])),
          Padding(padding: const EdgeInsets.fromLTRB(22, 4, 22, 8), child: PillButton(controller.saved ? 'Saved to your account' : 'Save to Style Passport',
            kind: controller.busy || controller.saved ? BtnKind.disabled : BtnKind.primary, onTap: controller.save)),
        ])),
      )),
    ]);
  }
}

class AnalysisHistory extends StatelessWidget {
  const AnalysisHistory({super.key,required this.controller});
  final AnalyzeController controller;
  @override Widget build(BuildContext context) => HistoryScreen(controller: controller);
}
