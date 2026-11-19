import 'dart:typed_data';
import '../analysis/contracts.dart';
import '../analysis/repository.dart';
import '../core/config.dart';

/// What the server quotes for one preview, in GLAM AI credits only.
class TryOnQuote {
  TryOnQuote.fromJson(Map<String, dynamic> v) {
    require(v['credit_units'] is int && (v['credit_units'] as int) > 0 && v['credit_kind'] == 'glam_ai_credit');
    units = v['credit_units'] as int;
  }
  late final int units;
}

class TryOnPolicy {
  TryOnPolicy.fromJson(Map<String, dynamic> v) {
    id = identifier(v['id']); content = text(v['content'], 30000); version = text(v['version'], 200);
    require(v['purpose'] == 'ai_look_generation');
  }
  late final String id, content, version;
}

class TryOnJob {
  TryOnJob.fromJson(Map<String, dynamic> v) {
    id = identifier(v['id']); state = text(v['state'], 32);
    require(['queued', 'running', 'completed', 'failed', 'cancelled', 'expired'].contains(state));
    expires = instant(v['expires_at']); instant(v['created_at']);
    require(v['error_code'] == null || v['error_code'] is String);
    errorCode = v['error_code'] as String?;
    require(v['credit_units'] is int && v['result_available'] is bool && v['synthetic_test'] is bool);
    units = v['credit_units'] as int; resultAvailable = v['result_available'] as bool; syntheticTest = v['synthetic_test'] as bool;
  }
  late final String id, state;
  late final String? errorCode;
  late final DateTime expires;
  late final int units;
  late final bool resultAvailable, syntheticTest;
  bool get pending => ['queued', 'running'].contains(state);
}

/// The only seam between the try-on journey and the network. Production uses [TryOnRepository];
/// tests inject a double. There is no simulated implementation in this library.
abstract interface class TryOnService {
  Future<TryOnQuote> quote();
  Future<TryOnPolicy> policy();
  Future<Permissions> permissions();
  Future<void> grant(String policyId);
  Future<String> upload(Uint8List png, String storagePolicyId, String key);
  Future<TryOnJob> submit({required String key, required String mediaId, required String policyId,
    required String occasion, String? notes, required List<Map<String, String>> garments});
  Future<TryOnJob> job(String id);
  Future<Uint8List> result(String id);
  Future<TryOnJob> remove(String id);
  String newKey();
}

class TryOnRepository implements TryOnService {
  TryOnRepository(this.analysis);
  final AnalysisRepository analysis;
  @override String newKey() => analysis.key();
  @override Future<TryOnQuote> quote() async => TryOnQuote.fromJson(await analysis.request('/v1/tryon/quote'));
  @override Future<TryOnPolicy> policy() async => TryOnPolicy.fromJson(await analysis.request('/v1/tryon/policy'));
  @override Future<Permissions> permissions() => analysis.permissions();
  @override Future<void> grant(String policyId) async {
    final r = await analysis.request('/v1/policies/${identifier(policyId)}/consent', method: 'POST', key: analysis.key(), body: {'action': 'granted'});
    identifier(r['id']); require(r['action'] == 'granted');
  }
  @override Future<String> upload(Uint8List png, String storagePolicyId, String key) async => (await analysis.upload(png, storagePolicyId, requestKey: key)).id;
  @override Future<TryOnJob> submit({required String key, required String mediaId, required String policyId,
      required String occasion, String? notes, required List<Map<String, String>> garments}) async {
    final job = TryOnJob.fromJson(await analysis.request('/v1/tryon/jobs', method: 'POST', key: key, body: {
      'media_id': identifier(mediaId), 'policy_id': identifier(policyId), 'consent': true, 'scope': 'full_body',
      'outfit': {'occasion': occasion, if (notes != null && notes.isNotEmpty) 'notes': notes}, 'garments': garments}));
    return job;
  }
  @override Future<TryOnJob> job(String id) async {
    final v = TryOnJob.fromJson(await analysis.request('/v1/tryon/jobs/${identifier(id)}')); require(v.id == id); return v;
  }
  @override Future<Uint8List> result(String id) async {
    final origin = analysis.config.api;
    if (origin == null) throw const Failure('api_not_configured');
    final token = await analysis.session.token(), epoch = analysis.session.generation, owner = analysis.session.subject;
    final bytes = await analysis.transport.privatePng(origin.resolve('/v1/tryon/jobs/${identifier(id)}/result'), headers: {'Authorization': 'Bearer $token'});
    if (epoch != analysis.session.generation || owner != analysis.session.subject) { bytes.fillRange(0, bytes.length, 0); throw const Failure('session_changed'); }
    return bytes;
  }
  @override Future<TryOnJob> remove(String id) async {
    final v = TryOnJob.fromJson(await analysis.request('/v1/tryon/jobs/${identifier(id)}', method: 'DELETE')); require(v.id == id); return v;
  }
}
