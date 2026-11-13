import 'dart:convert';
import 'dart:io' show gzip;
import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../design/glyphs.dart';

/// Renders screens extracted from the GLAM design (`scripts/design-extract`) with real Flutter widgets.
/// The extraction holds each screen's resolved geometry/styles at two canvas heights (844 and 944); the renderer
/// interpolates between them so bottom-anchored and stretching elements follow the real device height.
typedef Json = Map<String, dynamic>;
typedef NavTo = void Function(String id);

class DesignStore {
  static Map<String, dynamic>? _data;
  static Future<Map<String, dynamic>> load() async {
    if (_data != null) return _data!;
    final bytes = (await rootBundle.load('assets/screens/screens.json.gz')).buffer.asUint8List();
    return _data = jsonDecode(utf8.decode(gzip.decode(bytes))) as Map<String, dynamic>;
  }
  static bool has(String id) => _data?.containsKey(id) ?? false;
  @visibleForTesting static void debugSet(Map<String, dynamic> d) => _data = d;
}

const kSampleNotice = 'DESIGN PREVIEW · SAMPLE CONTENT · NOT LIVE';
double _n(dynamic v) => (v as num?)?.toDouble() ?? 0;
double _lerp(Json a, Json? b, String k, double f) => b == null ? _n(a[k]) : _n(a[k]) + f * (_n(b[k]) - _n(a[k]));
Color _c(dynamic v) => Color(v as int);
const _brandAssets = {
  'app-icon.png': 'assets/brand/app-icon.png', 'glam-icon.png': 'assets/brand/app-icon.png', 'favicon.png': 'assets/brand/app-icon.png',
  'apple.png': 'assets/icons/apple.png', 'google.png': 'assets/icons/google.png', 'facebook.png': 'assets/icons/facebook.png',
};

class DesignScreen extends StatelessWidget {
  const DesignScreen({super.key, required this.id, required this.go, this.data});
  final String id; final NavTo go; final Map<String, dynamic>? data;
  @override Widget build(BuildContext context) {
    final entry = (data ?? DesignStore._data)?[id] as Json?;
    if (entry == null) return const SizedBox.shrink();
    final a = entry['a'] as Json, b = entry['b'] as Json?, acts = (entry['acts'] as Map?)?.cast<String, dynamic>() ?? const {};
    final bg = _c(a['bg'] ?? 0xff0f0e10);
    return ColoredBox(color: bg, child: LayoutBuilder(builder: (context, box) {
      final s = box.maxWidth / 390, dh = box.maxHeight / s, f = (dh - 844) / 100;
      return Stack(children: [
        ClipRect(child: Transform.scale(scale: s, alignment: Alignment.topLeft, child: OverflowBox(alignment: Alignment.topLeft, minWidth: 0, minHeight: 0, maxWidth: 390, maxHeight: dh,
          child: SizedBox(width: 390, height: dh, child: _Node(a: a, b: b, f: f, acts: acts, go: go, root: true))))),
        Positioned(left: 0, right: 0, bottom: 2, child: IgnorePointer(child: Center(child: Text(kSampleNotice, style: TextStyle(fontSize: 8, letterSpacing: 1, color: const Color(0xff9a8f96).withValues(alpha: .8)))))),
      ]);
    }));
  }
}

class _Node extends StatelessWidget {
  const _Node({required this.a, required this.b, required this.f, required this.acts, required this.go, this.root = false});
  final Json a; final Json? b; final double f; final Map<String, dynamic> acts; final NavTo go; final bool root;
  @override Widget build(BuildContext context) {
    final w = _lerp(a, b, 'w', f), h = math.max(0.0, _lerp(a, b, 'h', f));
    Widget body = _box(context, w, h);
    final ix = a['ix'], act = ix == null ? null : acts['$ix'] as String?;
    if (act != null && !act.startsWith('toast:Unavailable')) {
      body = GestureDetector(behavior: HitTestBehavior.opaque, onTap: () {
        HapticFeedback.selectionClick();
        if (act.startsWith('toast:')) {
          ScaffoldMessenger.maybeOf(context)?.showSnackBar(const SnackBar(content: Text('This control is not connected in this build.'), duration: Duration(seconds: 2)));
        } else { go(act); }
      }, child: body);
    }
    return root ? body : body;
  }

