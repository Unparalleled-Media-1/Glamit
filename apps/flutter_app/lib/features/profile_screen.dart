import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app/preview_state.dart';
import '../app/theme.dart';
import '../widgets/glam_widgets.dart';
import 'discover_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(previewProvider);
    return ColoredBox(key: const ValueKey('screen-profile'), color: GlamColors.ivory,
      child: SafeArea(bottom: false, child: CustomScrollView(slivers: [
        SliverPadding(padding: const EdgeInsets.fromLTRB(24, 16, 16, 24), sliver: SliverToBoxAdapter(child: Row(children: [
          Expanded(child: Text('Your own rhythm.', style: Theme.of(context).textTheme.headlineLarge)),
          RoundAction(icon: Icons.more_horiz, label: 'Preview options', onPressed: () => _privacy(context, ref)),
        ]))),
        SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 24), sliver: SliverToBoxAdapter(child: Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(24), child: Image.asset('assets/brand/app-icon.png', width: 76, height: 76)),
          const SizedBox(width: 18), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Eyebrow('A space that is yours'), const SizedBox(height: 6),
            Text('Make it personal.', style: Theme.of(context).textTheme.headlineMedium),
            TextButton(key: const ValueKey('profile-signin'), style: TextButton.styleFrom(padding: EdgeInsets.zero,
              alignment: Alignment.centerLeft), onPressed: () => glamSheet(context, const SheetContent(
                title: 'One identity. All of you.', body: 'Sign-in is not connected in this Flutter design preview. No account is active, and no credentials are collected.')),
              child: const Text('Explore account access →')),
          ])),
        ]))),
        SliverPadding(padding: const EdgeInsets.fromLTRB(24, 24, 24, 16), sliver: SliverToBoxAdapter(child:
          Material(color: GlamColors.ink, borderRadius: BorderRadius.circular(28), child: InkWell(
            key: const ValueKey('profile-passport'), borderRadius: BorderRadius.circular(28), onTap: () => context.push('/collection/passport'),
            child: Padding(padding: const EdgeInsets.all(24), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [Expanded(child: Eyebrow('Style Passport', color: GlamColors.champagne)), Icon(Icons.north_east, color: GlamColors.blush, size: 22)]),
              const SizedBox(height: 20), Text('The details\nthat make you, you.', style: Theme.of(context).textTheme.headlineLarge!.copyWith(color: GlamColors.ivory)),
              const SizedBox(height: 12), const Text('Your palette, preferences and beauty story.', style: TextStyle(color: Color(0xffdfd1d5), fontSize: 12)),
            ])),
          )),
        )),
        SliverPadding(padding: const EdgeInsets.fromLTRB(24, 0, 24, 20), sliver: SliverToBoxAdapter(child: Row(children: [
          _Count(value: '${state.saved.length}', label: 'Collected edits'),
          const _Count(value: '0', label: 'Saved reports'),
          _Count(value: state.brief.isEmpty ? '0' : '1', label: 'Creative briefs'),
        ]))),
        SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 24), sliver: SliverToBoxAdapter(child: Column(children: [
          _Group(children: [
            NativeRow(icon: Icons.bookmark_border, title: 'Saved inspiration', subtitle: 'Kept in this preview session', onTap: () => context.push('/collection/saved')),
            NativeRow(icon: Icons.checkroom_outlined, title: 'My wardrobe', onTap: () => context.push('/collection/wardrobe')),
            NativeRow(icon: Icons.auto_awesome_outlined, title: 'My creative brief', onTap: () => context.push('/collection/brief')),
          ]), const SizedBox(height: 18),
          _Group(children: [
            NativeRow(icon: Icons.shopping_bag_outlined, title: 'Purchases & appointments', onTap: () => context.push('/collection/orders')),
            NativeRow(icon: Icons.workspaces_outline, title: 'My workspaces', onTap: () => glamSheet(context, const SheetContent(title: 'Your personal side. Your business side.',
              body: 'Approved organizations will appear here after sign-in. This preview has no active organization and cannot grant business permissions.'))),
            NativeRow(icon: Icons.shield_outlined, title: 'Privacy & preview data', onTap: () => _privacy(context, ref)),
          ]), const SizedBox(height: 24),
          const Text('GLAM Beauty · Flutter visual review\nNo connected account or live services', textAlign: TextAlign.center,
            style: TextStyle(color: GlamColors.muted, fontSize: 10, height: 1.8)),
          const SizedBox(height: 28),
        ]))),
      ])),
    );
  }
  void _privacy(BuildContext context, WidgetRef ref) => glamSheet(context, SheetContent(
    title: 'Your space. Your control.', body: 'This design preview keeps only your selected mood, saved editorial references and creative brief in memory. No personal photo, account or server record is created.',
    children: [
      OutlinedButton.icon(onPressed: () async {
        await Clipboard.setData(const ClipboardData(text: 'hello@glamit.beauty'));
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Support email copied')));
      }, icon: const Icon(Icons.copy_outlined), label: const Text('hello@glamit.beauty')),
      const SizedBox(height: 12), FilledButton(key: const ValueKey('clear-preview'), onPressed: () {
        ref.read(previewProvider.notifier).clear(); Navigator.pop(context);
      }, child: const Text('Clear preview selections')),
    ],
  ));
}

