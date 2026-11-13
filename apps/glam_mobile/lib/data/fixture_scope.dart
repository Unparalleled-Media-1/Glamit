import 'package:flutter/widgets.dart';
import 'fixtures.dart';

/// Whether design-reference sample content may be shown below this widget.
/// Defaults to [kReferenceFixtures]; tests and previews can override it.
class FixtureScope extends InheritedWidget {
  const FixtureScope({super.key, required this.enabled, required super.child});
  final bool enabled;
  static bool of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<FixtureScope>()?.enabled ?? kReferenceFixtures;
  @override
  bool updateShouldNotify(FixtureScope old) => enabled != old.enabled;
}