  Widget _kids(BuildContext context, double w, double h) {
    final ka = (a['k'] as List?)?.cast<Json>() ?? const <Json>[], kb = (b?['k'] as List?)?.cast<Json>();
    final ok = kb != null && kb.length == ka.length;
    return Stack(clipBehavior: Clip.none, children: [
      for (var i = 0; i < ka.length; i++) _child(context, ka[i], ok ? kb[i] : null),
    ]);
  }
  Widget _child(BuildContext context, Json ca, Json? cb) {
    final x = _lerp(ca, cb, 'x', f), y = _lerp(ca, cb, 'y', f), w = _lerp(ca, cb, 'w', f), h = _lerp(ca, cb, 'h', f);
    if (ca.containsKey('txt')) return _text(ca, x, y, w, h);
    return Positioned(left: x, top: y, width: w, height: math.max(0, h), child: _Node(a: ca, b: cb, f: f, acts: acts, go: go));
  }

  Widget _text(Json t, double x, double y, double w, double h) {
    final st = t['t'] as Json, fs = _n(st['fs']), lh = _n(st['lh']);
    final style = TextStyle(fontFamily: st['disp'] == 1 ? 'Georgia' : 'Arial', fontFamilyFallback: st['disp'] == 1 ? const ['serif', 'GlamSymbols'] : const ['sans-serif', 'GlamSymbols'],
      fontSize: fs, fontWeight: FontWeight.values[((_n(st['fw']) / 100).round().clamp(1, 9)) - 1], letterSpacing: _n(st['ls']),
      color: st['c'] == null ? null : _c(st['c']), decoration: st['td'] == 1 ? TextDecoration.underline : null,
      height: lh > 0 ? lh / fs : 1.15, leadingDistribution: TextLeadingDistribution.even);
    final align = switch (st['ta']) { 'center' => TextAlign.center, 'right' || 'end' => TextAlign.right, _ => TextAlign.left };
    const slack = 40.0; // line breaks are explicit (captured from the design), so extra width never re-wraps
    final dx = align == TextAlign.center ? -slack / 2 : align == TextAlign.right ? -slack : 0.0;
    return Positioned(left: x + dx, top: y, width: w + slack, child: GText(t['txt'] as String, scaled: false, softWrap: false, textAlign: align,
      overflow: TextOverflow.visible, style: style, strutStyle: StrutStyle(fontSize: fs, height: lh > 0 ? lh / fs : 1.15, forceStrutHeight: true, leadingDistribution: TextLeadingDistribution.even)));
  }

