import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'config.dart';
import 'transport.dart';

String pendingStorageKey(String owner) => 'glam.analyze.pending.v1.$owner';

abstract interface class Vault {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> remove(String key);
}
class DeviceVault implements Vault {
  final _storage = const FlutterSecureStorage();
  @override Future<String?> read(String key) => _storage.read(key: key);
  @override Future<void> write(String key, String value) => _storage.write(key: key, value: value);
  @override Future<void> remove(String key) => _storage.delete(key: key);
}

/// Supabase owns authentication. Tokens stay in memory until device lock.
/// Durable job recovery requires a fresh sign-in; biometric persistence is not enabled.
class Session {
  Session(this.config, this.transport, this.vault);
  final MobileConfig config;
  final Transport transport;
  final Vault vault;
  String? _token, subject;
  DateTime _expires = DateTime.fromMillisecondsSinceEpoch(0);
  int generation = 0;
  Future<void>? _refreshing;
  String? _refresh;
  bool get authenticated => _token != null && subject != null;
  Map<String, String> get _headers => {'apikey': config.publicKey};
  Uri _url(String path) => MobileConfig.authOrigin.resolve('/auth/v1/$path');
  Future<void> signIn(String email, String password) async {
    if (!config.authConfigured) throw const Failure('auth_not_configured');
    final epoch = generation;
    final settings = await transport.json(_url('settings'), headers: _headers);
    if ((settings['external'] as Map?)?['email'] != true) throw const Failure('sign_in_unavailable');
    final result = await transport.json(_url('token?grant_type=password'), method: 'POST', headers: _headers,
      body: {'email': email.trim(), 'password': password});
    await _accept(result, epoch);
  }
  Future<void> _accept(Map<String, dynamic> value, int epoch) async {
    final token = value['access_token'], refresh = value['refresh_token'], seconds = value['expires_in'];
    if (token is! String || token.isEmpty || token.length > 16384 || RegExp(r'[\r\n]').hasMatch(token) || refresh is! String || refresh.length > 16384 || seconds is! num || seconds <= 0 || seconds > 604800) throw const Failure('session_invalid');
    final user = await transport.json(_url('user'), headers: {..._headers, 'Authorization': 'Bearer $token'});
    final id = user['id'];
    if (id is! String || !RegExp(r'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$', caseSensitive: false).hasMatch(id) || generation != epoch) throw const Failure('session_changed');
    // A refresh must never silently bind an existing screen to another identity.
    if (subject != null && subject != id) throw const Failure('session_changed');
    if (generation != epoch) throw const Failure('session_changed');
    _refresh = refresh;
    _token = token; subject = id; _expires = DateTime.now().add(Duration(seconds: seconds.toInt()));
  }
  Future<String> token() async {
    if (_token != null && _expires.isAfter(DateTime.now().add(const Duration(seconds: 60)))) return _token!;
    await (_refreshing ??= _recover().whenComplete(() => _refreshing = null));
    if (_token == null) throw const Failure('sign_in_required');
    return _token!;
  }
  Future<void> _recover() async {
    if (!config.authConfigured) throw const Failure('auth_not_configured');
    final epoch = generation;
    final refresh = _refresh;
    if (refresh == null) throw const Failure('sign_in_required');
    final value = await transport.json(_url('token?grant_type=refresh_token'), method: 'POST', headers: _headers, body: {'refresh_token': refresh});
    await _accept(value, epoch);
  }
  void lock() { generation++; _token = null; _refresh = null; subject = null; transport.cancel(); }
  Future<void> signOut() async {
    final owner = subject; lock();
    if (owner != null) await vault.remove(pendingStorageKey(owner));
  }
}
