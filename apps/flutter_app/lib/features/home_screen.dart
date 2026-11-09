import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/preview_state.dart';
import '../app/theme.dart';
import '../widgets/glam_widgets.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(previewProvider).saved.length;
    return ColoredBox(key: const ValueKey('screen-home'), color: GlamColors.charcoal,
      child: CustomScrollView(slivers: [
        SliverToBoxAdapter(child: SafeArea(bottom: false, child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 16, 14), child: Row(children: [
            Image.asset('assets/brand/wordmark-dark.png', width: 132, height: 44, fit: BoxFit.contain,
              semanticLabel: 'GLAM Beauty'),
            const Expanded(child: Align(alignment: Alignment.centerRight, child: Eyebrow('Your daily muse', color: GlamColors.champagne))),
            const SizedBox(width: 8), RoundAction(icon: Icons.notifications_none, label: 'Inbox', dark: true,
              onPressed: () => glamSheet(context, const SheetContent(title: 'A little space for you.',
                body: 'Your reminders and updates will live here. There are no notifications in this design preview.'))),
          ]),
        ))),
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16),
          child: ClipRRect(borderRadius: BorderRadius.circular(32), child: Stack(children: [
            const Positioned.fill(child: Portrait(index: 0)),
            const Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(
              begin: Alignment.topCenter, end: Alignment.bottomCenter,
              colors: [Colors.transparent, Color(0x35181719), Color(0xf5181719)], stops: [0, .4, 1])))),
            Padding(padding: const EdgeInsets.all(24), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              DecoratedBox(decoration: BoxDecoration(color: Colors.black38, borderRadius: BorderRadius.circular(20)),
                child: const Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Eyebrow('Beauty, on your terms', color: GlamColors.ivory))),
              SizedBox(height: MediaQuery.sizeOf(context).height < 760 ? 88 : 138),
              Text('Your beauty,\nin focus.', style: Theme.of(context).textTheme.displayLarge!.copyWith(color: GlamColors.ivory)),
              const SizedBox(height: 12), const Text('A new way to see your possibilities.', style: TextStyle(color: GlamColors.ivory, fontSize: 13)),
              const SizedBox(height: 22), FilledButton.icon(key: const ValueKey('home-analyze'),
                onPressed: () => context.go('/analyze'), icon: const Icon(Icons.center_focus_strong),
                label: const Text('Find my beauty blueprint')),
            ])),
          ])),
        )),
        SliverPadding(padding: const EdgeInsets.fromLTRB(24, 24, 24, 10), sliver: SliverToBoxAdapter(child: Row(children: [
          Expanded(child: Text('A little more you.', style: Theme.of(context).textTheme.headlineMedium!.copyWith(color: GlamColors.ivory))),
          IconButton(tooltip: 'Open Discover', onPressed: () => context.go('/discover'),
            icon: const Icon(Icons.arrow_forward, color: GlamColors.blush)),
        ]))),
        SliverToBoxAdapter(child: SizedBox(height: 160 + (MediaQuery.textScalerOf(context).scale(13) - 13) * 10, child: ListView(
          scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 24), children: [
            _QuickEntry(title: 'Your personal stylist', subtitle: 'Start with a feeling', icon: Icons.chat_bubble_outline,
              onTap: () => context.push('/advisor')),
            const SizedBox(width: 12),
            _QuickEntry(title: 'Your collected looks', subtitle: '$saved saved in this preview', icon: Icons.bookmark_border,
              onTap: () => context.push('/collection/saved')),
          ],
        ))),
        const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.fromLTRB(24, 18, 24, 28),
          child: Text('Editorial imagery · Flutter design preview', style: TextStyle(color: Color(0xffcbb8c3), fontSize: 10)))),
      ]),
    );
  }
}

class _QuickEntry extends StatelessWidget {
  const _QuickEntry({required this.title, required this.subtitle, required this.icon, required this.onTap});
  final String title, subtitle;
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => SizedBox(width: 244, child: Material(
    color: const Color(0xff282329), borderRadius: BorderRadius.circular(24),
    child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(24),
      child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: GlamColors.blush, size: 22), const Spacer(),
        Text(title, style: const TextStyle(color: GlamColors.ivory, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4), Text(subtitle, style: const TextStyle(color: Color(0xffcbb8c3), fontSize: 11)),
      ])),
    ),
  ));
}
