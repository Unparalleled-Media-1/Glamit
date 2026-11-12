import 'package:flutter/material.dart';
import '../data/fixtures.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../shell/nav.dart';

/// Loading / empty / error states from the design (`StateOv` in chrome.jsx).
/// [state] is `default` in production; capture builds drive the others through
/// --dart-define=GLAM_REFERENCE_STATE.
class ScreenStateGate extends StatelessWidget {
  const ScreenStateGate({super.key, required this.child, this.state = kReferenceState, this.onRetry});
  final Widget child;
  final String state;
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) => Stack(children: [
    Positioned.fill(child: child),
    if (state == 'loading') const Positioned.fill(child: _Loading()),
    if (state == 'empty') const Positioned.fill(child: _Empty()),
    if (state == 'error') Positioned.fill(child: _Error(onRetry: onRetry)),
  ]);
}

class _Shim extends StatefulWidget {
  const _Shim({this.height, this.widthFactor = 1});
  final double? height;
  final double widthFactor;
  @override State<_Shim> createState() => _ShimState();
}
class _ShimState extends State<_Shim> with SingleTickerProviderStateMixin {
  late final c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat();
  @override void dispose() { c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return FractionallySizedBox(widthFactor: widget.widthFactor, child: AnimatedBuilder(animation: c, builder: (_, _) => Container(height: widget.height,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), gradient: LinearGradient(
        begin: Alignment(-1 + 4 * c.value - 2, 0), end: Alignment(1 + 4 * c.value - 2, 0), colors: [p.sf2, p.sf, p.sf2])))));
  }
}

class _Loading extends StatelessWidget {
  const _Loading();
  @override
  Widget build(BuildContext context) => Semantics(label: 'Loading', liveRegion: true, child: ColoredBox(color: context.glam.bg,
    child: const SingleChildScrollView(physics: NeverScrollableScrollPhysics(), padding: EdgeInsets.fromLTRB(22, 56, 22, 0), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _Shim(height: 28, widthFactor: .6), SizedBox(height: 14), _Shim(height: 14, widthFactor: .85), SizedBox(height: 8),
      _Shim(height: 14, widthFactor: .7), SizedBox(height: 22), _Shim(height: 170), SizedBox(height: 14),
      Row(children: [Expanded(child: _Shim(height: 120)), SizedBox(width: 12), Expanded(child: _Shim(height: 120))]),
    ]))));
}

class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return ColoredBox(color: p.bg, child: Center(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 36), child: Column(mainAxisSize: MainAxisSize.min, children: [
      Text('◌', style: body(42, p.ac2)),
      const SizedBox(height: 8),
      Text('Nothing here yet.', textAlign: TextAlign.center, style: display(26, 30, p.tx, ls: -.6)),
      const SizedBox(height: 8),
      Text('When there is something to show, it will appear here.', textAlign: TextAlign.center, style: body(15, p.tx2, height: 23)),
      const SizedBox(height: 14),
      GlamButton('Go to Home', onTap: () => GlamNav.to(context, 'home')),
    ]))));
  }
}

class _Error extends StatelessWidget {
  const _Error({this.onRetry});
  final VoidCallback? onRetry;
  @override
  Widget build(BuildContext context) {
    final p = context.glam;
    return ColoredBox(color: p.bg, child: Padding(padding: const EdgeInsets.fromLTRB(22, 56, 22, 0), child: Align(alignment: Alignment.topCenter,
      child: Semantics(liveRegion: true, container: true, child: Container(padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(border: Border.all(color: const Color(0xFFA33440)), borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text('Couldn’t load this.', style: body(14, p.err, w: FontWeight.w700, height: 21)),
          Text('Check your connection and try again. Your work is saved.', style: body(14, p.err, height: 21)),
          const SizedBox(height: 12),
          Row(children: [
            Tappable(onTap: onRetry, label: 'Retry', child: Container(height: 44, padding: const EdgeInsets.symmetric(horizontal: 20), alignment: Alignment.center,
              decoration: BoxDecoration(color: p.btn, borderRadius: BorderRadius.circular(27)), child: Text('Retry', style: body(14, p.onBtn, w: FontWeight.w700)))),
            const SizedBox(width: 8),
            Tappable(onTap: () => GlamNav.to(context, 'GL-203'), label: 'Offline help', child: Container(height: 44, padding: const EdgeInsets.symmetric(horizontal: 20), alignment: Alignment.center,
              decoration: BoxDecoration(border: Border.all(color: p.ln), borderRadius: BorderRadius.circular(27)), child: Text('Offline help', style: body(14, p.tx, w: FontWeight.w700)))),
          ]),
        ]))))));
  }
}
