import 'dart:async';
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../analysis/photo_source.dart';
import '../core/config.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../screens/analyze_intro.dart';
import 'design.dart';

class CameraSurface extends StatefulWidget {
  const CameraSurface({super.key, required this.onPhoto, required this.onAccount, required this.onSaved, this.start = CaptureStart.idle, this.onClose});
  final ValueChanged<Uint8List> onPhoto;
  final VoidCallback onAccount, onSaved;
  final VoidCallback? onClose;
  final CaptureStart start;
  @override State<CameraSurface> createState() => _CameraSurfaceState();
}
class _CameraSurfaceState extends State<CameraSurface> with WidgetsBindingObserver {
  CameraController? _camera;
  String? _error;
  bool _busy = false, _wanted = false;
  int _generation = 0;
  final source = PhotoSource();
  @override void initState() {
    super.initState(); WidgetsBinding.instance.addObserver(this);
    if (widget.start != CaptureStart.idle) WidgetsBinding.instance.addPostFrameCallback((_) { if (!mounted) return; widget.start == CaptureStart.gallery ? _pick() : _open(); });
  }
  @override void dispose() {
    _generation++; WidgetsBinding.instance.removeObserver(this); unawaited(_camera?.dispose()); super.dispose();
  }
  @override void didChangeAppLifecycleState(AppLifecycleState state) {
    if ((state == AppLifecycleState.inactive && _camera != null) || state == AppLifecycleState.paused) {
      _generation++; final old = _camera; _camera = null; unawaited(old?.dispose());
      if (mounted) setState(() => _busy = false);
    } else if (state == AppLifecycleState.resumed && _wanted) { unawaited(_open()); }
  }
  Future<void> _open({bool reverse = false}) async {
    if (_busy) return;
    final generation = ++_generation;
    setState(() { _busy = true; _error = null; });
    CameraController? next;
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) throw const Failure('camera_unavailable');
      final desired = reverse ? CameraLensDirection.back : CameraLensDirection.front;
      final description = cameras.firstWhere((c) => c.lensDirection == desired, orElse: () => cameras.first);
      final old = _camera; _camera = null; await old?.dispose();
      next = CameraController(description, ResolutionPreset.high, enableAudio: false);
      await next.initialize();
      if (!mounted || generation != _generation) { await next.dispose(); return; }
      setState(() { _camera = next; _wanted = true; });
    } on CameraException catch (e) {
      await next?.dispose();
      if (mounted && generation == _generation) setState(() => _error = e.code.contains('Access') ? 'camera_permission_denied' : 'camera_unavailable');
    } on Failure catch (e) { if (mounted && generation == _generation) setState(() => _error = e.code); }
    catch (_) { if (mounted && generation == _generation) setState(() => _error = 'camera_unavailable'); }
    finally { if (mounted && generation == _generation) setState(() => _busy = false); }
  }
  Future<void> _capture() async {
    if (_camera == null) { await _open(); return; }
    if (_busy) return;
    final generation = _generation;
    setState(() => _busy = true);
    try {
      final file = await _camera!.takePicture();
      final bytes = await source.normalize(file);
      if (mounted && generation == _generation) {
        _wanted = false; final old = _camera; _camera = null; await old?.dispose();
        if (mounted && generation == _generation) { HapticFeedback.mediumImpact(); widget.onPhoto(bytes); }
        else { bytes.fillRange(0, bytes.length, 0); }
      }
      else { bytes.fillRange(0, bytes.length, 0); }
    } on Failure catch (e) { if (mounted) setState(() => _error = e.code); }
    catch (_) { if (mounted) setState(() => _error = 'photo_unreadable'); }
    finally { if (mounted) setState(() => _busy = false); }
  }
  Future<void> _leave(VoidCallback action) async {
    _wanted = false; _generation++; final old = _camera; _camera = null;
    await old?.dispose(); if (mounted) { setState(() {}); action(); }
  }
  Future<void> _pick() async {
    if (_busy) return;
    setState(() => _busy = true);
    _wanted = false; _generation++; final old = _camera; _camera = null; await old?.dispose();
    try {
      final bytes = await source.gallery();
      if (bytes != null && mounted) widget.onPhoto(bytes);
      else if (bytes != null) bytes.fillRange(0, bytes.length, 0);
    } on Failure catch (e) { if (mounted) setState(() => _error = e.code); }
    catch (_) { if (mounted) setState(() => _error = 'photo_unreadable'); }
    finally { if (mounted) setState(() => _busy = false); }
  }
  @override Widget build(BuildContext context) {
    final t = GlamTokens.of(context);
    final guidance = _error == null ? (_camera == null ? 'Your photo stays on this device until you choose to upload.' : 'Face the light · Hold level') : message(_error);
    return Stack(fit: StackFit.expand, children: [
      if (_camera?.value.isInitialized == true) Semantics(identifier: 'native-camera-live', label: 'Live device camera', child: CameraPreview(_camera!))
      else const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(colors: [Color(0xff45333e), MobileDesign.background], radius: .9))),
      const OvalGuide(),
      TopRowCamera(children: [
        GlassCircle(glyph: '✕', label: 'Close', onTap: _busy ? null : () => _leave(widget.onClose ?? () => Navigator.of(context).maybePop())),
        const Spacer(),
        GlassPill(label: 'History', onTap: _busy ? null : () => _leave(widget.onSaved)),
        GlassCircle(glyph: '○', label: 'Account', onTap: _busy ? null : () => _leave(widget.onAccount)),
      ]),
      Positioned(top: MediaQuery.paddingOf(context).top + 100, left: 22, right: 22, child: Center(child: Semantics(container: true, identifier: _error == null ? 'capture-guidance' : 'camera-source-error',
        child: GlassPill(label: guidance)))),
      Positioned(left: 0, right: 0, bottom: 40 + MediaQuery.paddingOf(context).bottom * .5, child: Padding(padding: const EdgeInsets.symmetric(horizontal: 30), child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        GlassCircle(key: const ValueKey('native-gallery'), glyph: '▣', label: 'Photo library', onTap: _busy ? null : _pick),
        Semantics(identifier: 'native-shutter', label: _camera == null ? 'Open camera' : 'Take photo', button: true,
          child: GestureDetector(key: const ValueKey('native-shutter'), onTap: _busy ? null : _capture,
            child: Container(width: 76, height: 76, padding: const EdgeInsets.all(4), decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 4)),
              child: DecoratedBox(decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                child: _busy ? Padding(padding: const EdgeInsets.all(22), child: CircularProgressIndicator(strokeWidth: 3, color: t.bg)) : null)))),
        GlassCircle(glyph: '⟲', label: 'Switch camera', onTap: _busy || _camera == null ? null : () => _open(reverse: _camera!.description.lensDirection == CameraLensDirection.front)),
      ]))),
    ]);
  }
}
/// Top row for full-bleed photo screens (`.top`).
class TopRowCamera extends StatelessWidget {
  const TopRowCamera({super.key, required this.children});
  final List<Widget> children;
  @override Widget build(BuildContext context) => Positioned(top: MediaQuery.paddingOf(context).top + 6, left: 14, right: 14,
    child: Row(children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(width: 8), children[i]]]));
}
class FaceFrame extends CustomPainter {
  const FaceFrame();
  @override void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCenter(center: Offset(size.width/2, size.height*.43), width: size.width*.7, height: size.height*.46);
    final paint = Paint()..color = MobileDesign.cream.withValues(alpha:.6)..style = PaintingStyle.stroke..strokeWidth = 1.5;
    canvas.drawRRect(RRect.fromRectAndRadius(rect, Radius.circular(rect.width*.46)), paint);
    paint.color = Colors.white12;
    canvas.drawLine(Offset(rect.left, rect.center.dy), Offset(rect.right, rect.center.dy), paint);
  }
  @override bool shouldRepaint(FaceFrame oldDelegate) => false;
}