  Widget _box(BuildContext context, double w, double h) {
    final rad = (a['rad'] as List?)?.map(_n).toList();
    final radius = rad == null ? null : BorderRadius.only(topLeft: Radius.circular(rad[0]), topRight: Radius.circular(rad[1]), bottomRight: Radius.circular(rad[2]), bottomLeft: Radius.circular(rad[3]));
    final bw = (a['bw'] as List?)?.map(_n).toList(), bc = a['bc'] as List?;
    Border? border;
    Widget? ring;
    if (bw != null) {
      BorderSide side(int i) => bw[i] <= 0 || bc![i] == null ? BorderSide.none : BorderSide(width: bw[i], color: _c(bc[i]));
      border = Border(top: side(0), right: side(1), bottom: side(2), left: side(3));
      final uniform = border.isUniform;
      if (!uniform && radius != null) {
        final equalW = bw.every((x) => x == bw[0]), circle = rad!.every((r) => r >= math.min(w, h) / 2 - .5);
        if (equalW && circle && bc!.every((c) => c != null)) { ring = CustomPaint(painter: _RingPainter(bw[0], [for (final c in bc) _c(c)])); }
        border = null; // Flutter cannot paint a rounded border with unequal colours/widths.
      }
    }
    final shadows = _shadows(a['sh'] as String?);
    final grad = _gradient(a['grad'] as String?);
    final deco = BoxDecoration(color: a['bg'] == null ? null : _c(a['bg']), gradient: grad, borderRadius: radius, border: border, boxShadow: shadows);
    final isScroll = a['scroll'] != null;
    final ringW = ring;
    Widget content;
    if (isScroll) {
      final sh = math.max(_n(a['scroll']), h);
      content = SingleChildScrollView(physics: const ClampingScrollPhysics(), child: SizedBox(width: w, height: sh, child: _kids(context, w, sh)));
    } else { content = _kids(context, w, h); }
    final input = a['input'] as Json?, range = a['range'] as List?;
    if (input != null) { content = _field(input, a['t'] as Json, w, h); }
    if (range != null) { content = _range(range, w, h); }
    if (a['imgtag'] != null) {
      final path = _brandAssets[a['imgtag']];
      if (path != null) content = Image.asset(path, width: w, height: h, fit: BoxFit.contain, excludeFromSemantics: true);
    }
    final img = a['img'] as Json?;
    if (img != null) { content = Stack(clipBehavior: Clip.hardEdge, fit: StackFit.expand, children: [_sprite(img), content]); }
    if (ringW != null) { content = Stack(fit: StackFit.expand, children: [content, ringW]); }
    Widget node = Container(width: w, height: h, decoration: deco, clipBehavior: (a['clipc'] != null || img != null) ? Clip.antiAlias : Clip.none, child: content);
    final clip = a['clip'] as String?;
    if (clip != null && clip.startsWith('inset(')) { node = ClipRect(clipper: _InsetClipper(clip), child: node); }
    if (a['bf'] != null && _n(a['bf']) > 0) {
      final sig = _n(a['bf']);
      node = ClipRRect(borderRadius: radius ?? BorderRadius.zero, child: BackdropFilter(filter: ui.ImageFilter.blur(sigmaX: sig, sigmaY: sig), child: node));
    }
    final flt = a['filter'] as String?;
    if (flt != null) { node = _filtered(flt, node); }
    final ol = a['ol'] as List?;
    if (ol != null && ol[1] != null) {
      final ow = _n(ol[0]), off = _n(ol[2]);
      node = Stack(clipBehavior: Clip.none, children: [node, Positioned(left: -(ow + off), top: -(ow + off), right: -(ow + off), bottom: -(ow + off),
        child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(border: Border.all(color: _c(ol[1]), width: ow), borderRadius: radius == null ? null : BorderRadius.circular(rad![0] + ow + off)))))]);
    }
    if (a['op'] != null) node = Opacity(opacity: _n(a['op']), child: node);
    return node;
  }

  Widget _sprite(Json img) {
    final sz = (img['sz'] as List).map(_n).toList();
    final bsz = (b?['img']?['sz'] as List?)?.map(_n).toList(), bpos = (b?['img']?['pos'] as List?)?.map(_n).toList();
    final pos = (img['pos'] as List).map(_n).toList();
    final W = bsz == null ? sz[0] : sz[0] + f * (bsz[0] - sz[0]), H = bsz == null ? sz[1] : sz[1] + f * (bsz[1] - sz[1]);
    final X = bpos == null ? pos[0] : pos[0] + f * (bpos[0] - pos[0]), Y = bpos == null ? pos[1] : pos[1] + f * (bpos[1] - pos[1]);
    return ClipRect(child: OverflowBox(alignment: Alignment.topLeft, minWidth: 0, minHeight: 0, maxWidth: W, maxHeight: H,
      child: Transform.translate(offset: Offset(X, Y), child: Image.asset('assets/imagery/${img['u']}', width: W, height: H, fit: BoxFit.fill, excludeFromSemantics: true, filterQuality: FilterQuality.medium))));
  }

  Widget _field(Json input, Json st, double w, double h) {
    final fs = _n(st['fs']);
    final pad = (input['pad'] as List?)?.map(_n).toList() ?? const [14.0, 14.0, 14.0, 14.0];
    final style = TextStyle(fontFamily: 'Arial', fontFamilyFallback: const ['sans-serif'], fontSize: fs, color: st['c'] == null ? null : _c(st['c']));
    final ml = input['ml'] == true;
    return Padding(padding: EdgeInsets.only(left: pad[3], right: pad[1]), child: Align(alignment: ml ? Alignment.topLeft : Alignment.centerLeft,
      child: TextFormField(initialValue: input['v'] as String? ?? '', obscureText: input['pw'] == true, maxLines: ml ? null : 1, style: style, textInputAction: TextInputAction.next,
        decoration: InputDecoration(isDense: true, border: InputBorder.none, filled: false, contentPadding: EdgeInsets.symmetric(vertical: ml ? pad[0] : 0), hintText: input['ph'] as String?, hintStyle: style.copyWith(color: style.color?.withValues(alpha: .5))))));
  }
  Widget _range(List r, double w, double h) {
    final v = ((_n(r[0]) - _n(r[1])) / math.max(1, _n(r[2]) - _n(r[1]))).clamp(0.0, 1.0);
    return Stack(alignment: Alignment.centerLeft, clipBehavior: Clip.none, children: [
      Container(height: 4, decoration: BoxDecoration(color: const Color(0xff352d36), borderRadius: BorderRadius.circular(2))),
      FractionallySizedBox(widthFactor: v, child: Container(height: 4, decoration: BoxDecoration(color: const Color(0xffe2a6c1), borderRadius: BorderRadius.circular(2)))),
      Positioned(left: (w - 20) * v, child: Container(width: 20, height: 20, decoration: const BoxDecoration(color: Color(0xffe2a6c1), shape: BoxShape.circle)))]);
  }
}

