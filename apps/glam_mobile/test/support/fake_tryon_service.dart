import 'dart:convert';
import 'dart:typed_data';
import 'package:glam_mobile/analysis/contracts.dart';
import 'package:glam_mobile/core/config.dart';
import 'package:glam_mobile/tryon/tryon_service.dart';

/// TEST-ONLY double. It lives under test/ so no release build can contain it.
final tinyPng = base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==');
const _uuid = '00000000-0000-4000-8000-0000000000';
String uid(int n) => '$_uuid${n.toString().padLeft(2, '0')}';

Map<String, dynamic> jobJson(String id, String state, {String? error, bool available = false, bool synthetic = true}) => {
  'id': id, 'media_id': uid(2), 'scope': 'full_body', 'state': state, 'created_at': DateTime.now().toUtc().toIso8601String(),
  'expires_at': DateTime.now().add(const Duration(hours: 1)).toUtc().toIso8601String(), 'finished_at': null, 'error_code': error,
  'credit_units': 7, 'result_available': available, 'synthetic_test': synthetic};

class FakeTryOnService implements TryOnService {
  bool available = true, eligible = true, storageGranted = false;
  List<String> script = ['queued', 'running', 'completed'];
  String? failWith, submitError;
  final calls = <String>[];
  int uploads = 0, submits = 0, _n = 10, _polls = 0;
  final keys = <String>[];
  final garments = <List<Map<String, String>>>[];
  Uint8List? lastUpload;
  @override String newKey() => uid(_n++);
  @override Future<TryOnQuote> quote() async {
    calls.add('quote'); if (!available) throw const Failure('service_unavailable');
    return TryOnQuote.fromJson({'credit_units': 7, 'credit_kind': 'glam_ai_credit'});
  }
  @override Future<TryOnPolicy> policy() async => TryOnPolicy.fromJson({'id': uid(5), 'purpose': 'ai_look_generation', 'version': 'fixture', 'content': 'Fixture permission text'});
  @override Future<Permissions> permissions() async => Permissions.fromJson({'eligible': eligible,
    'storage': {'policy': {'id': uid(6), 'purpose': 'private_photo_storage', 'version': 'fixture', 'content': 'x'}, 'granted': storageGranted},
    'analysis': {'policy': {'id': uid(7), 'purpose': 'cosmetic_photo_analysis', 'version': 'fixture', 'content': 'x'}, 'granted': false}});
  @override Future<void> grant(String policyId) async { calls.add('grant:$policyId'); }
  @override Future<String> upload(Uint8List png, String storagePolicyId, String key) async { calls.add('upload'); uploads++; lastUpload = png; return uid(2); }
  @override Future<TryOnJob> submit({required String key, required String mediaId, required String policyId, required String occasion,
      String? notes, required List<Map<String, String>> garments}) async {
    calls.add('submit'); submits++; keys.add(key); this.garments.add(garments);
    if (submitError != null) { final e = submitError!; submitError = null; throw Failure(e); }
    _polls = 0; return TryOnJob.fromJson(jobJson(uid(3), 'queued'));
  }
  @override Future<TryOnJob> job(String id) async {
    final state = script[_polls < script.length ? _polls++ : script.length - 1];
    return TryOnJob.fromJson(jobJson(id, state == 'completed' && failWith != null ? 'failed' : state,
      error: state == 'completed' ? failWith : null, available: state == 'completed' && failWith == null));
  }
  @override Future<Uint8List> result(String id) async { calls.add('result'); return Uint8List.fromList(tinyPng); }
  @override Future<TryOnJob> remove(String id) async { calls.add('remove'); return TryOnJob.fromJson(jobJson(id, 'cancelled')); }
}
