import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import '../screens/design_render.dart';
import '../screens/discover_screen.dart';
import '../screens/generated_ids.dart';
import '../screens/generated_page.dart';
import '../screens/home_screen.dart';
import '../screens/pending_screen.dart';
import '../screens/photo_landing.dart';
import '../screens/profile_screen.dart';
import 'chrome.dart';
import 'nav.dart';
import 'route_table.dart';

const interimAnalysisPath = '/analyze/interim-capture';

/// go_router configuration: the five consumer tabs are branches of one
/// StatefulShellRoute (state is kept per tab); every other design screen is a
/// full-screen route at its proposed path. Screens without a native
/// implementation resolve to [PendingScreen], never a fake success.
GoRouter buildRouter({required GlobalKey<NavigatorState> navigatorKey, required WidgetBuilder interimAnalysis, String initialLocation = '/home'}) {
  final generatedIds = kGeneratedScreenIds;
  final tabPaths = GlamNav.tabRoots.values.toSet();
  final seen = <String>{...tabPaths, interimAnalysisPath};
  final builders = <String, WidgetBuilder>{
    '/home': (_) => const HomeScreen(),
    '/analyze': (_) => const AnalyzeLandingScreen(),
    '/studio': (_) => const StudioLandingScreen(),
    '/discover': (_) => const DiscoverFeedScreen(),
    '/profile': (_) => const ProfileOverviewScreen(),
  };
  return GoRouter(
    navigatorKey: navigatorKey, initialLocation: initialLocation, debugLogDiagnostics: false,
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => GlamShell(navigationShell: shell),
        branches: [
          for (final path in ['/home', '/analyze', '/studio', '/discover', '/profile'])
            StatefulShellBranch(routes: [GoRoute(path: path, builder: (context, state) => builders[path]!(context))]),
        ],
      ),
      GoRoute(path: interimAnalysisPath, builder: (context, state) => interimAnalysis(context)),
      for (final s in designScreens)
        if (seen.add(s.path))
          GoRoute(path: s.path, builder: (context, state) => generatedIds.contains(s.id) ? GeneratedPage(screen: s) : PendingScreen(
            screen: s,
            // The existing, working camera-first analysis stays reachable until
            // the exact GL-018..GL-025 screens replace it (Batch 2).
            interimLabel: s.id == 'GL-018' ? 'Open current analysis (interim)' : null,
            onInterim: s.id == 'GL-018' ? () => context.push(interimAnalysisPath) : null,
          )),
    ],
  );
}
