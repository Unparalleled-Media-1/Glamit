import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:uuid/uuid.dart';
import '../core/config.dart';
import '../core/session.dart';
import '../core/transport.dart';
import 'contracts.dart';

class AnalysisRepository {
  AnalysisRepository(this.config, this.session, this.transport);
  final MobileConfig config;
  final Session session;
  final Transport transport;
  static const _uuid = Uuid();
  String key() => _uuid.v4();
  Future<Map<String, dynamic>> request(String path, {String method = 'GET', Object? body, Uint8List? bytes, String? key}) async {
    final origin = config.api;
    if (origin == null) throw const Failure('api_not_configured');
    final token = await session.token(), epoch = session.generation, owner = session.subject;
    final value = await transport.json(origin.resolve(path), method: method, body: body, bytes: bytes,
      headers: {'Authorization': 'Bearer $token', if (bytes != null) 'Content-Type': 'image/png', if (key != null) 'Idempotency-Key': identifier(key)});
    if (epoch != session.generation || owner != session.subject) throw const Failure('session_changed');
    return value;
  }
  Future<List<AnalysisJob>> history() async {
    final origin=config.api;if(origin==null)throw const Failure('api_not_configured');
    final token=await session.token(),epoch=session.generation,owner=session.subject;
    final values=await transport.jsonList(origin.resolve('/v1/analysis/jobs'),headers:{'Authorization':'Bearer $token'});
    if(epoch!=session.generation || owner!=session.subject)throw const Failure('session_changed');
    final jobs=values.map((v)=>AnalysisJob.fromJson(object(v))).toList();
    require(jobs.map((v)=>v.id).toSet().length==jobs.length);
    return jobs;
  }
  Future<Uint8List> photoFor(Report report) async {
    final origin=config.api;if(origin==null)throw const Failure('api_not_configured');
    if(!report.expires.isAfter(DateTime.now()))throw const Failure('report_expired');
    final token=await session.token(),epoch=session.generation,owner=session.subject;
    final media=MediaRecord.fromJson(await request('/v1/media/${identifier(report.mediaId)}'));
    require(media.id==report.mediaId && media.state=='ready');
    if(epoch!=session.generation || owner!=session.subject)throw const Failure('session_changed');
    final bytes=await transport.privatePng(origin.resolve('/v1/media/${media.id}/content'),headers:{'Authorization':'Bearer $token'});
    if(epoch!=session.generation || owner!=session.subject || !report.expires.isAfter(DateTime.now())) {
      bytes.fillRange(0,bytes.length,0);throw const Failure('session_changed');
    }
    if(bytes.length!=media.storedSize){bytes.fillRange(0,bytes.length,0);throw const Failure('invalid_response');}
    return bytes;
  }
  Future<Permissions> permissions() async => Permissions.fromJson(await request('/v1/analysis/permissions'));
  Future<void> available() async {
    for (final (path, scope) in [('/v1/media/status','private_media_storage'),('/v1/analysis/status','cosmetic_analysis_and_passport')]) {
      final v = await request(path);
      require(v['scope'] == scope && ['CONNECTED','NOT CONFIGURED','DEGRADED'].contains(v['state']));
      if (v['state'] != 'CONNECTED') throw const Failure('analysis_unavailable');
    }
  }
  Future<void> consent(Permission p) async {
    final result = await request('/v1/policies/${p.id}/consent', method: 'POST', key: key(), body: {'action':'granted'});
    identifier(result['id']); require(result['action'] == 'granted');
  }
  Future<MediaRecord> upload(Uint8List photo, String policy, {required String requestKey}) async {
    if (photo.length < 8 || photo.length > 10 * 1024 * 1024) throw const Failure('photo_size_invalid');
    require(photo.take(8).join(',') == '137,80,78,71,13,10,26,10');
    final intent = MediaRecord.fromJson(await request('/v1/media', method: 'POST', key: requestKey,
      body: {'policy_id': identifier(policy), 'content_type':'image/png', 'size_bytes':photo.length, 'sha256':sha256.convert(photo).toString()}));
    if (intent.state == 'ready') return intent;
    require(intent.state == 'pending');
    final media = MediaRecord.fromJson(await request('/v1/media/${intent.id}/content', method: 'PUT', bytes: photo));
    require(media.id == intent.id && media.state == 'ready'); return media;
  }
  Future<AnalysisJob> submit(Map<String, dynamic> pending) async {
    final job = AnalysisJob.fromJson(await request('/v1/analysis/jobs', method: 'POST', key: identifier(pending['request_key']),
      body: {'media_id':identifier(pending['media_id']), 'policy_id':identifier(pending['policy_id']), 'consent':true, 'goals':['Understand my features','Discover my colors']}));
    require(job.mediaId == pending['media_id']); return job;
  }
  Future<AnalysisJob> job(String id) async {
    final value = AnalysisJob.fromJson(await request('/v1/analysis/jobs/${identifier(id)}'));
    require(value.id == id); return value;
  }
  Future<Report> report(String id) async {
    final value = Report.fromJson(await request('/v1/analysis/jobs/${identifier(id)}/corrected-report'), session.subject!);
    require(value.id == id); return value;
  }
  Future<Passport> passport() async => Passport.fromJson(await request('/v1/me/analysis-passport'), session.subject!);
  Future<Passport> save(Report report) async {
    final current = await passport();
    final saved = Passport.fromJson(await request('/v1/me/analysis-passport', method: 'PUT', body: {
      'job_id':report.id, 'expected_passport_revision':current.version, 'expected_correction_revision':report.correctionRevision}), session.subject!);
    require(saved.report?.id == report.id && saved.report?.correctionRevision == report.correctionRevision); return saved;
  }
  Future<Report> correct(Report report, String field, String? value) async {
    require(['face-shape','eyes','brows','lips','undertone'].contains(field));
    final edits = {...report.userCorrections};
    if (value == null) { edits.remove(field); } else { edits[field] = text(value.trim(), 240); }
    final updated = Report.fromJson(await request('/v1/analysis/jobs/${report.id}/corrections', method:'POST', key:key(), body:{
      'expected_revision':report.correctionRevision, 'corrections':edits}), session.subject!);
    require(updated.id == report.id && updated.mediaId == report.mediaId && updated.correctionRevision >= report.correctionRevision);
    return updated;
  }
  Future<void> remove(String jobId, String mediaId) async {
    final cancelled = AnalysisJob.fromJson(await request('/v1/analysis/jobs/${identifier(jobId)}', method:'DELETE'));
    require(['cancelled','expired'].contains(cancelled.state) && cancelled.id == jobId);
    final media = await request('/v1/media/${identifier(mediaId)}', method:'DELETE');
    require(['deletion_pending','deleted'].contains(media['state']));
  }
}
