import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'config.dart';

/// Redirect-free, abortable transport; writes are never automatically retried.
class Transport {
  Transport(this.client);
  final http.Client client;
  final _pending = <Completer<void>>{};
  int generation = 0;
  void cancel() {
    generation++;
    for (final abort in _pending.toList()) { if (!abort.isCompleted) abort.complete(); }
  }
  Future<Uint8List> _read(Uri uri, {String method = 'GET', Map<String,String> headers = const {},
    Object? body, Uint8List? bytes, bool png = false}) async {
    if (uri.scheme != 'https' || uri.userInfo.isNotEmpty) throw const Failure('invalid_connection');
    final epoch = generation, abort = Completer<void>();
    _pending.add(abort);
    final timer = Timer(const Duration(seconds:30), () { if (!abort.isCompleted) abort.complete(); });
    try {
      final request = http.AbortableRequest(method,uri,abortTrigger:abort.future)..followRedirects=false;
      request.headers.addAll({'Accept':png?'image/png':'application/json',...headers});
      if (body != null) { request.headers['Content-Type']='application/json';request.body=jsonEncode(body); }
      if (bytes != null) request.bodyBytes=bytes;
      final response = await client.send(request);
      final success = response.statusCode >= 200 && response.statusCode < 300;
      final limit = png && success ? 10*1024*1024 : 65536;
      if (response.contentLength != null && (response.contentLength! < 0 || response.contentLength! > limit)) throw const Failure('invalid_response');
      if (png && success && response.headers['content-type']?.split(';').first.trim().toLowerCase() != 'image/png') throw const Failure('invalid_response');
      final out=BytesBuilder(copy:false);
      await for(final chunk in response.stream) {
        if (generation != epoch || abort.isCompleted) throw const Failure('request_cancelled');
        if (out.length+chunk.length > limit) throw const Failure('invalid_response');
        out.add(chunk);
      }
      if (generation != epoch || abort.isCompleted) throw const Failure('request_cancelled');
      if (response.statusCode >= 300 && response.statusCode < 400) throw const Failure('redirect_rejected');
      if (!success) {
        throw Failure(switch(response.statusCode) {
          401=>'sign_in_required',403 || 404 || 410=>'private_record_unavailable',409=>'server_revision_changed',429=>'rate_limited',503=>'service_unavailable',_=>'request_rejected'});
      }
      return out.takeBytes();
    } on Failure { rethrow; }
    catch (_) { throw const Failure('connection_unavailable'); }
    finally { timer.cancel();if(!abort.isCompleted)abort.complete();_pending.remove(abort); }
  }
  Future<dynamic> _json(Uri uri,{String method='GET',Map<String,String> headers=const {},Object? body,Uint8List? bytes}) async {
    final data=await _read(uri,method:method,headers:headers,body:body,bytes:bytes);
    if(data.isEmpty)return <String,dynamic>{};
    try{return jsonDecode(utf8.decode(data));}catch(_){throw const Failure('invalid_response');}
  }
  Future<Map<String,dynamic>> json(Uri uri,{String method='GET',Map<String,String> headers=const {},Object? body,Uint8List? bytes}) async {
    final value=await _json(uri,method:method,headers:headers,body:body,bytes:bytes);
    if(value is! Map<String,dynamic>)throw const Failure('invalid_response');return value;
  }
  Future<List<dynamic>> jsonList(Uri uri,{Map<String,String> headers=const {}}) async {
    final value=await _json(uri,headers:headers);
    if(value is! List || value.length>100)throw const Failure('invalid_response');return value;
  }
  Future<Uint8List> privatePng(Uri uri,{required Map<String,String> headers}) async {
    final value=await _read(uri,headers:headers,png:true);
    if(value.length<8 || value.take(8).join(',')!='137,80,78,71,13,10,26,10')throw const Failure('invalid_response');
    return value;
  }
  void dispose(){cancel();client.close();}
}
