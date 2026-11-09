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
      child: SafeArea(bottom: false, child: CustomScrollView(slivers: [
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(24, 10, 16, 14), child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Eyebrow('The creative space', color: GlamColors.champagne),
            Text('Studio', style: Theme.of(context).textTheme.headlineLarge!.copyWith(color: GlamColors.ivory)),
          ])),
          RoundAction(icon: Icons.chat_bubble_outline, label: 'Ask your stylist', dark: true,
            onPressed: () => context.push('/advisor')),
          const SizedBox(width: 8), RoundAction(icon: Icons.tune, label: 'Studio settings', dark: true,
            onPressed: () => glamSheet(context, const SheetContent(title: 'Make room to experiment.',
              body: 'Pinch the reference to explore details. Drag the comparison control for an on-device monochrome study. This is an editorial reference, not an AI transformation.'))),
        ]))),
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child:
          ClipRRect(borderRadius: BorderRadius.circular(32), child: SizedBox(
            height: MediaQuery.sizeOf(context).height < 760 ? 330 : 410,
            child: Stack(fit: StackFit.expand, children: [
              InteractiveViewer(key: const ValueKey('studio-canvas'), minScale: 1, maxScale: 3,
                child: Stack(fit: StackFit.expand, children: [
                  const Portrait(index: 1),
                  ClipRect(clipper: _ComparisonClip(state.compare), child: const ColorFiltered(
                    colorFilter: ColorFilter.matrix([.21,.72,.07,0,0, .21,.72,.07,0,0, .21,.72,.07,0,0, 0,0,0,1,0]),
                    child: Portrait(index: 1))),
                ])),
              Positioned(top: 18, left: 18, child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(20)),
                child: const Eyebrow('Colour study · not AI', color: GlamColors.ivory))),
              Positioned(bottom: 20, left: 18, right: 18, child: Column(children: [
                const Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Expanded(child: Text('Monochrome', style: TextStyle(color: Colors.white, fontSize: 11, shadows: [Shadow(blurRadius: 6)]))),
                  Expanded(child: Text('Original', textAlign: TextAlign.end, style: TextStyle(color: Colors.white, fontSize: 11, shadows: [Shadow(blurRadius: 6)]))),
                ]),
                Slider(key: const ValueKey('studio-comparison'), value: state.compare, onChanged: controller.compare,
                  activeColor: GlamColors.blush, inactiveColor: Colors.white60,
                  semanticFormatterCallback: (value) => '${(value * 100).round()} percent monochrome'),
              ])),
            ]),
          )),
        )),
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(12, 16, 12, 6), child: SizedBox(height: 54,
          child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: tools.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8), itemBuilder: (_, index) => ChoiceChip(
              key: ValueKey('tool-$index'), selected: state.tool == index, label: Text(tools[index]),
              selectedColor: GlamColors.blush, backgroundColor: const Color(0xff2e2830),
              labelStyle: TextStyle(color: state.tool == index ? GlamColors.ink : GlamColors.ivory),
              side: BorderSide.none, showCheckmark: false, onSelected: (_) => controller.tool(index)),
          ),
        ))),
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 24), child: Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 2, children: [
          const Padding(padding: EdgeInsets.only(right: 12), child: Eyebrow('The mood', color: GlamColors.champagne)),
          ...List.generate(moods.length, (i) => Semantics(label: 'Mood ${i + 1}', selected: state.mood == i, button: true,
            child: InkWell(key: ValueKey('mood-$i'), onTap: () => controller.mood(i), borderRadius: BorderRadius.circular(24),
              child: SizedBox(width: 44, height: 48, child: Center(child: Container(width: 26, height: 26,
                decoration: BoxDecoration(shape: BoxShape.circle, color: moods[i],
                  border: Border.all(color: state.mood == i ? Colors.white : Colors.transparent, width: 3)))))))),
        ]))),
        SliverPadding(padding: const EdgeInsets.fromLTRB(24, 12, 24, 24), sliver: SliverToBoxAdapter(child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            FilledButton.icon(key: const ValueKey('studio-brief'), onPressed: () => glamSheet(context, const _BriefComposer()),
              icon: const Icon(Icons.auto_awesome_outlined), label: Text(state.brief.isEmpty ? 'Imagine a look' : 'Refine my brief')),
            const SizedBox(height: 12), Text(state.brief.isEmpty ? 'Editorial reference · create a brief to explore the interaction.' : 'Brief kept for this preview. No AI image generated.',
              textAlign: TextAlign.center, style: const TextStyle(color: Color(0xffcbb8c3), fontSize: 10)),
          ],
        ))),
      ])),
    );
  }
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
      TextField(key: const ValueKey('brief-input'), controller: text, maxLength: 300, minLines: 2, maxLines: 4,
        textInputAction: TextInputAction.done,
        onEditingComplete: () => FocusScope.of(context).unfocus(),
        onTapOutside: (_) => FocusScope.of(context).unfocus(),
        decoration: InputDecoration(hintText: 'Soft rose tones, an effortless evening…',
          filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none))),
      const SizedBox(height: 16), FilledButton(key: const ValueKey('brief-save'), onPressed: () {
        ref.read(previewProvider.notifier).brief(text.text); Navigator.of(context, rootNavigator: true).pop();
      }, child: const Text('Keep this brief')),
    ]);
}
