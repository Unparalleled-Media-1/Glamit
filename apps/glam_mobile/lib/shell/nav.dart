import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'route_table.dart';

abstract final class GlamNav {
  static const tabRoots = {'home': '/home', 'GL-017': '/analyze', 'GL-035': '/studio', 'GL-069': '/discover', 'GL-117': '/profile'};
  static final Map<String, DesignScreen> _byId = {for (final s in designScreens) s.id: s};
  static DesignScreen? screen(String id) => _byId[id];
  static String location(String id) {
    final s = _byId[id];
    if (s == null) throw ArgumentError('Unknown design screen $id');
    return s.path.replaceAllMapped(RegExp(r':\w+'), (_) => 'pending');
  }
  /// Navigate to a design screen by its design ID: tab roots switch branches,
  /// everything else is pushed so native back returns to the origin.
  static void to(BuildContext context, String id) {
    final loc = location(id);
    if (tabRoots.containsKey(id)) { context.go(loc); } else { context.push(loc); }
  }
}
