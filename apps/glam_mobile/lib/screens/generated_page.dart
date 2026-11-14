import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../shell/nav.dart';
import '../shell/route_table.dart';
import 'design_render.dart';


/// Full-screen page for a design screen implemented by the generated renderer (see scripts/design-extract).
/// Every control navigates to the destination the design defines; unknown destinations never fail silently.
class GeneratedPage extends StatefulWidget {
  const GeneratedPage({super.key, required this.screen});
  final DesignScreen screen;
  /// Screens currently stacked, so a design "back" control pops instead of growing the stack.
  static final trail = <String>[];
  @override State<GeneratedPage> createState() => _GeneratedPageState();
}
class _GeneratedPageState extends State<GeneratedPage> {
  @override void initState() { super.initState(); GeneratedPage.trail.add(widget.screen.id); }
  @override void dispose() { GeneratedPage.trail.remove(widget.screen.id); super.dispose(); }
  void _go(String id) {
    final t = GeneratedPage.trail;
    if (t.length >= 2 && t[t.length - 2] == id && context.canPop()) { context.pop(); return; }
    if (GlamNav.screen(id) == null) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(const SnackBar(content: Text('This destination is not part of the design registry.')));
      return;
    }
    GlamNav.to(context, id);
  }
  @override Widget build(BuildContext context) => Scaffold(
    backgroundColor: Theme.of(context).scaffoldBackgroundColor,
    body: Semantics(identifier: 'screen-${widget.screen.id}', container: true, explicitChildNodes: true,
      child: FutureBuilder<Map<String, dynamic>>(future: DesignStore.load(), builder: (_, snap) => snap.hasData
        ? GeneratedScreen(id: widget.screen.id, go: _go) : const SizedBox.expand())));
}
