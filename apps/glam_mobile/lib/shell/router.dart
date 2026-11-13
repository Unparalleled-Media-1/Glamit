import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import '../screens/discover_screen.dart';
import '../screens/analyze_intro.dart';
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
GoRouter buildRouter({required GlobalKey<NavigatorState> navigatorKey, required Widget Function(BuildContext context, CaptureStart start) interimAnalysis, String initialLocation = '/home'}) {
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
      GoRoute(path: interimAnalysisPath, builder: (context, state) => interimAnalysis(context, (state.extra as CaptureStart?) ?? CaptureStart.idle)),
      for (final s in designScreens)
        if (seen.add(s.path))
          GoRoute(path: s.path, builder: (context, state) {
            // Hand-built screens over the real private-analysis flow (camera, consent, server analysis, results, history).
            switch (s.id) {
              case 'GL-018': return ChooseAnalysisScreen(onContinue: () => GlamNav.to(context, 'GL-019'));
              case 'GL-019': return PrepareScreen(onStart: (how) => context.push(interimAnalysisPath, extra: how));
              case 'GL-020' || 'GL-023' || 'GL-024' || 'GL-025': return interimAnalysis(context, CaptureStart.camera);
              case 'GL-026' || 'GL-027' || 'GL-028' || 'GL-029' || 'GL-030' || 'GL-031' || 'GL-032' || 'GL-033' || 'GL-034': return interimAnalysis(context, CaptureStart.idle);
            }
            return generatedIds.contains(s.id) ? GeneratedPage(screen: s) : PendingScreen(screen: s);
          }),
    ],
  );
}
