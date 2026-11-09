import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/analyze_screen.dart';
import '../features/discover_screen.dart';
import '../features/home_screen.dart';
import '../features/profile_screen.dart';
import '../features/studio_screen.dart';
import 'theme.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final root = GlobalKey<NavigatorState>();
  final router = GoRouter(navigatorKey: root, initialLocation: '/home', routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => MobileShell(shell: shell),
      branches: [
        StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (_, _) => const HomeScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/analyze', builder: (_, _) => const AnalyzeScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/studio', builder: (_, _) => const StudioScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/discover', builder: (_, _) => const DiscoverScreen())]),
        StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen())]),
      ],
    ),
    GoRoute(path: '/look/:id', pageBuilder: (context, state) => nativePage(context, state,
      LookScreen(id: int.tryParse(state.pathParameters['id'] ?? '') ?? 0))),
    GoRoute(path: '/collection/:kind', pageBuilder: (context, state) => nativePage(context, state,
      CollectionScreen(kind: state.pathParameters['kind'] ?? 'saved'))),
    GoRoute(path: '/advisor', pageBuilder: (context, state) => nativePage(context, state, const AdvisorScreen())),
  ], errorBuilder: (context, state) => Scaffold(body: SafeArea(child: Center(child:
    FilledButton(onPressed: () => context.go('/home'), child: const Text('Return Home'))))));
  ref.onDispose(router.dispose);
  return router;
});

Page<void> nativePage(BuildContext context, GoRouterState state, Widget child) =>
  Theme.of(context).platform == TargetPlatform.iOS
    ? CupertinoPage<void>(key: state.pageKey, child: child)
    : MaterialPage<void>(key: state.pageKey, child: child);

class GlamBeautyApp extends ConsumerWidget {
  const GlamBeautyApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
    title: 'GLAM Beauty', debugShowCheckedModeBanner: false,
    theme: glamTheme(), routerConfig: ref.watch(routerProvider),
  );
}

class MobileShell extends StatelessWidget {
  const MobileShell({super.key, required this.shell});
  final StatefulNavigationShell shell;
  @override
  Widget build(BuildContext context) {
    final dark = shell.currentIndex < 4;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Scaffold(backgroundColor: dark ? GlamColors.charcoal : GlamColors.ivory,
        body: shell,
        bottomNavigationBar: DecoratedBox(
          decoration: BoxDecoration(color: dark ? GlamColors.charcoal : GlamColors.ivory,
            border: Border(top: BorderSide(color: dark ? Colors.white12 : GlamColors.line))),
          child: SafeArea(top: false, child: Padding(padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
            child: Row(children: List.generate(5, (index) {
              const labels = ['Home', 'Analyze', 'Studio', 'Discover', 'Profile'];
              const icons = [Icons.home_outlined, Icons.center_focus_strong_outlined,
                Icons.auto_awesome_outlined, Icons.explore_outlined, Icons.person_outline];
              final selected = shell.currentIndex == index;
              return Expanded(child: Semantics(identifier: 'tab-${labels[index].toLowerCase()}', selected: selected, button: true,
                label: labels[index], excludeSemantics: true,
                child: InkWell(key: ValueKey('tab-${labels[index].toLowerCase()}'),
                  borderRadius: BorderRadius.circular(24),
                  onTap: () { HapticFeedback.selectionClick(); shell.goBranch(index, initialLocation: selected); },
                  child: Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Column(mainAxisSize: MainAxisSize.min, children: [
                    AnimatedContainer(duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      decoration: BoxDecoration(color: selected ? GlamColors.blush : Colors.transparent,
                        borderRadius: BorderRadius.circular(18)),
                      child: Icon(icons[index], size: 23,
                        color: selected ? GlamColors.ink : dark ? GlamColors.ivory : GlamColors.muted)),
                    const SizedBox(height: 3), Text(labels[index], style: TextStyle(fontSize: 10,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                      color: selected ? dark ? GlamColors.blush : GlamColors.ink : dark ? GlamColors.ivory : GlamColors.muted)),
                  ])),
                ),
              ));
            })),
          )),
        ),
      ),
    );
  }
}
