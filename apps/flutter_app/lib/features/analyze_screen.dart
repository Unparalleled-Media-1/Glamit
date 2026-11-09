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
    child: SafeArea(bottom: false, child: CustomScrollView(slivers: [
      SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(20, 8, 20, 12), child: Row(children: [
        RoundAction(icon: Icons.close, label: 'Return Home', dark: true, onPressed: () => context.go('/home')),
        const Expanded(child: Center(child: Eyebrow('Your beauty blueprint', color: GlamColors.champagne))),
        RoundAction(icon: Icons.help_outline, label: 'Photo privacy', dark: true,
          onPressed: () => glamSheet(context, const SheetContent(title: 'Permission comes first.',
            body: 'Photos are personal. This visual preview does not access a camera, gallery or server. Storage and analysis will each require your explicit permission.'))),
      ]))),
      SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 28), sliver: SliverToBoxAdapter(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Find your light.', style: Theme.of(context).textTheme.displayMedium!.copyWith(color: GlamColors.ivory)),
          const SizedBox(height: 8), const Text('A thoughtful starting point. Always in your control.', style: TextStyle(color: Color(0xffcbb8c3))),
          const SizedBox(height: 22),
          SizedBox(height: MediaQuery.sizeOf(context).height < 760 ? 270 : 340,
            width: double.infinity, child: ClipRRect(borderRadius: BorderRadius.circular(36), child: Stack(fit: StackFit.expand, children: [
              const DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(
                colors: [Color(0xff47333f), Color(0xff252126)], radius: .85))),
              const CustomPaint(painter: _FaceGuide()),
              const Positioned(top: 22, left: 22, child: Row(children: [Icon(Icons.circle, size: 7, color: GlamColors.blush),
                SizedBox(width: 8), Text('PHOTO GUIDE', style: TextStyle(fontSize: 10, letterSpacing: 2, color: GlamColors.ivory))])),
              Positioned(bottom: 20, left: 16, right: 16, child: AnimatedSwitcher(duration: const Duration(milliseconds: 220),
                child: Text(tips[guide], key: ValueKey(guide), textAlign: TextAlign.center,
                  style: const TextStyle(color: GlamColors.ivory, fontSize: 12)))),
            ]))),
          const SizedBox(height: 16), Row(mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(3, (i) => Semantics(label: 'Photo tip ${i + 1}', button: true, selected: guide == i,
              child: InkWell(key: ValueKey('guide-$i'), onTap: () => setState(() => guide = i),
                child: SizedBox(width: 48, height: 48, child: Center(child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180), height: 4, width: guide == i ? 24 : 8,
                  decoration: BoxDecoration(color: guide == i ? GlamColors.blush : Colors.white30, borderRadius: BorderRadius.circular(8))))))))),
          const SizedBox(height: 4), Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            Expanded(child: _SourceAction(key: const ValueKey('analyze-gallery'), icon: Icons.photo_library_outlined, label: 'Gallery', onTap: () => source(false))),
            Semantics(identifier: 'analyze-camera', label: 'Camera', button: true, child: InkWell(key: const ValueKey('analyze-camera'),
              onTap: () => source(true), borderRadius: BorderRadius.circular(48),
              child: Container(width: 84, height: 84, padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: GlamColors.blush, width: 2)),
                child: Container(decoration: const BoxDecoration(shape: BoxShape.circle, color: GlamColors.blush),
                  child: const Icon(Icons.camera_alt_outlined, color: GlamColors.ink, size: 28))))),
            Expanded(child: _SourceAction(icon: Icons.article_outlined, label: 'Reports', onTap: () => context.push('/collection/passport'))),
          ]),
          const SizedBox(height: 20), const Center(child: Text('No photos taken or uploaded', style: TextStyle(color: Color(0xffcbb8c3), fontSize: 11))),
          const SizedBox(height: 24),
        ],
      ))),
    ])),
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
