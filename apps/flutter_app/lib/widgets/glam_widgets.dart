import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/theme.dart';

const beautyAsset = 'assets/editorial/beauty-editorial.webp';
const styleAsset = 'assets/editorial/editorial.webp';
const productAsset = 'assets/editorial/beauty-products.webp';

class Portrait extends StatelessWidget {
  const Portrait({super.key, this.index = 0, this.asset = beautyAsset, this.height});
  final int index;
  final String asset;
  final double? height;
  @override
  Widget build(BuildContext context) => Image.asset(asset, width: double.infinity,
    height: height, fit: BoxFit.cover, alignment: Alignment(-1 + 2 * index / 3, 0),
    excludeFromSemantics: true, gaplessPlayback: true);
}

class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color = GlamColors.muted});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(), style:
    Theme.of(context).textTheme.labelSmall!.copyWith(color: color, fontWeight: FontWeight.w700));
}

class RoundAction extends StatelessWidget {
  const RoundAction({super.key, required this.icon, required this.label,
    required this.onPressed, this.dark = false, this.active = false});
  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool dark, active;
  @override
  Widget build(BuildContext context) => Semantics(
    identifier: key is ValueKey<String> ? (key as ValueKey<String>).value : null,
    child: IconButton(
    tooltip: label, onPressed: () { HapticFeedback.selectionClick(); onPressed(); },
    style: IconButton.styleFrom(
      foregroundColor: active ? GlamColors.ink : dark ? GlamColors.ivory : GlamColors.ink,
      backgroundColor: active ? GlamColors.blush : dark ? Colors.black.withValues(alpha: .3) : Colors.white.withValues(alpha: .7),
      side: BorderSide(color: dark ? Colors.white24 : GlamColors.line.withValues(alpha: .6)),
    ), icon: Icon(icon, size: 22)));
}

Future<T?> glamSheet<T>(BuildContext context, Widget child) => showModalBottomSheet<T>(
  context: context, useRootNavigator: true, isScrollControlled: true,
  builder: (context) => SafeArea(top: false, child: Padding(
    padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
    child: ConstrainedBox(constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .78),
      child: SingleChildScrollView(child: child)),
  )),
);

class SheetContent extends StatelessWidget {
  const SheetContent({super.key, required this.title, required this.body, this.children = const []});
  final String title, body;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const SizedBox(height: 4),
    Text(title, style: Theme.of(context).textTheme.headlineLarge),
    const SizedBox(height: 12), Text(body, style: Theme.of(context).textTheme.bodyLarge),
    const SizedBox(height: 24), ...children,
  ]);
}

class SectionHeading extends StatelessWidget {
  const SectionHeading(this.title, {super.key, this.action, this.onTap});
  final String title;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Row(children: [
    Expanded(child: Text(title, style: Theme.of(context).textTheme.headlineMedium)),
    if (action != null) TextButton(onPressed: onTap, child: Text(action!)),
  ]);
}

class NativeRow extends StatelessWidget {
  const NativeRow({super.key, required this.icon, required this.title, required this.onTap, this.subtitle});
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
    identifier: 'row-${title.toLowerCase().replaceAll(RegExp(r"[^a-z0-9]+"), "-")}',
    child: ListTile(
    minTileHeight: 64, contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
    leading: Icon(icon, color: GlamColors.mauve), title: Text(title),
    subtitle: subtitle == null ? null : Text(subtitle!, style: const TextStyle(fontSize: 11)),
    trailing: const Icon(Icons.chevron_right, size: 20, color: GlamColors.muted), onTap: onTap,
  ));
}

class EmptyMoment extends StatelessWidget {
  const EmptyMoment({super.key, required this.icon, required this.title,
    required this.body, this.action, this.onTap});
  final IconData icon;
  final String title, body;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.all(28), child:
    Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 38, color: GlamColors.mauve), const SizedBox(height: 20),
      Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 10), Text(body, textAlign: TextAlign.center),
      if (action != null) Padding(padding: const EdgeInsets.only(top: 20),
        child: FilledButton(onPressed: onTap, child: Text(action!))),
    ]));
}
