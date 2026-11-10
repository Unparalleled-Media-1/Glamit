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
  String? error, photoError;
  List<AnalysisJob> history = [];
  String? selectedReportId;
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
    on Failure catch (e) { if(epoch==_epoch) {
      if(['sign_in_required','session_changed'].contains(e.code)) { lock();error=e.code;_notify(); }
      else { error=e.code;
        if(e.code=='private_record_unavailable') { clearPhoto();report=null;saved=false;_expiry?.cancel();_poll?.cancel();phase='expired'; }
        else if(photo!=null && pending==null && phase=='uploading')phase='photo';
      }
    } }
    catch (_) { if (epoch == _epoch) error = 'operation_unavailable'; }
    finally { if (epoch == _epoch) { busy = false; _notify(); } }
  }
  void check(int epoch) { if (_disposed || epoch != _epoch) throw const Failure('session_changed'); }
  void select(Uint8List bytes) {
    if (busy || pending != null) { bytes.fillRange(0, bytes.length, 0); error = 'resume_previous_request'; _notify(); return; }
    clearPhoto(); photoError=null; photo = bytes; _uploadKey = repository.key(); phase = 'photo'; error = null; _notify();
  }
  void clearPhoto() { photo?.fillRange(0, photo!.length, 0); photo = null; }
  void backToCapture() {
    _epoch++; _poll?.cancel(); _expiry?.cancel(); repository.transport.cancel();
    clearPhoto(); report = null; job = null; permissions = null; saved = false; photoError=null; busy = false; phase = 'capture'; error = null; _notify();
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
    phase = 'processing'; await _readJob(epoch);
  });
  Future<Map<String,dynamic>?> _recoverPending(int epoch) async {
    final raw=await vault.read(pendingStorageKey(session.subject!));check(epoch);
    if(raw==null)return null;
    final record=object(jsonDecode(raw));
    if(record['owner']!=session.subject)throw const Failure('session_changed');
    identifier(record['media_id']);identifier(record['policy_id']);identifier(record['request_key']);
    if(record['job_id']!=null)identifier(record['job_id']);
    return record;
  }
  Future<void> loadHistory() => run((epoch) async {
    await session.token();check(epoch);_poll?.cancel();_expiry?.cancel();
    clearPhoto();report=null;saved=false;photoError=null;phase='loading_history';_notify();
    final records=await repository.history();check(epoch);
    final passport=await repository.passport();check(epoch);
    final recovery=await _recoverPending(epoch);check(epoch);
    history=records;selectedReportId=passport.report?.id;pending=recovery;phase='history';
  });
  Future<void> openHistory(String id) => run((epoch) async {
    _poll?.cancel();_expiry?.cancel();clearPhoto();report=null;photoError=null;saved=false;
    final record=await repository.job(id);check(epoch);job=record;
    await _readJob(epoch);
  });
  Future<void> _restorePhoto(Report record,int epoch) async {
    photoError=null;
    try {
      final bytes=await repository.photoFor(record);
      if(_disposed || epoch!=_epoch || report?.id!=record.id || !record.expires.isAfter(DateTime.now())) {
        bytes.fillRange(0,bytes.length,0);throw const Failure('session_changed');
      }
      clearPhoto();photo=bytes;
    } on Failure catch(e) {
      check(epoch);
      if(['session_changed','request_cancelled','sign_in_required','private_record_unavailable'].contains(e.code))rethrow;
      photoError=e.code;
    }
  }
  Future<void> reloadPhoto() => run((epoch) async {
    final current=report;if(current==null)throw const Failure('report_missing');
    await _restorePhoto(current,epoch);
  });
  Future<void> _clearPendingFor(String jobId,int epoch,{String? mediaId}) async {
    final record=await _recoverPending(epoch);check(epoch);
    if(record!=null && (record['job_id']==jobId || (mediaId!=null && record['media_id']==mediaId))) {
      await vault.remove(pendingStorageKey(session.subject!));check(epoch);pending=null;
    }
  }
  Future<void> resume() => run((epoch) async {
    await session.token(); check(epoch);clearPhoto();report=null;photoError=null;
    final record = await _recoverPending(epoch);
    if (record != null) {
      pending = record;
      if (record['job_id'] == null) { phase = 'uncertain'; return; }
      final restored = await repository.job(record['job_id'] as String); check(epoch); job = restored;
      await _readJob(epoch); return;
    }
    final passport = await repository.passport(); check(epoch);
    report = passport.report;
    if (report == null) { phase = 'empty'; return; }
    saved = true; phase = 'report'; _expire(report!.expires);
    await _restorePhoto(report!,epoch);
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
      final received = await repository.report(id); check(epoch);
      require(received.mediaId==job!.mediaId);
      final selected=await repository.passport();check(epoch);
      report=received;saved=selected.report?.id==received.id && selected.report?.correctionRevision==received.correctionRevision;
      phase = 'report'; _poll?.cancel(); _expire(received.expires);
      if(photo==null)await _restorePhoto(received,epoch);
    } else if (job!.pending) {
      phase = 'processing'; _poll?.cancel();
      _poll = Timer(const Duration(seconds: 3), () { if (!_disposed && phase == 'processing') unawaited(refresh()); });
    } else { phase = 'stopped'; report = null; _poll?.cancel(); }
  }
  void _expire(DateTime expiry) {
    _expiry?.cancel(); final delay = expiry.difference(DateTime.now());
    _expiry = Timer(delay.isNegative ? Duration.zero : delay, () {
      _epoch++;repository.transport.cancel();_poll?.cancel();busy=false;
      clearPhoto(); report = null; saved = false; phase = 'expired'; _notify();
    });
  }
  Future<void> save() => run((epoch) async {
    final result = report; if (result == null) throw const Failure('report_missing');
    final response = await repository.save(result); check(epoch);
    report = response.report; saved = true;
    await _clearPendingFor(result.id,epoch);
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
    report = null; job = null; saved = false; phase = 'deletion_requested';clearPhoto();
    await _clearPendingFor(id,epoch,mediaId:media); _expiry?.cancel(); _poll?.cancel();
  });
  void lock() {
    _epoch++; _poll?.cancel(); _expiry?.cancel(); session.lock();
    clearPhoto(); report = null; permissions = null; job = null; pending = null;
    history=[];selectedReportId=null;photoError=null;
    saved = false; busy = false; error = null; phase = 'capture'; _notify();
  }
  @override void dispose() { _disposed = true; lock(); super.dispose(); }
}
