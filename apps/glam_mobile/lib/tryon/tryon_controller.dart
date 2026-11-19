import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import '../core/config.dart';
import 'tryon_service.dart';

typedef PhotoPicker = Future<Uint8List?> Function();

/// "See it on me": a real, consented, server-generated preview of the user's own chosen photo in an outfit.
/// Phases: unknown → (unavailable | ready) → consent → submitting → processing → (done | failed | cancelled).
/// Bytes live in memory only and are wiped on reset. Nothing here fabricates or substitutes an image.
class TryOnController extends ChangeNotifier {
  TryOnController(this.service, {required this.pickPhoto, this.pollInterval = const Duration(seconds: 2), this.maxPolls = 90});
  final TryOnService service;
  final PhotoPicker pickPhoto;
  final Duration pollInterval;
  final int maxPolls;
  String phase = 'unknown';
  String? error;
  TryOnQuote? quote;
  TryOnPolicy? policy;
  String? storagePolicyId;
  bool storageGranted = false;
  Uint8List? photo, result;
  TryOnJob? job;
  bool syntheticTest = false, busy = false;
  String? _key, _uploadKey, _mediaId;
  /// A photo is chosen, or its private server copy already exists (so a retry needs no second upload).
  bool get hasPhoto => photo != null || _mediaId != null;
  int _epoch = 0;
  bool _disposed = false;
  void _notify() { if (!_disposed) notifyListeners(); }

  Future<void> _run(Future<void> Function(int epoch) action) async {
    if (busy) return;
    busy = true; error = null; final epoch = _epoch; _notify();
    try { await action(epoch); }
    on Failure catch (e) { if (epoch == _epoch) { error = e.code; if (phase == 'submitting') phase = 'consent'; } }
    catch (_) { if (epoch == _epoch) { error = 'operation_unavailable'; if (phase == 'submitting') phase = 'consent'; } }
    finally { if (epoch == _epoch) { busy = false; _notify(); } }
  }
  void _check(int epoch) { if (_disposed || epoch != _epoch) throw const Failure('request_cancelled'); }

  /// Asks the server whether try-on is configured. Any failure keeps the honest "not available" state.
  Future<void> check() async {
    final epoch = _epoch;
    try { quote = await service.quote(); if (epoch == _epoch) phase = 'ready'; }
    catch (_) { if (epoch == _epoch) phase = 'unavailable'; }
    _notify();
  }

  Future<void> begin() => _run((epoch) async {
    if (phase != 'ready') throw const Failure('service_unavailable');
    final p = await service.policy(); _check(epoch);
    final perms = await service.permissions(); _check(epoch);
    if (!perms.eligible) throw const Failure('eligibility_required');
    policy = p; storagePolicyId = perms.storage.id; storageGranted = perms.storage.granted;
    _key = service.newKey(); _uploadKey = service.newKey(); _mediaId = null; phase = 'consent';
  });

  Future<void> choosePhoto() => _run((epoch) async {
    final bytes = await pickPhoto(); _check(epoch);
    if (bytes == null) return;
    clearPhoto(); photo = bytes; _mediaId = null; _uploadKey = service.newKey();
  });
  void clearPhoto() { photo?.fillRange(0, photo!.length, 0); photo = null; }

  /// Both permissions are separate and explicit; nothing is sent unless the user ticked both.
  Future<void> submit({required bool storageChecked, required bool tryOnChecked, required String occasion,
      String? notes, required List<Map<String, String>> garments}) => _run((epoch) async {
    if (!hasPhoto) throw const Failure('photo_required');
    if (!tryOnChecked || (!storageGranted && !storageChecked) || policy == null) throw const Failure('explicit_consent_required');
    if (garments.isEmpty) throw const Failure('outfit_required');
    phase = 'submitting'; _notify();
    if (!storageGranted) { await service.grant(storagePolicyId!); _check(epoch); storageGranted = true; }
    await service.grant(policy!.id); _check(epoch);
    _mediaId ??= await service.upload(photo!, storagePolicyId!, _uploadKey!); _check(epoch);
    clearPhoto(); // the private copy now lives only on the server, under the user's control
    var j = await service.submit(key: _key!, mediaId: _mediaId!, policyId: policy!.id, occasion: occasion, notes: notes, garments: garments);
    _check(epoch); job = j; phase = 'processing'; _notify();
    for (var i = 0; j.pending; i++) {
      if (i >= maxPolls) throw const Failure('still_processing');
      await Future<void>.delayed(pollInterval); _check(epoch);
      j = await service.job(j.id); _check(epoch); job = j;
    }
    await _finish(epoch, j);
  });

  Future<void> _finish(int epoch, TryOnJob j) async {
    if (j.state == 'completed' && j.resultAvailable) {
      final bytes = await service.result(j.id); _check(epoch);
      result = bytes; syntheticTest = j.syntheticTest; phase = 'done';
    } else if (j.state == 'cancelled') { phase = 'cancelled'; }
    else { error = j.errorCode ?? 'generation_failed'; phase = 'failed'; }
  }

  /// Resume checking a job that was still processing when the user came back (after 'still_processing').
  Future<void> refresh() => _run((epoch) async {
    final current = job; if (current == null) return;
    final j = await service.job(current.id); _check(epoch); job = j;
    if (j.pending) { phase = 'processing'; throw const Failure('still_processing'); }
    await _finish(epoch, j);
  });

  /// Cancels a pending job or deletes a finished preview. Credits for failed/cancelled work are released by the server.
  Future<void> remove() => _run((epoch) async {
    final current = job; if (current == null) return;
    await service.remove(current.id); _check(epoch);
    reset(keepAvailability: true);
  });

  void reset({bool keepAvailability = false}) {
    _epoch++; clearPhoto(); result?.fillRange(0, result!.length, 0); result = null; job = null; _mediaId = null;
    syntheticTest = false; busy = false; error = null;
    phase = keepAvailability && quote != null ? 'ready' : 'unknown'; _notify();
  }
  @override void dispose() { _disposed = true; _epoch++; clearPhoto(); result?.fillRange(0, result!.length, 0); super.dispose(); }
}
