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
    final state = ref.watch(previewProvider);
    return ColoredBox(key: const ValueKey('screen-home'), color: GlamColors.charcoal,
      child: SafeArea(bottom: false, child: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 24), children: [
        Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.asset('assets/brand/app-icon.png', width: 36, height: 36, semanticLabel: 'GLAM Beauty')),
          const SizedBox(width: 12), const Expanded(child: Text('Home', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: GlamColors.ivory))),
          RoundAction(icon: Icons.notifications_none, label: 'Inbox', dark: true,
            onPressed: () => glamSheet(context, const SheetContent(title: 'Inbox', body: 'No notifications in this design preview.'))),
        ]),
        const SizedBox(height: 24), const Text('Start a session', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: GlamColors.ivory)),
        const SizedBox(height: 12),
        _SessionAction(key: const ValueKey('home-analyze'), icon: Icons.center_focus_strong, title: 'Analyze', subtitle: 'Photo guide', onTap: () => context.go('/analyze')),
        _SessionAction(icon: Icons.tune, title: 'Studio', subtitle: state.brief.isEmpty ? 'Create a look brief' : 'Resume your brief', onTap: () => context.go('/studio')),
        _SessionAction(icon: Icons.chat_bubble_outline, title: 'Personal stylist', subtitle: 'Choose an occasion', onTap: () => context.push('/advisor')),
        const SizedBox(height: 20), Row(children: [
          const Expanded(child: Text('Your library', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: GlamColors.ivory))),
          TextButton(onPressed: () => context.push('/collection/saved'), child: Text('${state.saved.length} saved', style: const TextStyle(color: GlamColors.blush))),
        ]),
        if (state.saved.isEmpty) Material(color: const Color(0xff262329), borderRadius: BorderRadius.circular(18),
          child: ListTile(contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), leading: const Icon(Icons.bookmark_outline, color: GlamColors.blush),
            title: const Text('No saved looks', style: TextStyle(color: GlamColors.ivory)), subtitle: const Text('Collect inspiration in Discover', style: TextStyle(color: Color(0xffcbb8c3))),
            trailing: const Icon(Icons.chevron_right, color: GlamColors.blush), onTap: () => context.go('/discover')))
        else SizedBox(height: 164, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: state.saved.length,
          separatorBuilder: (_, _) => const SizedBox(width: 10), itemBuilder: (_, i) {
            final index = state.saved.elementAt(i);
            return Semantics(label: 'Open saved look ${index + 1}', button: true, child: GestureDetector(onTap: () => context.push('/look/$index'),
              child: SizedBox(width: 124, child: ClipRRect(borderRadius: BorderRadius.circular(16), child: Portrait(index: [2, 1, 0][index])))));
          })),
        const SizedBox(height: 24), const Text('Explore', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: GlamColors.ivory)),
        const SizedBox(height: 12), Row(children: [
          Expanded(child: _Explore(index: 1, title: 'Beauty edits', onTap: () => context.go('/discover'))), const SizedBox(width: 12),
          Expanded(child: _Explore(index: 2, title: 'Style Passport', onTap: () => context.push('/collection/passport'))),
        ]),
      ])),
    );
  }
}

class _SessionAction extends StatelessWidget {
  const _SessionAction({super.key, required this.icon, required this.title, required this.subtitle, required this.onTap});
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Material(color: const Color(0xff262329), borderRadius: BorderRadius.circular(18),
    child: ListTile(minTileHeight: 76, leading: Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: GlamColors.blush, borderRadius: BorderRadius.circular(14)), child: Icon(icon, color: GlamColors.ink)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: GlamColors.ivory)), subtitle: Text(subtitle, style: const TextStyle(color: Color(0xffcbb8c3), fontSize: 12)),
      trailing: const Icon(Icons.chevron_right, color: GlamColors.blush), onTap: onTap)));
}
class _Explore extends StatelessWidget {
  const _Explore({required this.index, required this.title, required this.onTap});
  final int index;
  final String title;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(color: const Color(0xff262329), borderRadius: BorderRadius.circular(16), clipBehavior: Clip.antiAlias,
    child: InkWell(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SizedBox(height: 136, child: Portrait(index: index)), Padding(padding: const EdgeInsets.all(12), child: Text(title, style: const TextStyle(color: GlamColors.ivory, fontWeight: FontWeight.w600))),
    ])));
}
