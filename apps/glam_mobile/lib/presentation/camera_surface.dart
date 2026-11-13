import 'dart:async';
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../analysis/photo_source.dart';
import '../core/config.dart';
import 'design.dart';

class CameraSurface extends StatefulWidget {
  const CameraSurface({super.key, required this.onPhoto, required this.onAccount, required this.onSaved});
  final ValueChanged<Uint8List> onPhoto;
  final VoidCallback onAccount, onSaved;
  @override State<CameraSurface> createState() => _CameraSurfaceState();
}
class _CameraSurfaceState extends State<CameraSurface> with WidgetsBindingObserver {
  CameraController? _camera;
  String? _error;
  bool _busy = false, _wanted = false;
  int _generation = 0;
  final source = PhotoSource();
  @override void initState() { super.initState(); WidgetsBinding.instance.addObserver(this); }
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
  @override Widget build(BuildContext context) => Stack(fit: StackFit.expand, children: [
    if (_camera?.value.isInitialized == true) Semantics(identifier: 'native-camera-live', label: 'Live device camera', child: CameraPreview(_camera!))
    else const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(colors: [Color(0xff45333e), MobileDesign.background], radius: .9))),
    const IgnorePointer(child: CustomPaint(painter: FaceFrame())),
    SafeArea(child: Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(16,8,16,0), child: Row(children: [
        Image.asset('assets/brand/app-icon.png', width: 32, height: 32),
        const SizedBox(width: 10), const Expanded(child: Text('Analyze', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w600))),
        TouchAction(label: 'Saved analysis', icon: Icons.history, onTap: _busy ? null : () => _leave(widget.onSaved)),
        TouchAction(label: 'Account', icon: Icons.person_outline, onTap: _busy ? null : () => _leave(widget.onAccount)),
      ])),
      const Spacer(),
      Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Semantics(container: true, identifier: _error == null ? 'capture-guidance' : 'camera-source-error', child: Text(
        _error == null ? (_camera == null ? 'Your photo stays on this device until you choose to upload.' : 'Position your face inside the frame') : message(_error),
        textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, shadows: [Shadow(blurRadius: 8)])))),
      const SizedBox(height: 16),
      Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
        TouchAction(key: const ValueKey('native-gallery'), label: 'Photo library', icon: Icons.photo_library_outlined, onTap: _busy ? null : _pick),
        Semantics(identifier: 'native-shutter', label: _camera == null ? 'Open camera' : 'Take photo', button: true,
          child: GestureDetector(key: const ValueKey('native-shutter'), onTap: _busy ? null : _capture,
            child: Container(width: 82, height: 82, padding: const EdgeInsets.all(5), decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: MobileDesign.cream, width: 2)),
              child: DecoratedBox(decoration: const BoxDecoration(shape: BoxShape.circle, color: MobileDesign.cream),
                child: _busy ? const Padding(padding: EdgeInsets.all(22), child: CircularProgressIndicator(color: MobileDesign.background))
                  : Icon(_camera == null ? Icons.camera_alt_outlined : Icons.circle, color: MobileDesign.background, size: 28))))),
        TouchAction(label: 'Switch camera', icon: Icons.cameraswitch_outlined, onTap: _busy || _camera == null ? null : () => _open(reverse: _camera!.description.lensDirection == CameraLensDirection.front)),
      ]),
      const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Text('Face & colour · cosmetic observations', style: TextStyle(fontSize: 11, color: Colors.white70))),
    ])),
  ]);
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