final _rgba = RegExp(r'rgba?\(([^)]+)\)');
Color? _parseColor(String s) {
  final m = _rgba.firstMatch(s); if (m == null) return null;
  final p = m.group(1)!.split(RegExp(r'[ ,/]+')).where((e) => e.isNotEmpty).map(double.parse).toList();
  return Color.fromARGB(((p.length > 3 ? p[3] : 1) * 255).round(), p[0].round(), p[1].round(), p[2].round());
}
List<BoxShadow>? _shadows(String? css) {
  if (css == null) return null;
  final out = <BoxShadow>[];
  for (final part in css.split(RegExp(r',\s*(?=rgb)'))) {
    final c = _parseColor(part); if (c == null || part.contains('inset')) continue;
    final nums = RegExp(r'(-?[\d.]+)px').allMatches(part.substring(part.indexOf(')') + 1)).map((m) => double.parse(m.group(1)!)).toList();
    if (nums.length < 2) continue;
    out.add(BoxShadow(color: c, offset: Offset(nums[0], nums[1]), blurRadius: nums.length > 2 ? nums[2] : 0, spreadRadius: math.min(nums.length > 3 ? nums[3] : 0, 2000)));
  }
  return out.isEmpty ? null : out;
}
Gradient? _gradient(String? css) {
  if (css == null) return null;
  final colors = _rgba.allMatches(css).map((m) => _parseColor(m.group(0)!)!).toList();
  if (colors.length < 2) return null;
  if (css.startsWith('conic-gradient')) {
    final deg = RegExp(r'([\d.]+)deg').firstMatch(css);
    final f = (deg == null ? 360 : double.parse(deg.group(1)!)) / 360;
    return SweepGradient(colors: [colors[0], colors[0], colors[1], colors[1]], stops: [0, f, f, 1], transform: const GradientRotation(-math.pi / 2));
  }
  final ang = RegExp(r'(-?[\d.]+)deg').firstMatch(css);
  final deg = ang == null ? 180.0 : double.parse(ang.group(1)!), rad = deg * math.pi / 180;
  final dx = math.sin(rad), dy = -math.cos(rad);
  return LinearGradient(begin: Alignment(-dx, -dy), end: Alignment(dx, dy), colors: colors);
}
Widget _filtered(String css, Widget child) {
  var m = <double>[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  List<double> mul(List<double> a, List<double> b) { // a after b
    final o = List<double>.filled(20, 0);
    for (var r = 0; r < 4; r++) { for (var c = 0; c < 5; c++) {
      var v = 0.0; for (var k = 0; k < 4; k++) { v += a[r * 5 + k] * b[k * 5 + c]; }
      if (c == 4) v += a[r * 5 + 4]; o[r * 5 + c] = v; } }
    return o;
  }
  double? blur;
  for (final fm in RegExp(r'([a-z-]+)\(([^)]*)\)').allMatches(css)) {
    final v = double.tryParse(fm.group(2)!.replaceAll(RegExp(r'[a-z%]+'), '')) ?? 1;
    switch (fm.group(1)) {
      case 'brightness': m = mul([v, 0, 0, 0, 0, 0, v, 0, 0, 0, 0, 0, v, 0, 0, 0, 0, 0, 1, 0], m);
      case 'contrast': final t = (1 - v) / 2 * 255; m = mul([v, 0, 0, 0, t, 0, v, 0, 0, t, 0, 0, v, 0, t, 0, 0, 0, 1, 0], m);
      case 'saturate': m = mul([.213 + .787 * v, .715 - .715 * v, .072 - .072 * v, 0, 0, .213 - .213 * v, .715 + .285 * v, .072 - .072 * v, 0, 0, .213 - .213 * v, .715 - .715 * v, .072 + .928 * v, 0, 0, 0, 0, 0, 1, 0], m);
      case 'hue-rotate':
        final r = v * math.pi / 180, cs = math.cos(r), sn = math.sin(r);
        m = mul([.213 + cs * .787 - sn * .213, .715 - cs * .715 - sn * .715, .072 - cs * .072 + sn * .928, 0, 0, .213 - cs * .213 + sn * .143, .715 + cs * .285 + sn * .140, .072 - cs * .072 - sn * .283, 0, 0, .213 - cs * .213 - sn * .787, .715 - cs * .715 + sn * .715, .072 + cs * .928 + sn * .072, 0, 0, 0, 0, 0, 1, 0], m);
      case 'blur': blur = v;
    }
  }
  Widget out = ColorFiltered(colorFilter: ColorFilter.matrix(m), child: child);
  if (blur != null && blur > 0) out = ImageFiltered(imageFilter: ui.ImageFilter.blur(sigmaX: blur, sigmaY: blur), child: out);
  return out;
}
class _InsetClipper extends CustomClipper<Rect> {
  _InsetClipper(this.css);
  final String css;
  @override Rect getClip(Size size) {
    final p = RegExp(r'inset\(([^)]*)\)').firstMatch(css)!.group(1)!.split(RegExp(r'\s+'));
    double v(String s, double ref) => s.endsWith('%') ? double.parse(s.replaceAll('%', '')) / 100 * ref : double.parse(s.replaceAll('px', ''));
    final t = v(p[0], size.height), r = v(p.length > 1 ? p[1] : p[0], size.width), b = v(p.length > 2 ? p[2] : p[0], size.height), l = v(p.length > 3 ? p[3] : (p.length > 1 ? p[1] : p[0]), size.width);
    return Rect.fromLTRB(l, t, size.width - r, size.height - b);
  }
  @override bool shouldReclip(_InsetClipper old) => old.css != css;
}

/// CSS `border: Npx solid` with a different colour per side on a circle: four arcs meeting on the diagonals.
class _RingPainter extends CustomPainter {
  _RingPainter(this.width, this.colors);
  final double width; final List<Color> colors; // top, right, bottom, left
  @override void paint(Canvas canvas, Size size) {
    final rect = (Offset.zero & size).deflate(width / 2);
    const starts = [-3 * math.pi / 4, -math.pi / 4, math.pi / 4, 3 * math.pi / 4];
    for (var i = 0; i < 4; i++) {
      canvas.drawArc(rect, starts[i], math.pi / 2, false, Paint()..style = PaintingStyle.stroke..strokeWidth = width..color = colors[i]);
    }
  }
  @override bool shouldRepaint(_RingPainter o) => o.width != width || o.colors != colors;
}
