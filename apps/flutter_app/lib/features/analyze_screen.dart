import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../app/theme.dart';
import '../widgets/glam_widgets.dart';

class AnalyzeScreen extends StatefulWidget {
  const AnalyzeScreen({super.key});
  @override
  State<AnalyzeScreen> createState() => _AnalyzeScreenState();
}

class _AnalyzeScreenState extends State<AnalyzeScreen> {
  int guide = 0;
  static const tips = ['Find soft, natural light', 'Face forward, comfortably', 'Keep filters switched off'];
  void source(bool camera) => glamSheet(context, SheetContent(
    title: camera ? 'Your camera. Your choice.' : 'Choose what you share.',
    body: camera
      ? 'Camera capture is not connected in this design preview. No permission has been requested and no photo has been taken.'
      : 'Gallery access is not connected in this design preview. No photo is selected, uploaded or analysed.',
    children: [
      const Row(children: [Icon(Icons.lock_outline, color: GlamColors.mauve), SizedBox(width: 12),
        Expanded(child: Text('You will always choose whether a photo may be stored or analysed.'))]),
      const SizedBox(height: 24),
      FilledButton(key: const ValueKey('photo-guide'), onPressed: () {
        Navigator.of(context, rootNavigator: true).pop(); setState(() => guide = (guide + 1) % tips.length);
      }, child: const Text('Explore photo guidance')),
    ],
  ));
  @override
  Widget build(BuildContext context) => ColoredBox(key: const ValueKey('screen-analyze'), color: GlamColors.charcoal,
    child: SafeArea(bottom: false, child: LayoutBuilder(builder: (context, bounds) {
      final large = MediaQuery.textScalerOf(context).scale(14) > 20;
      final content = Column(children: [
        Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4), child: Row(children: [
          RoundAction(icon: Icons.close, label: 'Return Home', dark: true, onPressed: () => context.go('/home')),
          const Expanded(child: Text('Analyze', textAlign: TextAlign.center, style: TextStyle(color: GlamColors.ivory, fontSize: 18, fontWeight: FontWeight.w600))),
          RoundAction(icon: Icons.help_outline, label: 'Photo privacy', dark: true, onPressed: () => glamSheet(context,
            const SheetContent(title: 'Photo privacy', body: 'This visual preview does not access a camera, gallery or server. Storage and analysis will require explicit permission.'))),
        ])),
        Expanded(child: GestureDetector(onHorizontalDragEnd: (details) => setState(() => guide = (guide + (details.primaryVelocity! < 0 ? 1 : 2)) % 3),
          child: Stack(fit: StackFit.expand, children: [
            const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(colors: [Color(0xff47333f), GlamColors.charcoal], radius: .9))),
            const CustomPaint(painter: _FaceGuide()),
            const Positioned(top: 12, left: 20, right: 20, child: Text('PHOTO GUIDE · CAMERA OFFLINE', textAlign: TextAlign.center, style: TextStyle(color: GlamColors.champagne, fontSize: 10, letterSpacing: 1))),
            Positioned(bottom: 12, left: 24, right: 24, child: Text(tips[guide], textAlign: TextAlign.center, style: const TextStyle(color: GlamColors.ivory, fontSize: 14))),
          ]))),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(3, (i) => Semantics(label: 'Photo tip ${i + 1}', button: true, selected: guide == i,
          child: InkWell(key: ValueKey('guide-$i'), onTap: () => setState(() => guide = i), child: SizedBox(width: 48, height: 48,
            child: Center(child: Container(height: 4, width: guide == i ? 24 : 8, decoration: BoxDecoration(color: guide == i ? GlamColors.blush : Colors.white30, borderRadius: BorderRadius.circular(8))))))))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
          Expanded(child: _SourceAction(key: const ValueKey('analyze-gallery'), icon: Icons.photo_library_outlined, label: 'Gallery', onTap: () => source(false))),
          Semantics(identifier: 'analyze-camera', label: 'Camera', button: true, child: InkWell(key: const ValueKey('analyze-camera'), onTap: () => source(true), borderRadius: BorderRadius.circular(44),
            child: Container(width: 80, height: 80, padding: const EdgeInsets.all(5), decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: GlamColors.blush, width: 2)),
              child: const DecoratedBox(decoration: BoxDecoration(shape: BoxShape.circle, color: GlamColors.blush), child: Icon(Icons.camera_alt_outlined, size: 28, color: GlamColors.ink))))),
          Expanded(child: _SourceAction(icon: Icons.article_outlined, label: 'Reports', onTap: () => context.push('/collection/passport'))),
        ])),
        const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Text('No photos taken or uploaded', style: TextStyle(color: Color(0xffcbb8c3), fontSize: 11))),
      ]);
      return large ? SingleChildScrollView(child: SizedBox(height: bounds.maxHeight < 800 ? 800 : bounds.maxHeight, child: content)) : content;
    })),
  );
}

class _SourceAction extends StatelessWidget {
  const _SourceAction({super.key, required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => TextButton(onPressed: onTap, child: Column(children: [
    Icon(icon, color: GlamColors.ivory), const SizedBox(height: 6),
    Text(label, style: const TextStyle(color: GlamColors.ivory, fontSize: 11)),
  ]));
}

class _FaceGuide extends CustomPainter {
  const _FaceGuide();
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2 - 2);
    final paint = Paint()..color = GlamColors.champagne.withValues(alpha: .5)..style = PaintingStyle.stroke..strokeWidth = 1;
    final face = Rect.fromCenter(center: center, width: size.width * .49, height: size.height * .62);
    canvas.drawOval(face, paint);
    paint.color = GlamColors.blush;
    final corners = Rect.fromCenter(center: center, width: size.width * .7, height: size.height * .76);
    for (final point in [corners.topLeft, corners.topRight, corners.bottomLeft, corners.bottomRight]) {
      final dx = point.dx < center.dx ? 1.0 : -1.0;
      final dy = point.dy < center.dy ? 1.0 : -1.0;
      canvas.drawLine(point, point + Offset(dx * 22, 0), paint);
      canvas.drawLine(point, point + Offset(0, dy * 22), paint);
    }
    paint..strokeWidth = 1..color = Colors.white12;
    canvas.drawLine(Offset(center.dx, face.top), Offset(center.dx, face.bottom), paint);
    canvas.drawLine(Offset(face.left, center.dy - 10), Offset(face.right, center.dy - 10), paint);
  }
  @override
  bool shouldRepaint(covariant _FaceGuide oldDelegate) => false;
}
