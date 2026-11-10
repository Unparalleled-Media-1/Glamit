import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/preview_state.dart';
import '../app/theme.dart';
import '../widgets/glam_widgets.dart';

const moods = [Color(0xfff6c6d8), Color(0xffdcc7a8), Color(0xffbb816c), Color(0xff78546c), Color(0xffb4b7a2)];
const tools = ['Makeup', 'Hair', 'Hair colour', 'Outfits'];

class StudioScreen extends ConsumerWidget {
  const StudioScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(previewProvider);
    final controller = ref.read(previewProvider.notifier);
    return ColoredBox(key: const ValueKey('screen-studio'), color: GlamColors.charcoal,
      child: SafeArea(bottom: false, child: LayoutBuilder(builder: (context, bounds) => Column(children: [
        Padding(padding: const EdgeInsets.fromLTRB(12, 4, 12, 4), child: Row(children: [
          const Expanded(child: Text('Studio', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: GlamColors.ivory))),
          RoundAction(icon: Icons.chat_bubble_outline, label: 'Ask your stylist', dark: true, onPressed: () => context.push('/advisor')),
          RoundAction(icon: Icons.info_outline, label: 'Studio settings', dark: true, onPressed: () => glamSheet(context,
            const SheetContent(title: 'Colour study', body: 'Pinch to zoom. Drag to compare the reference in monochrome. This is an on-device colour study, not an AI transformation.'))),
        ])),
        Expanded(child: Stack(fit: StackFit.expand, children: [
          InteractiveViewer(key: const ValueKey('studio-canvas'), minScale: 1, maxScale: 3, child: Stack(fit: StackFit.expand, children: [
            const Portrait(index: 1),
            ClipRect(clipper: _ComparisonClip(state.compare), child: const ColorFiltered(
              colorFilter: ColorFilter.matrix([.21,.72,.07,0,0, .21,.72,.07,0,0, .21,.72,.07,0,0, 0,0,0,1,0]), child: Portrait(index: 1))),
          ])),
          const Positioned(top: 12, left: 16, child: DecoratedBox(decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.all(Radius.circular(12))),
            child: Padding(padding: EdgeInsets.all(8), child: Text('Reference · not AI', style: TextStyle(color: Colors.white, fontSize: 11))))),
          Positioned(bottom: 8, left: 16, right: 16, child: DecoratedBox(decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(20)),
            child: Slider(key: const ValueKey('studio-comparison'), value: state.compare, onChanged: controller.compare,
              activeColor: GlamColors.blush, inactiveColor: Colors.white60, semanticFormatterCallback: (value) => '${(value * 100).round()} percent monochrome'))),
        ])),
        ConstrainedBox(constraints: BoxConstraints(maxHeight: bounds.maxHeight * .48), child: SingleChildScrollView(child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 10), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SizedBox(height: MediaQuery.textScalerOf(context).scale(13) + 38, child: ListView.separated(scrollDirection: Axis.horizontal,
              itemCount: tools.length, separatorBuilder: (_, _) => const SizedBox(width: 6), itemBuilder: (_, i) => ChoiceChip(
                key: ValueKey('tool-$i'), selected: state.tool == i, label: Text(tools[i]), showCheckmark: false,
                selectedColor: GlamColors.blush, backgroundColor: const Color(0xff2e2830), side: BorderSide.none,
                labelStyle: TextStyle(color: state.tool == i ? GlamColors.ink : GlamColors.ivory), onSelected: (_) => controller.tool(i)))),
            Row(children: [
              const Padding(padding: EdgeInsets.only(right: 8), child: Text('Mood', style: TextStyle(color: GlamColors.ivory, fontSize: 12))),
              Expanded(child: SizedBox(height: 48, child: ListView(
                scrollDirection: Axis.horizontal,
                children: List.generate(moods.length, (i) => _MoodDot(
                  index: i, selected: state.mood == i, onTap: () => controller.mood(i))),
              ))),
            ]),
            FilledButton.icon(key: const ValueKey('studio-brief'), onPressed: () => glamSheet(context, const _BriefComposer()),
              icon: const Icon(Icons.edit_outlined), label: Text(state.brief.isEmpty ? 'Imagine a look' : 'Refine my brief')),
            const SizedBox(height: 6), Semantics(identifier: state.brief.isEmpty ? 'brief-status-empty' : 'brief-status-saved', liveRegion: true,
              child: Text(state.brief.isEmpty ? 'Session-only brief · generation offline' : 'Brief kept for this preview. No AI image generated.',
                textAlign: TextAlign.center, style: const TextStyle(color: Color(0xffcbb8c3), fontSize: 10))),
          ])))),
      ]))),
    );
  }
}

class _MoodDot extends StatelessWidget {
  const _MoodDot({required this.index, required this.selected, required this.onTap});
  final int index;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(label: 'Mood ${index + 1}', selected: selected, button: true,
    child: InkWell(key: ValueKey('mood-$index'), onTap: onTap,
      child: SizedBox(width: 48, child: Center(child: Container(width: 26, height: 26,
        decoration: BoxDecoration(shape: BoxShape.circle, color: moods[index],
          border: Border.all(color: selected ? Colors.white : Colors.transparent, width: 3)))))));
}

class _ComparisonClip extends CustomClipper<Rect> {
  const _ComparisonClip(this.fraction);
  final double fraction;
  @override
  Rect getClip(Size size) => Rect.fromLTWH(0, 0, size.width * fraction, size.height);
  @override
  bool shouldReclip(_ComparisonClip oldClipper) => fraction != oldClipper.fraction;
}

class _BriefComposer extends ConsumerStatefulWidget {
  const _BriefComposer();
  @override
  ConsumerState<_BriefComposer> createState() => _BriefComposerState();
}

class _BriefComposerState extends ConsumerState<_BriefComposer> {
  late final text = TextEditingController(text: ref.read(previewProvider).brief);
  @override
  void dispose() { text.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => SheetContent(title: 'What are you imagining?',
    body: 'Give your next look a little direction. This saves a local preview brief; generation is not connected.', children: [
      Semantics(identifier: 'brief-input', child: TextField(key: const ValueKey('brief-input'), controller: text, maxLength: 300, minLines: 2, maxLines: 4,
        textInputAction: TextInputAction.done,
        onEditingComplete: () => FocusScope.of(context).unfocus(),
        onTapOutside: (_) => FocusScope.of(context).unfocus(),
        decoration: InputDecoration(labelText: 'Creative brief', hintText: 'Soft rose tones, an effortless evening…',
          filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none)))),
      const SizedBox(height: 16), FilledButton(key: const ValueKey('brief-save'), onPressed: () {
        ref.read(previewProvider.notifier).brief(text.text); Navigator.of(context, rootNavigator: true).pop();
      }, child: const Text('Keep this brief')),
    ]);
}