class _Group extends StatelessWidget {
  const _Group({required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => ClipRRect(borderRadius: BorderRadius.circular(24),
    child: ColoredBox(color: Colors.white.withValues(alpha: .65), child: Column(children: children)));
}
class _Count extends StatelessWidget {
  const _Count({required this.value, required this.label});
  final String value, label;
  @override
  Widget build(BuildContext context) => Expanded(child: Column(children: [
    Text(value, style: Theme.of(context).textTheme.headlineLarge), const SizedBox(height: 4),
    Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, color: GlamColors.muted)),
  ]));
}

class CollectionScreen extends ConsumerWidget {
  const CollectionScreen({super.key, required this.kind});
  final String kind;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(previewProvider);
    final title = {'saved': 'Collected inspiration', 'passport': 'Style Passport', 'wardrobe': 'My wardrobe',
      'brief': 'My creative brief', 'orders': 'Purchases & appointments'}[kind] ?? 'Your collection';
    Widget body;
    if (kind == 'saved' && state.saved.isNotEmpty) {
      body = ListView(padding: const EdgeInsets.all(24), children: [
        const Text('Editorial references saved in this preview session.'), const SizedBox(height: 20),
        for (final index in state.saved) Padding(padding: const EdgeInsets.only(bottom: 20), child: Material(
          color: Colors.white, borderRadius: BorderRadius.circular(24), clipBehavior: Clip.antiAlias,
          child: InkWell(onTap: () => context.push('/look/$index'), child: Column(children: [
            SizedBox(height: 260, child: Portrait(index: [2, 1, 0][index])),
            ListTile(title: Text(lookNames[index]), trailing: IconButton(tooltip: 'Unsave inspiration',
              onPressed: () => ref.read(previewProvider.notifier).toggleSaved(index), icon: const Icon(Icons.bookmark))),
          ])),
        )),
      ]);
    } else if (kind == 'brief' && state.brief.isNotEmpty) {
      body = Padding(padding: const EdgeInsets.all(28), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Eyebrow('Your local creative direction'), const SizedBox(height: 20),
        Text(state.brief, style: Theme.of(context).textTheme.headlineLarge), const SizedBox(height: 20),
        const Text('Kept in this preview session. No generated look or account record exists.'),
        const SizedBox(height: 24), FilledButton(onPressed: () => context.go('/studio'), child: const Text('Refine in Studio')),
      ]));
    } else {
      body = Center(child: EmptyMoment(icon: kind == 'passport' ? Icons.fingerprint : Icons.bookmark_border,
        title: kind == 'passport' ? 'Your story starts here.' : 'A little space for what comes next.',
        body: kind == 'passport'
          ? 'Your saved analysis and personal corrections will make this passport yours. No analysis report is connected in this design preview.'
          : 'No account records are connected. You can explore and collect editorial inspiration locally in Discover.',
        action: 'Explore Discover', onTap: () => context.go('/discover')));
    }
    return Scaffold(key: ValueKey('screen-collection-$kind'), appBar: AppBar(title: Text(title)), body: SafeArea(top: false, child: body));
  }
}

class AdvisorScreen extends StatelessWidget {
  const AdvisorScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Your personal stylist')),
    body: SafeArea(child: SingleChildScrollView(padding: const EdgeInsets.all(28), child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Eyebrow('A conversation about you'), const SizedBox(height: 24),
        Text('What are you\ndressing for?', style: Theme.of(context).textTheme.displayMedium),
        const SizedBox(height: 24),
        for (final title in ['An everyday reset', 'A moment to remember', 'Somewhere new']) Padding(
          padding: const EdgeInsets.only(bottom: 12), child: OutlinedButton(
            onPressed: () => glamSheet(context, SheetContent(title: title,
              body: 'Your personal styling conversation will begin here. AI advice is not connected in this design preview; no prompt has been sent.',
              children: [FilledButton(onPressed: () { Navigator.pop(context); context.go('/studio'); }, child: const Text('Build a creative brief'))])),
            style: OutlinedButton.styleFrom(minimumSize: const Size(48, 56)), child: Text(title))),
        const SizedBox(height: 20), const Text('No AI response is simulated.', style: TextStyle(color: GlamColors.muted, fontSize: 11)),
      ],
    ))));
}
