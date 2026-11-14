import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter/semantics.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'analysis/controller.dart';
import 'analysis/contracts.dart';
import 'analysis/repository.dart';
import 'core/config.dart';
import 'core/session.dart';
import 'core/transport.dart';
import 'presentation/camera_surface.dart';
import 'data/fixture_scope.dart';
import 'data/fixtures.dart';
import 'design/tokens.dart';
import 'presentation/design.dart';
import 'design/analyze_widgets.dart';
import 'design/photo.dart';
import 'design/widgets.dart';
import 'screens/analyze_intro.dart';
import 'screens/analyze_results.dart';
import 'shell/router.dart';

void main() { WidgetsFlutterBinding.ensureInitialized(); runApp(const AnalyzeApp()); }
class AnalyzeApp extends StatefulWidget {
  const AnalyzeApp({super.key, this.controller, this.fixtures});
  final AnalyzeController? controller;
  /// Overrides kReferenceFixtures (tests/previews); null keeps the build default.
  final bool? fixtures;
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
  late final GoRouter router = buildRouter(navigatorKey: navigator,
    interimAnalysis: (context, start) => InterimAnalysis(controller: controller, start: start));
  @override Widget build(BuildContext context) => MaterialApp.router(routerConfig: router, title: 'GLAM Beauty',
    debugShowCheckedModeBanner: false, theme: glamTheme(Brightness.light), darkTheme: glamTheme(Brightness.dark), themeMode: ThemeMode.system,
    builder: (context, child) => FixtureScope(enabled: widget.fixtures ?? kReferenceFixtures, child: Stack(children: [
      child!, if (obscured) Positioned.fill(child: ColoredBox(color: context.glam.bg)),
    ])));
}
/// The real private-analysis journey (camera, consent, upload, server analysis, results, history), hosted as a full-screen route
/// that the design's GL-018..GL-034 screens open into.
class InterimAnalysis extends StatelessWidget {
  const InterimAnalysis({super.key, required this.controller, this.start = CaptureStart.idle});
  final AnalyzeController controller;
  final CaptureStart start;
  @override Widget build(BuildContext context) => PopScope(
    canPop: controller.phase == 'capture',
    child: Theme(data: MobileDesign.theme(), child: AnalyzeJourney(controller: controller, start: start)));
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
    final bodyText = switch (phase) {
      'uncertain' => 'Your previous request may already exist. Resume checks it safely without starting a second analysis.',
      'deletion_requested' => 'The server accepted cancellation and removal. Physical deletion is handled separately by the retention service.',
      'empty' => 'Choose a photo to create your first analysis.',
      'expired' => 'The private report is no longer shown. Reload to confirm the current server state.',
      'processing' => 'You can reopen this request from your account after returning.',
      _ => 'Results appear only after the server confirms completion.',
    };
    final t = context.glam;
    final working = controller.busy || phase == 'processing';
    Widget action(String label, VoidCallback? on, [GlamButtonKind kind = GlamButtonKind.glass]) => GlamButton(label, kind: on == null ? GlamButtonKind.disabled : kind, onTap: on);
    final controls = Padding(padding: EdgeInsets.fromLTRB(22, 0, 22, 60 + MediaQuery.paddingOf(context).bottom), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Kicker(working ? 'Analyzing' : 'Status', color: GlamPalette.blush),
      Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(title, style: display(26, 30, GlamPalette.onPhoto, ls: -.6))),
      Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(bodyText, style: body(15, const Color(0xffe8d9e0), height: 23))),
      if (phase == 'loading_history' && !controller.busy) action('Reload history', controller.loadHistory),
      if (phase == 'uncertain') action('Resume previous request', controller.busy ? null : controller.confirmResume, GlamButtonKind.primary),
      if (['processing','stopped','expired'].contains(phase)) action('Reload from account', controller.busy ? null : controller.resume),
      if (controller.job != null) action('Cancel and remove photo', controller.busy ? null : controller.remove, GlamButtonKind.ghost),
      action('Return to camera', controller.backToCapture, GlamButtonKind.ghost),
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
    final t = context.glam;
    return Semantics(identifier: 'native-photo-review', child: Stack(fit: StackFit.expand, children: [
      Positioned(top: 0, left: 0, right: 0, height: 480, child: PrivatePhoto(bytes: photo, fit: BoxFit.cover)),
      GlamTopBar(title: 'Photo check', onPhoto: true, onBack: busy ? null : onRetake),
      GlamTray(top: 430, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.only(bottom: 6), child: Text('Photo ready.', style: display(26, 30, t.tx, ls: -.6))),
        Padding(padding: const EdgeInsets.only(bottom: 6), child: Text('Quality checks are not computed on this device. No analysis has started.', style: body(12, t.tx2, height: 18))),
        for (final r in const [('Stored on', 'This device only'), ('Upload', 'Not started'), ('Analysis', 'Needs your permission')])
          Container(constraints: const BoxConstraints(minHeight: 46), padding: const EdgeInsets.symmetric(vertical: 8), decoration: BoxDecoration(border: Border(bottom: BorderSide(color: t.ln))),
            child: Row(children: [Expanded(child: Text(r.$1, style: body(14, t.tx, w: FontWeight.w600))), Text(r.$2, style: body(13, t.tx2))])),
        GlamButton('Analyze this photo', kind: busy ? GlamButtonKind.disabled : GlamButtonKind.primary, onTap: onAnalyze),
        GlamButton('Retake', kind: GlamButtonKind.ghost, onTap: busy ? null : onRetake),
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
    final c = widget.controller, p = c.permissions!, t = context.glam;
    Widget policy(String title, String content, bool value, ValueChanged<bool> set, String agree) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.only(top: 6, bottom: 8), child: Text(title, style: body(15, t.tx, w: FontWeight.w700))),
      Text(content, style: body(15, t.tx2, height: 23)),
      Container(constraints: const BoxConstraints(minHeight: 56), child: Row(children: [GlamSwitch(on: value, label: agree, onChanged: c.busy ? null : set), const SizedBox(width: 14),
        Expanded(child: Text(agree, style: body(14, t.tx, height: 21)))])),
    ]);
    return Stack(fit: StackFit.expand, children: [
      if (c.photo != null) PrivatePhoto(bytes: c.photo!, fit: BoxFit.cover),
      const ColoredBox(color: Color(0x8c000000)), // design: brightness(.45)
      GlamTray(top: 250 + MediaQuery.paddingOf(context).top * 0, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('Your photo.\nYour permission.', style: display(32, 35, t.tx, ls: -1))),
        Flexible(child: ListView(shrinkWrap: true, padding: EdgeInsets.zero, children: [
          policy('Private photo storage · ${p.storage.version}', p.storage.content, storage, (v) => setState(() => storage = v), 'I agree to private photo storage'),
          policy('Cosmetic analysis · ${p.analysis.version}', p.analysis.content, analysis, (v) => setState(() => analysis = v), 'I agree to cosmetic photo analysis'),
          Padding(padding: const EdgeInsets.only(top: 4, bottom: 12), child: Text('Cosmetic observations are not medical diagnoses, and never rank or score you. Account eligibility and current consent are enforced by the server.', style: body(12, t.tx2, height: 18))),
        ])),
        GlamButton('Upload privately & analyze', kind: c.busy || !storage || !analysis ? GlamButtonKind.disabled : GlamButtonKind.primary,
          onTap: () => c.analyze(storageChecked: storage, analysisChecked: analysis)),
        GlamButton('Back to photo', kind: GlamButtonKind.ghost, onTap: c.busy ? null : c.backToPhoto),
      ])),
      Positioned(top: MediaQuery.paddingOf(context).top + 6, left: 14, child: GlassIconButton(glyph: context.isAndroidStyle ? '←' : '‹', label: 'Back to photo', onTap: c.busy ? null : c.backToPhoto)),
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
    final report = controller.report!, t = context.glam;
    final headline = [for (final k in const ['face-shape', 'undertone']) report.findings.where((f) => f.key == k && f.value != null).map((f) => f.value!).firstOrNull].whereType<String>().join(' · ');
    return Stack(fit: StackFit.expand, children: [
      if (controller.photo != null) PrivatePhoto(bytes: controller.photo!, fit: BoxFit.cover)
      else const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(colors: [Color(0xff45333e), MobileDesign.background], radius: .9))),
      const Scrim(fraction: .6),
      Positioned(left: 22, right: 22, top: MediaQuery.sizeOf(context).height * .22, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Kicker('Your result', color: GlamPalette.blush),
        Text(headline.isEmpty ? 'Your analysis' : headline, style: display(34, 38, GlamPalette.onPhoto, ls: -.8))])),
      GlamTopBar(title: 'Your analysis', onPhoto: true, onBack: controller.busy ? null : controller.backToCapture),
      Positioned(top: MediaQuery.paddingOf(context).top + 6, right: 14, child: GlassIconButton(glyph: '↗', label: 'More options', onTap: () => _push(context, SaveShareScreen(controller: controller)))),
      DraggableScrollableSheet(initialChildSize: .58, minChildSize: .32, maxChildSize: .94, builder: (context, scroll) => Material(
        key: const ValueKey('native-results-sheet'), color: t.bg, borderRadius: const BorderRadius.vertical(top: Radius.circular(28)), clipBehavior: Clip.antiAlias,
        child: SafeArea(top: false, child: Column(children: [
          Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Container(width: 40, height: 4, decoration: BoxDecoration(color: t.ln, borderRadius: BorderRadius.circular(2)))),
          Expanded(child: ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(22, 0, 22, 16), children: [
            if (controller.photoError != null) GlamCard(child: Row(children: [
              Expanded(child: Text('Photo could not be loaded. Your verified observations are still available.', style: body(12, t.tx2, height: 18))),
              GlassIconButton(glyph: '↻', label: 'Reload private photo', fill: t.sf2, color: t.tx, onTap: controller.busy ? null : controller.reloadPhoto)])),
            for (final f in report.findings) GlamCard(onTap: controller.busy ? null : () => _push(context, FindingDetailScreen(controller: controller, findingKey: f.key)),
              child: Row(children: [
                Container(width: 44, height: 44, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: Text(findingGlyph(f.key), style: body(17, t.ac2))),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(findingTitle(f.key), style: body(15, t.tx, w: FontWeight.w700)),
                  Text(f.value ?? 'Not enough evidence', style: body(12, t.tx2, height: 18)),
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text('${certaintyLabel(f)} · you can correct this', style: body(12, t.tx2, height: 18)))])),
                Text('›', style: body(20, t.tx2))])),
            for (final m in [('❖', 'Skin appearance', skinScreen), ('∿', 'Hair type & texture', hairScreen)]) GlamCard(onTap: () => _push(context, m.$3()), child: Row(children: [
              Container(width: 44, height: 44, decoration: BoxDecoration(color: t.sf2, shape: BoxShape.circle), alignment: Alignment.center, child: Text(m.$1, style: body(17, t.ac2))),
              const SizedBox(width: 14), Expanded(child: Text(m.$2, style: body(15, t.tx, w: FontWeight.w700))),
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: t.sf2, borderRadius: BorderRadius.circular(12)), child: Text('Not available yet', style: body(11, t.tx2, w: FontWeight.w700)))])),
            Padding(padding: const EdgeInsets.fromLTRB(0, 8, 0, 8), child: Text(kMedical, style: body(12, t.tx2, height: 18))),
            if (report.directions.isNotEmpty) GlamButton('Style directions', kind: GlamButtonKind.ghost, onTap: () => _push(context, DirectionsScreen(controller: controller))),
            Text('OpenAI · ${report.model}', style: body(11, t.tx2)),
            GlamButton('Remove analysis and stored photo', kind: GlamButtonKind.ghost, onTap: controller.busy ? null : controller.remove),
          ])),
          Padding(padding: const EdgeInsets.fromLTRB(22, 4, 22, 8), child: GlamButton(controller.saved ? 'Saved to your account' : 'Save to Style Passport',
            kind: controller.busy || controller.saved ? GlamButtonKind.disabled : GlamButtonKind.primary, onTap: controller.save)),
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


/// Opens the correction sheet for one observation (used by the finding detail screen).
Future<void> editFinding(BuildContext context, AnalyzeController controller, Finding finding) => ReportScreen.edit(context, controller, finding);
