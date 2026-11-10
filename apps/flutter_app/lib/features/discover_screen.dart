import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/preview_state.dart';
import '../app/theme.dart';
import '../widgets/glam_widgets.dart';

const lookNames = ['The soft-focus edit', 'A little after dark', 'Wear your own rhythm'];
const lookNotes = ['Warm tones. Quiet confidence.', 'A touch of drama, on your terms.', 'Texture, movement and a fresh perspective.'];

class DiscoverScreen extends ConsumerWidget {
  const DiscoverScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(previewProvider);
    final header = Padding(
      padding: const EdgeInsets.fromLTRB(24, 12, 16, 12),
      child: Row(children: [
        Expanded(child: const Text('Discover', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: GlamColors.ivory))),
        RoundAction(icon: Icons.bookmarks_outlined, label: 'Saved inspiration', dark: true,
          onPressed: () => context.push('/collection/saved')),
      ]),
    );
    final filters = SizedBox(height: 54, child: ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 24), scrollDirection: Axis.horizontal,
      separatorBuilder: (_, _) => const SizedBox(width: 20), itemCount: 4,
      itemBuilder: (_, i) => TextButton(key: ValueKey('discover-filter-$i'),
        onPressed: () => ref.read(previewProvider.notifier).filter(i),
        child: Text(['For you', 'Looks', 'Products', 'Professionals'][i], style: TextStyle(
          color: state.filter == i ? GlamColors.blush : const Color(0xffcbb8c3),
          fontWeight: state.filter == i ? FontWeight.w700 : FontWeight.w400))),
    ));
    final Widget feed;
    if (state.filter == 3) {
      feed = const SingleChildScrollView(child: Padding(padding: EdgeInsets.all(28), child: Column(
        mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.location_on_outlined, color: GlamColors.blush, size: 36), SizedBox(height: 20),
          Text('Good people, closer to you.', textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Cormorant', fontSize: 34, color: GlamColors.ivory)),
          SizedBox(height: 12), Text('Professional discovery is not connected in this preview. No location has been requested or local listing invented.',
            textAlign: TextAlign.center, style: TextStyle(color: Color(0xffcbb8c3))),
        ],
      )));
    } else {
      feed = PageView.builder(key: ValueKey('discover-feed-${state.filter}'),
        scrollDirection: Axis.vertical, itemCount: 3, itemBuilder: (context, index) => Padding(
          padding: EdgeInsets.zero,
          child: _DiscoverySlide(index: index, products: state.filter == 2,
            saved: state.saved.contains(index), onSave: () => ref.read(previewProvider.notifier).toggleSaved(index)),
        ),
      );
    }
    final largeText = MediaQuery.textScalerOf(context).scale(14) > 20;
    return ColoredBox(key: const ValueKey('screen-discover'), color: GlamColors.charcoal,
      child: SafeArea(bottom: false, child: largeText
        ? CustomScrollView(slivers: [SliverToBoxAdapter(child: header), SliverToBoxAdapter(child: filters),
            SliverToBoxAdapter(child: SizedBox(height: 680, child: feed))])
        : Column(children: [header, filters, Expanded(child: feed)])),
    );
  }
}

class _DiscoverySlide extends StatelessWidget {
  const _DiscoverySlide({required this.index, required this.products, required this.saved, required this.onSave});
  final int index;
  final bool products, saved;
  final VoidCallback onSave;
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, constraints) =>
    ClipRRect(borderRadius: BorderRadius.zero, child: Stack(fit: StackFit.expand, children: [
      Portrait(index: products ? index : [2, 1, 0][index], asset: products ? productAsset : beautyAsset),
      const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.center,
        end: Alignment.bottomCenter, colors: [Colors.transparent, Color(0xf5181719)]))),
      Positioned(left: 24, right: 24, bottom: 24, child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: (constraints.maxHeight - 96).clamp(0.0, double.infinity).toDouble()),
        child: SingleChildScrollView(reverse: true, child: Column(mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Eyebrow(products ? 'Product inspiration' : 'GLAM editorial', color: GlamColors.champagne),
            const SizedBox(height: 10), Text(products ? 'Your everyday rituals.' : lookNames[index],
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: GlamColors.ivory)),
            const SizedBox(height: 10), Text(products ? 'Reference imagery. No catalog, stock or price is connected.' : lookNotes[index],
              style: const TextStyle(color: GlamColors.ivory, fontSize: 12)),
            const SizedBox(height: 16), Semantics(identifier: 'open-look-$index', child: OutlinedButton.icon(key: ValueKey('open-look-$index'),
              style: OutlinedButton.styleFrom(foregroundColor: GlamColors.ivory,
                side: const BorderSide(color: Colors.white60), minimumSize: const Size(48, 48)),
              onPressed: () => context.push('/look/$index'), label: const Text('View look'),
              icon: const Icon(Icons.arrow_forward, size: 18))),
            const SizedBox(height: 10), const Text('Editorial reference · swipe for more',
              style: TextStyle(color: Color(0xffdfd1d5), fontSize: 10)),
          ],
        )),
      )),
      Positioned(top: 16, right: 16, child: RoundAction(key: ValueKey('save-look-$index'),
        icon: saved ? Icons.bookmark : Icons.bookmark_outline,
        label: saved ? 'Unsave inspiration' : 'Save inspiration', dark: true,
        active: saved, onPressed: onSave)),
    ])),
  );
}

class LookScreen extends ConsumerWidget {
  const LookScreen({super.key, required this.id});
  final int id;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = id.clamp(0, 2).toInt();
    final saved = ref.watch(previewProvider).saved.contains(index);
    return Scaffold(key: const ValueKey('screen-look'), body: CustomScrollView(slivers: [
      SliverAppBar(expandedHeight: MediaQuery.sizeOf(context).height * .56, pinned: true,
        backgroundColor: GlamColors.ivory, foregroundColor: GlamColors.ink,
        actions: [IconButton(tooltip: saved ? 'Unsave inspiration' : 'Save inspiration',
          onPressed: () => ref.read(previewProvider.notifier).toggleSaved(index),
          icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border))],
        flexibleSpace: FlexibleSpaceBar(background: Portrait(index: [2, 1, 0][index]))),
      SliverPadding(padding: const EdgeInsets.all(24), sliver: SliverToBoxAdapter(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Eyebrow('The GLAM edit'), const SizedBox(height: 10),
          Text(lookNames[index], style: Theme.of(context).textTheme.displayMedium),
          const SizedBox(height: 12), Text(lookNotes[index], style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 24), const Text('A study in warm blush, luminous texture and personal expression. Use it as inspiration for your own creative brief.'),
          const SizedBox(height: 20), const Wrap(spacing: 10, runSpacing: 10, children: [
            Chip(label: Text('Soft rose')), Chip(label: Text('Warm neutrals')), Chip(label: Text('Quiet glow')),
          ]), const SizedBox(height: 24),
          FilledButton.icon(key: const ValueKey('look-to-studio'), onPressed: () => context.go('/studio'),
            icon: const Icon(Icons.auto_awesome_outlined), label: const Text('Make it my starting point')),
          const SizedBox(height: 18), const Text('Editorial reference only. No creator endorsement, product match or generated result is implied.', style: TextStyle(fontSize: 11, color: GlamColors.muted)),
        ],
      ))),
    ]));
  }
}
