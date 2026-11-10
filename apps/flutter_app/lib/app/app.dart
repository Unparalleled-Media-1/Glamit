import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/semantics.dart';
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

class GlamBeautyApp extends ConsumerStatefulWidget {
  const GlamBeautyApp({super.key});
  @override
  ConsumerState<GlamBeautyApp> createState() => _GlamBeautyAppState();
}

class _GlamBeautyAppState extends ConsumerState<GlamBeautyApp> {
  late final SemanticsHandle _semantics;
  @override
  void initState() {
    super.initState();
    // Keep real native accessibility nodes available from the first frame.
    _semantics = WidgetsBinding.instance.ensureSemantics();
  }
  @override
  void dispose() { _semantics.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => MaterialApp.router(
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
        bottomNavigationBar: _PlatformTabs(index: shell.currentIndex, dark: dark, onSelect: (index) {
          HapticFeedback.selectionClick(); shell.goBranch(index, initialLocation: index == shell.currentIndex);
        }),
      ),
    );
  }
}

class _PlatformTabs extends StatelessWidget {
  const _PlatformTabs({required this.index, required this.dark, required this.onSelect});
  final int index;
  final bool dark;
  final ValueChanged<int> onSelect;
  static const labels = ['Home', 'Analyze', 'Studio', 'Discover', 'Profile'];
  static const icons = [Icons.home_outlined, Icons.center_focus_strong_outlined, Icons.auto_awesome_outlined, Icons.explore_outlined, Icons.person_outline];
  Widget icon(int i) => Semantics(identifier: 'tab-${labels[i].toLowerCase()}', label: labels[i], button: true, selected: i == index,
    child: SizedBox(key: ValueKey('tab-${labels[i].toLowerCase()}'), width: 32, height: 28, child: Icon(icons[i])));
  @override
  Widget build(BuildContext context) {
    final background = dark ? GlamColors.charcoal : GlamColors.ivory;
    if (Theme.of(context).platform == TargetPlatform.iOS) {
      return CupertinoTabBar(currentIndex: index, onTap: onSelect, backgroundColor: background,
        activeColor: dark ? GlamColors.blush : GlamColors.mauve, inactiveColor: dark ? Colors.white60 : GlamColors.muted,
        items: List.generate(5, (i) => BottomNavigationBarItem(icon: icon(i), label: labels[i])));
    }
    return NavigationBarTheme(data: NavigationBarThemeData(labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(fontSize: 11, color: dark ? GlamColors.ivory : GlamColors.ink))),
      child: NavigationBar(selectedIndex: index, onDestinationSelected: onSelect, backgroundColor: background,
      indicatorColor: GlamColors.blush, height: 72,
      destinations: List.generate(5, (i) => NavigationDestination(icon: IconTheme(data: IconThemeData(color: i == index ? GlamColors.ink : dark ? GlamColors.ivory : GlamColors.muted), child: icon(i)), label: labels[i]))));
  }
}
