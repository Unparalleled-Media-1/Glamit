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
  @override Widget build(BuildContext context) => MaterialApp(navigatorKey: navigator, title: 'GLAM Beauty',
    debugShowCheckedModeBanner: false, theme: MobileDesign.theme(),
    home: AnalyzeJourney(controller: controller), builder: (context, child) => Stack(children: [
      child!, if (obscured) const Positioned.fill(child: ColoredBox(color: MobileDesign.background)),
    ]));
}
class AnalyzeJourney extends StatefulWidget {
  const AnalyzeJourney({super.key, required this.controller});
  final AnalyzeController controller;
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
      await MobileDesign.sheet<void>(context, Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Your account', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)), const SizedBox(height: 12),
        const Text('Private analysis is scoped to your signed-in account.'), const SizedBox(height: 20),
        FilledButton(onPressed: () async {
          await controller.session.signOut(); controller.lock();
          if (context.mounted) Navigator.of(context, rootNavigator: true).pop();
        }, child: const Text('Remove this device session')),
      ]));
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
        default: content = _status(context);
      }
      final camera = CameraSurface(onPhoto: controller.select, onAccount: () => _account(context),
        onSaved: () async {
          if (!controller.session.authenticated) await _account(context);
          if (context.mounted && controller.session.authenticated) await controller.resume();
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
      'empty' => 'No saved analysis', _ => 'Analysis is not available',
    };
    final body = switch (phase) {
      'uncertain' => 'Your previous request may already exist. Resume checks it safely without starting a second analysis.',
      'deletion_requested' => 'The server accepted cancellation and removal. Physical deletion is handled separately by the retention service.',
      'empty' => 'Choose a photo to create your first analysis.',
      'expired' => 'The private report is no longer shown. Reload to confirm the current server state.',
      'processing' => 'You can reopen this request from your account after returning.',
      _ => 'Results appear only after the server confirms completion.',
    };
    return SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
      if (controller.busy || phase == 'processing') const Padding(padding: EdgeInsets.only(bottom: 24), child: CircularProgressIndicator()),
      Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 25, fontWeight: FontWeight.w600)),
      const SizedBox(height: 16), Text(body, textAlign: TextAlign.center), const SizedBox(height: 24),
      if (phase == 'uncertain') FilledButton(onPressed: controller.busy ? null : controller.confirmResume, child: const Text('Resume previous request')),
      if (['processing','stopped','expired'].contains(phase)) OutlinedButton(onPressed: controller.busy ? null : controller.resume, child: const Text('Reload from account')),
      if (controller.job != null) TextButton(onPressed: controller.busy ? null : controller.remove, child: const Text('Cancel and remove photo')),
      TextButton(onPressed: controller.backToCapture, child: const Text('Return to camera')),
    ]))));
  }
}
class PhotoReview extends StatelessWidget {
  const PhotoReview({super.key, required this.photo, required this.busy, required this.onRetake, required this.onAnalyze});
  final Uint8List photo;
  final bool busy;
  final VoidCallback onRetake, onAnalyze;
  @override Widget build(BuildContext context) => Semantics(identifier: 'native-photo-review', child: Stack(fit: StackFit.expand, children: [
    PrivatePhoto(bytes: photo),
    SafeArea(child: Column(children: [
      Padding(padding: const EdgeInsets.all(16), child: Align(alignment: Alignment.centerLeft, child: TouchAction(label: 'Retake photo', icon: Icons.arrow_back, onTap: busy ? null : onRetake))),
      const Spacer(),
      Container(color: Colors.black87, padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Only on this device', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6), const Text('Review permissions before private upload. No analysis has started.'), const SizedBox(height: 16),
        FilledButton(onPressed: busy ? null : onAnalyze, child: const Text('Analyze this photo')),
      ])),
    ])),
  ]));
}
class PrivatePhoto extends StatefulWidget {
  const PrivatePhoto({super.key, required this.bytes});
  final Uint8List bytes;
  @override State<PrivatePhoto> createState() => _PrivatePhotoState();
}
class _PrivatePhotoState extends State<PrivatePhoto> {
  @override void didUpdateWidget(PrivatePhoto oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.bytes, widget.bytes)) unawaited(MemoryImage(oldWidget.bytes).evict());
  }
  @override void dispose() { unawaited(MemoryImage(widget.bytes).evict()); super.dispose(); }
  @override Widget build(BuildContext context) => Image.memory(widget.bytes, fit: BoxFit.contain, excludeFromSemantics: true);
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
    final c = widget.controller, p = c.permissions!;
    return SafeArea(child: Column(children: [
      Row(children: [TouchAction(label: 'Back to photo', icon: Icons.arrow_back, onTap: c.busy ? null : c.backToPhoto),
        const Expanded(child: Text('Your photo. Your choice.', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)))]),
      Expanded(child: ListView(padding: const EdgeInsets.all(20), children: [
        Text('Private photo storage · ${p.storage.version}', style: const TextStyle(fontWeight: FontWeight.w600)), const SizedBox(height: 8), Text(p.storage.content),
        CheckboxListTile(contentPadding: EdgeInsets.zero, value: storage, onChanged: c.busy ? null : (v) => setState(() => storage = v!), title: const Text('I agree to private photo storage')),
        const SizedBox(height: 20), Text('Cosmetic analysis · ${p.analysis.version}', style: const TextStyle(fontWeight: FontWeight.w600)), const SizedBox(height: 8), Text(p.analysis.content),
        CheckboxListTile(contentPadding: EdgeInsets.zero, value: analysis, onChanged: c.busy ? null : (v) => setState(() => analysis = v!), title: const Text('I agree to cosmetic photo analysis')),
        const Text('Cosmetic observations are not medical diagnoses. Account eligibility and current consent are enforced by the server.'),
      ])),
      Padding(padding: const EdgeInsets.all(20), child: SizedBox(width: double.infinity, child: FilledButton(onPressed: c.busy || !storage || !analysis ? null : () => c.analyze(storageChecked: storage, analysisChecked: analysis), child: const Text('Upload privately & analyze')))),
    ]));
  }
}
class ReportScreen extends StatelessWidget {
  const ReportScreen({super.key, required this.controller});
  final AnalyzeController controller;
  Future<void> edit(BuildContext context, Finding finding) async {
    final input = TextEditingController(text: finding.value ?? '');
    try {
      final result = await MobileDesign.sheet<String>(context, Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Your correction', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)), const SizedBox(height: 16),
        TextField(controller: input, maxLength: 240, decoration: InputDecoration(labelText: finding.key)), const SizedBox(height: 12),
        FilledButton(onPressed: () => Navigator.of(context, rootNavigator: true).pop(input.text), child: const Text('Save correction')),
      ]));
      if (result != null) await controller.correct(finding.key, result);
    } finally { input.dispose(); }
  }
  @override Widget build(BuildContext context) {
    final report = controller.report!;
    return SafeArea(child: Column(children: [
      Row(children: [TouchAction(label: 'Return to camera', icon: Icons.arrow_back, onTap: controller.busy ? null : controller.backToCapture),
        const Expanded(child: Text('Your analysis', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600)))]),
      Expanded(child: ListView(padding: const EdgeInsets.all(20), children: [
        const Text('Cosmetic observations', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8), Text('Provider: OpenAI · ${report.model}'), const SizedBox(height: 20),
        for (final f in report.findings) Padding(padding: const EdgeInsets.only(bottom: 12), child: Material(color: const Color(0xff282329), borderRadius: BorderRadius.circular(20),
          child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(f.key, style: const TextStyle(color: MobileDesign.blush)), const SizedBox(height: 8),
            Text(f.value ?? 'Not enough evidence', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600)),
            Text(f.userCorrected ? 'Your correction' : f.certainty), const SizedBox(height: 8), Text(f.uncertainty),
            Wrap(spacing: 8, children: [TextButton(onPressed: controller.busy ? null : () => edit(context, f), child: const Text('Correct')),
              if (f.userCorrected) TextButton(onPressed: controller.busy ? null : () => controller.correct(f.key, null), child: const Text('Reset to observation'))]),
          ])))),
        if (report.directions.isNotEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Text('Style directions', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600))),
        for (final d in report.directions) ListTile(contentPadding: EdgeInsets.zero, title: Text(d.title), subtitle: Text(d.rationale)),
        const SizedBox(height: 12), TextButton(onPressed: controller.busy ? null : controller.remove, child: const Text('Remove analysis and stored photo')),
      ])),
      Padding(padding: const EdgeInsets.all(20), child: SizedBox(width: double.infinity, child: FilledButton(onPressed: controller.busy || controller.saved ? null : controller.save,
        child: Text(controller.saved ? 'Saved to your account' : 'Save to Style Passport')))),
    ]));
  }
}
