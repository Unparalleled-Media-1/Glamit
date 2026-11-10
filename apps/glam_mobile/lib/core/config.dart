import 'dart:convert';
/// Public build configuration only; no service-role/provider/Management keys.
class MobileConfig {
  const MobileConfig({this.apiOrigin = const String.fromEnvironment('GLAM_API_ORIGIN'),
    this.publicKey = const String.fromEnvironment('SUPABASE_PUBLIC_KEY')});
  final String apiOrigin, publicKey;
  static final authOrigin = Uri.parse('https://bkkmsbxrxkqaveymcrgi.supabase.co');
  Uri? get api {
    final uri = Uri.tryParse(apiOrigin);
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty || uri.userInfo.isNotEmpty ||
        uri.hasQuery || uri.hasFragment || !['', '/'].contains(uri.path)) return null;
    return uri;
  }
  bool get authConfigured {
    if (publicKey.length > 8192 || RegExp(r'[\r\n]').hasMatch(publicKey)) return false;
    if (publicKey.startsWith('sb_publishable_')) return publicKey.length > 20;
    try {
      final pieces = publicKey.split('.');
      return pieces.length == 3 && (jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(pieces[1])))) as Map)['role'] == 'anon';
    } catch (_) { return false; }
  }
}
class Failure implements Exception {
  const Failure(this.code);
  final String code;
  @override
  String toString() => code;
}
