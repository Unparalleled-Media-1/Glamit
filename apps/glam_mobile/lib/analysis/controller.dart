import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import '../core/config.dart';
import '../core/session.dart';
import 'contracts.dart';
import 'repository.dart';

class AnalyzeController extends ChangeNotifier {
  AnalyzeController(this.repository, this.session, this.vault);
  final AnalysisRepository repository;
  final Session session;
  final Vault vault;
  Uint8List? photo;
  Permissions? permissions;
  AnalysisJob? job;
  Report? report;
  Map<String, dynamic>? pending;
  String? error;
  String phase = 'capture';
  bool busy = false, saved = false;
  String? _uploadKey;
  int _epoch = 0;
  Timer? _poll, _expiry;
  bool _disposed = false;
  void _notify() { if (!_disposed) notifyListeners(); }
  Future<void> run(Future<void> Function(int epoch) action) async {
    if (busy) return;
    busy = true; error = null; final epoch = _epoch; _notify();
    try { await action(epoch); }
    on Failure catch (e) { if (epoch == _epoch) { error = e.code; if (photo != null && pending == null && phase == 'uploading') phase = 'photo'; } }
    catch (_) { if (epoch == _epoch) error = 'operation_unavailable'; }
    finally { if (epoch == _epoch) { busy = false; _notify(); } }
  }
  void check(int epoch) { if (_disposed || epoch != _epoch) throw const Failure('session_changed'); }
  void select(Uint8List bytes) {
    if (busy || pending != null) { bytes.fillRange(0, bytes.length, 0); error = 'resume_previous_request'; _notify(); return; }
    clearPhoto(); photo = bytes; _uploadKey = repository.key(); phase = 'photo'; error = null; _notify();
  }
  void clearPhoto() { photo?.fillRange(0, photo!.length, 0); photo = null; }
  void backToCapture() {
    _epoch++; _poll?.cancel(); _expiry?.cancel(); repository.transport.cancel();
    clearPhoto(); report = null; job = null; permissions = null; saved = false; busy = false; phase = 'capture'; error = null; _notify();
  }
  void backToPhoto() { if (!busy && photo != null) { phase = 'photo'; _notify(); } }
  void retake() { if (busy || pending != null) return; clearPhoto(); phase = 'capture'; error = null; _notify(); }
  Future<void> policies() => run((epoch) async {
    if (photo == null) throw const Failure('photo_required');
    await session.token(); check(epoch);
    final fetchedPermissions = await repository.permissions(); check(epoch); permissions = fetchedPermissions;
    if (!permissions!.eligible) throw const Failure('eligibility_required');
    await repository.available(); check(epoch); phase = 'consent';
  });
  Future<void> analyze({required bool storageChecked, required bool analysisChecked}) => run((epoch) async {
    final original = permissions;
    if (original == null || photo == null || !storageChecked || !analysisChecked) throw const Failure('explicit_consent_required');
    final current = await repository.permissions(); check(epoch);
    if (current.storage.id != original.storage.id || current.analysis.id != original.analysis.id) {
      permissions = current; phase = 'photo'; throw const Failure('policy_changed');
    }
    if (!current.eligible) throw const Failure('eligibility_required');
    if (!current.storage.granted) { await repository.consent(current.storage); check(epoch); }
    if (!current.analysis.granted) { await repository.consent(current.analysis); check(epoch); }
    final verified = await repository.permissions(); check(epoch);
    if (!verified.allowed) throw const Failure('explicit_consent_required');
    if (verified.storage.id != current.storage.id || verified.analysis.id != current.analysis.id) { phase = 'photo'; throw const Failure('policy_changed'); }
    await repository.available(); check(epoch);
    phase = 'uploading'; _notify();
    final media = await repository.upload(photo!, verified.storage.id, requestKey: _uploadKey!); check(epoch);
    pending = {'owner':session.subject, 'media_id':media.id, 'policy_id':verified.analysis.id,
      'request_key':repository.key(), 'job_id':null};
    // Persist before the potentially billable POST. A timeout is ambiguous, not failure proof.
    await vault.write(pendingStorageKey(pending!['owner'] as String), jsonEncode(pending)); check(epoch);
    phase = 'submitting'; _notify();
    try {
      final submitted = await repository.submit(pending!); check(epoch); job = submitted;
      pending!['job_id'] = job!.id;
      await vault.write(pendingStorageKey(pending!['owner'] as String), jsonEncode(pending)); check(epoch);
    } catch (_) { if (epoch == _epoch) phase = 'uncertain'; rethrow; }
    clearPhoto(); phase = 'processing'; await _readJob(epoch);
  });
  Future<void> resume() => run((epoch) async {
    await session.token(); check(epoch);
    final raw = await vault.read(pendingStorageKey(session.subject!)); check(epoch);
    if (raw != null) {
      final record = object(jsonDecode(raw));
      if (record['owner'] != session.subject) throw const Failure('session_changed');
      identifier(record['media_id']); identifier(record['policy_id']); identifier(record['request_key']);
      if (record['job_id'] != null) identifier(record['job_id']);
      pending = record;
      if (record['job_id'] == null) { phase = 'uncertain'; return; }
      final restored = await repository.job(record['job_id'] as String); check(epoch); job = restored;
      await _readJob(epoch); return;
    }
    final passport = await repository.passport(); check(epoch);
    report = passport.report;
    if (report == null) { phase = 'empty'; return; }
    saved = true; phase = 'report'; _expire(report!.expires);
  });
  Future<void> confirmResume() => run((epoch) async {
    if (pending == null || pending!['owner'] != session.subject) throw const Failure('session_changed');
    final p = await repository.permissions(); check(epoch);
    if (!p.allowed || p.analysis.id != pending!['policy_id']) throw const Failure('policy_changed');
    await repository.available(); check(epoch);
    // Explicit user action, same body and same idempotency key; never automatic billing retry.
    final submitted = await repository.submit(pending!); check(epoch); job = submitted; pending!['job_id'] = job!.id;
    await vault.write(pendingStorageKey(pending!['owner'] as String), jsonEncode(pending)); check(epoch);
    await _readJob(epoch);
  });
  Future<void> refresh() => run(_readJob);
  Future<void> _readJob(int epoch) async {
    final id = job?.id;
    if (id == null) throw const Failure('job_missing');
    final fetched = await repository.job(id); check(epoch); job = fetched;
    if (job!.state == 'completed' && job!.expires.isAfter(DateTime.now())) {
      final received = await repository.report(id); check(epoch); report = received; saved = false;
      clearPhoto(); phase = 'report'; _poll?.cancel(); _expire(report!.expires);
    } else if (job!.pending) {
      phase = 'processing'; _poll?.cancel();
      _poll = Timer(const Duration(seconds: 3), () { if (!_disposed && phase == 'processing') unawaited(refresh()); });
    } else { phase = 'stopped'; report = null; _poll?.cancel(); }
  }
  void _expire(DateTime expiry) {
    _expiry?.cancel(); final delay = expiry.difference(DateTime.now());
    _expiry = Timer(delay.isNegative ? Duration.zero : delay, () {
      report = null; saved = false; phase = 'expired'; _notify();
    });
  }
  Future<void> save() => run((epoch) async {
    final result = report; if (result == null) throw const Failure('report_missing');
    final response = await repository.save(result); check(epoch);
    report = response.report; saved = true;
    pending = null; await vault.remove(pendingStorageKey(session.subject!)); check(epoch);
  });
  Future<void> correct(String key, String? value) => run((epoch) async {
    if ((value != null && (value.trim().isEmpty || value.length > 240)) || report == null) throw const Failure('invalid_correction');
    final updated = await repository.correct(report!, key, value?.trim()); check(epoch);
    report = updated; saved = false;
  });
  Future<void> remove() => run((epoch) async {
    final id = report?.id ?? job?.id, media = report?.mediaId ?? job?.mediaId;
    if (id == null || media == null) throw const Failure('job_missing');
    await repository.remove(id, media); check(epoch);
    report = null; job = null; pending = null; saved = false; phase = 'deletion_requested';
    await vault.remove(pendingStorageKey(session.subject!)); check(epoch); _expiry?.cancel(); _poll?.cancel();
  });
  void lock() {
    _epoch++; _poll?.cancel(); _expiry?.cancel(); session.lock();
    clearPhoto(); report = null; permissions = null; job = null; pending = null;
    saved = false; busy = false; error = null; phase = 'capture'; _notify();
  }
  @override void dispose() { _disposed = true; lock(); super.dispose(); }
}
