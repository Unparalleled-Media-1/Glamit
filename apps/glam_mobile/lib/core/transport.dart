import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'config.dart';

/// Redirect-free, bounded transport. Write retries are explicit, never automatic.
class Transport {
  Transport(this.client);
  final http.Client client;
  final _pending = <Completer<void>>{};
  int generation = 0;
  void cancel() {
    generation++;
    for (final abort in _pending.toList()) { if (!abort.isCompleted) abort.complete(); }
  }
  Future<Map<String, dynamic>> json(Uri uri, {String method = 'GET', Map<String, String> headers = const {},
    Object? body, Uint8List? bytes}) async {
    if (uri.scheme != 'https' || uri.userInfo.isNotEmpty) throw const Failure('invalid_connection');
    final epoch = generation;
    final abort = Completer<void>();
    _pending.add(abort);
    final timer = Timer(const Duration(seconds: 30), () { if (!abort.isCompleted) abort.complete(); });
    try {
      final request = http.AbortableRequest(method, uri, abortTrigger: abort.future)..followRedirects = false;
      request.headers.addAll({'Accept': 'application/json', ...headers});
      if (body != null) { request.headers['Content-Type'] = 'application/json'; request.body = jsonEncode(body); }
      if (bytes != null) request.bodyBytes = bytes;
      final response = await client.send(request);
      if (response.contentLength != null && response.contentLength! > 65536) throw const Failure('invalid_response');
      final out = BytesBuilder(copy: false);
      await for (final chunk in response.stream) {
        if (generation != epoch || abort.isCompleted) throw const Failure('request_cancelled');
        if (out.length + chunk.length > 65536) throw const Failure('invalid_response');
        out.add(chunk);
      }
      if (generation != epoch || abort.isCompleted) throw const Failure('request_cancelled');
      if (response.statusCode >= 300 && response.statusCode < 400) throw const Failure('redirect_rejected');
      if (response.statusCode == 204) return {};
      if (response.statusCode == 401) throw const Failure('sign_in_required');
      final value = jsonDecode(utf8.decode(out.takeBytes()));
      if (value is! Map<String, dynamic>) throw const Failure('invalid_response');
      if (response.statusCode < 200 || response.statusCode >= 300) {
        if (response.statusCode == 401) throw const Failure('sign_in_required');
        if (response.statusCode == 409) throw const Failure('server_revision_changed');
        if (response.statusCode == 429) throw const Failure('rate_limited');
        if (response.statusCode == 503) throw const Failure('service_unavailable');
        throw const Failure('request_rejected');
      }
      return value;
    } on Failure { rethrow; }
    catch (_) { throw const Failure('connection_unavailable'); }
    finally { timer.cancel(); if (!abort.isCompleted) abort.complete(); _pending.remove(abort); }
  }
  void dispose() { cancel(); client.close(); }
}
