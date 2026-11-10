// Isolated HTTP test fixtures only. Nothing in this file is imported by the app.
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:glam_mobile/core/config.dart';
import 'package:glam_mobile/core/session.dart';
import 'package:glam_mobile/core/transport.dart';
import 'package:glam_mobile/analysis/controller.dart';
import 'package:glam_mobile/analysis/contracts.dart';
import 'package:glam_mobile/analysis/repository.dart';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';
const jobId = '44444444-4444-4444-8444-444444444444';
const policy1 = '55555555-5555-4555-8555-555555555555';
const policy2 = '66666666-6666-4666-8666-666666666666';
String get future => DateTime.now().add(const Duration(hours:1)).toIso8601String();
Uint8List get protocolFixture => Uint8List.fromList([137,80,78,71,13,10,26,10,0]);
class MemoryVault implements Vault {
  final values = <String,String>{};
  @override Future<String?> read(String key) async => values[key];
  @override Future<void> write(String key, String value) async { values[key] = value; }
  @override Future<void> remove(String key) async { values.remove(key); }
}
class Harness {
  Harness() {
    transport = Transport(MockClient(handle));
    session = Session(config, transport, vault);
    repository = AnalysisRepository(config, session, transport);
    controller = AnalyzeController(repository, session, vault);
  }
  final config = const MobileConfig(apiOrigin:'https://api.example.test', publicKey:'sb_publishable_unit_fixture_only');
  final vault = MemoryVault();
  late final Transport transport;
  late final Session session;
  late final AnalysisRepository repository;
  late final AnalyzeController controller;
  final requests = <http.Request>[];
  bool storage = false, analysis = false, selected = false;
  String state = 'CONNECTED', reportOwner = owner;
  bool rejectSave = false;
  final edits = <String,String>{};
  int correctionRevision = 0;
  Completer<http.Response>? reportWait;
  bool reportRequested = false;
  Map<String,dynamic> report() => {'id':jobId,'media_id':mediaId,'subject':reportOwner,'provider':'openai','model':'unit-fixture-not-a-provider-call',
    'completed_at':DateTime.now().toIso8601String(),'expires_at':future,'correction_revision':correctionRevision,'corrections':edits,
    'findings':['face-shape','eyes','brows','lips','undertone'].map((key) => {'key':key,'ai_estimate':key=='lips'?null:'fixture observation',
      'ai_certainty':key=='lips'?'unavailable':'tentative','uncertainty':'Synthetic test fixture; lighting can limit an estimate.',
      'user_correction':edits[key],'display_value':edits[key] ?? (key=='lips'?null:'fixture observation'),'source':edits.containsKey(key)?'user':'ai'}).toList(), 'directions':[]};
  Map<String,dynamic> passport() => {'id':policy1,'profile_id':owner,'revision':selected?2:1,'analysis_state':selected?'ready':'empty','analysis':selected?report():null};
  http.Response response(Object value, [int status=200]) => http.Response(jsonEncode(value),status,headers:{'content-type':'application/json'});
  Future<http.Response> handle(http.Request r) async {
    requests.add(r);
    final path=r.url.path;
    if(path=='/auth/v1/settings') return response({'external':{'email':true}});
    if(path=='/auth/v1/token') return response({'access_token':'unit-access','refresh_token':'unit-refresh','expires_in':3600});
    if(path=='/auth/v1/user') return response({'id':owner});
    expect(r.headers['Authorization'] ?? r.headers['authorization'], 'Bearer unit-access');
    if(path=='/v1/analysis/permissions') return response({'eligible':true,
      'storage':{'granted':storage,'policy':{'id':policy1,'purpose':'private_photo_storage','version':'unit','content':'Test storage policy'}},
      'analysis':{'granted':analysis,'policy':{'id':policy2,'purpose':'cosmetic_photo_analysis','version':'unit','content':'Test analysis policy'}}});
    if(path.endsWith('/status')) return response({'state':state,'scope':path.contains('/media/')?'private_media_storage':'cosmetic_analysis_and_passport'});
    if(path.contains('/policies/')) { if(path.contains(policy1)) storage=true; else analysis=true; return response({'id':policy1,'action':'granted'},201); }
    if(path=='/v1/media') {
      final body=jsonDecode(r.body) as Map;
      expect(body['size_bytes'],protocolFixture.length); expect(body['sha256'],matches(RegExp(r'^[a-f0-9]{64}$')));
      expect(r.headers['Idempotency-Key'] ?? r.headers['idempotency-key'], isNotEmpty);
      return response({'id':mediaId,'state':'pending','content_type':'image/png','expires_at':future,'created_at':DateTime.now().toIso8601String()});
    }
    if(path=='/v1/media/$mediaId/content') {
      expect(r.bodyBytes, protocolFixture);
      return response({'id':mediaId,'state':'ready','content_type':'image/png','width':512,'height':640,'stored_size':1024,
        'expires_at':future,'created_at':DateTime.now().toIso8601String()});
    }
    if(path=='/v1/analysis/jobs' || path=='/v1/analysis/jobs/$jobId') return response({'id':jobId,'media_id':mediaId,'state':'completed','expires_at':future,'error_code':null});
    if(path.endsWith('/corrected-report')) { reportRequested=true; return reportWait==null?response(report()):reportWait!.future; }
    if(path.endsWith('/corrections')) {
      final body=jsonDecode(r.body) as Map; expect(body['expected_revision'],correctionRevision);
      edits..clear()..addAll(Map<String,String>.from(body['corrections'] as Map)); correctionRevision++;
      return response(report());
    }
    if(path=='/v1/me/analysis-passport') {
      if(r.method=='PUT') {
        if(rejectSave) return response({'detail':'conflict'},409);
        final body=jsonDecode(r.body) as Map;
        expect(body['job_id'],jobId); expect(body['expected_passport_revision'],1);
        expect(body['expected_correction_revision'],correctionRevision); selected=true;
      }
      return response(passport());
    }
    return response({'detail':'unexpected unit-test route'},404);
  }
  Future<void> begin() async {
    await session.signIn('fixture@example.test','unit-password'); controller.select(protocolFixture);
    await controller.policies();
  }
  Future<void> analyze() => controller.analyze(storageChecked:true,analysisChecked:true);
  void dispose() { controller.dispose(); transport.dispose(); }
}
void main() {
  test('Config rejects insecure API addresses and privileged build keys', () {
    expect(const MobileConfig(apiOrigin:'http://api.example.test').api,isNull);
    expect(const MobileConfig(apiOrigin:'https://user:pass@api.example.test').api,isNull);
    expect(const MobileConfig(apiOrigin:'https://api.example.test/v1').api,isNull);
    expect(const MobileConfig(publicKey:'sb_secret_do_not_embed').authConfigured,isFalse);
  });
  test('Real contracts upload, consent, return uncertain findings, correct, save and reopen (isolated fixtures)', () async {
    final h=Harness();addTearDown(h.dispose);await h.begin();await h.analyze();
    expect(h.controller.error,isNull);expect(h.controller.phase,'report');
    expect(h.controller.report!.findings.last.certainty,'tentative');
    expect(h.controller.report!.findings.firstWhere((f)=>f.key=='lips').value,isNull);
    await h.controller.correct('face-shape','My correction');
    await h.controller.correct('undertone','My undertone');
    expect(h.controller.report!.userCorrections.keys,containsAll(['face-shape','undertone']));
    await h.controller.save();expect(h.controller.saved,isTrue);
    expect(h.vault.values.values.join(),isNot(contains('unit-access')));
    expect(h.vault.values.values.join(),isNot(contains('unit-refresh')));
    expect(h.vault.values.values.join(),isNot(contains('unit-password')));
    h.controller.lock();expect(h.controller.report,isNull);
    await h.session.signIn('fixture@example.test','unit-password');await h.controller.resume();
    expect(h.controller.report!.id,jobId);expect(h.controller.saved,isTrue);
  });
  test('No upload occurs without both explicit approvals', () async {
    final h=Harness();addTearDown(h.dispose);await h.begin();
    await h.controller.analyze(storageChecked:true,analysisChecked:false);
    expect(h.controller.error,'explicit_consent_required');
    expect(h.requests.where((r)=>r.url.path=='/v1/media'),isEmpty);
  });
  test('Unconfigured analysis is a blocker, not a substitute result', () async {
    final h=Harness();addTearDown(h.dispose);h.state='NOT CONFIGURED';await h.begin();
    expect(h.controller.error,'analysis_unavailable');expect(h.controller.report,isNull);
    expect(h.requests.where((r)=>r.url.path=='/v1/media'),isEmpty);
  });
  test('Cross-account report is never accepted', () async {
    final h=Harness();addTearDown(h.dispose);h.reportOwner=other;await h.begin();await h.analyze();
    expect(h.controller.error,'invalid_response');expect(h.controller.report,isNull);
  });
  test('A rejected server save does not display saved success', () async {
    final h=Harness();addTearDown(h.dispose);await h.begin();await h.analyze();h.rejectSave=true;
    await h.controller.save();expect(h.controller.saved,isFalse);expect(h.controller.error,'server_revision_changed');
  });
  test('Lock during an outstanding report clears private state and rejects its late response', () async {
    final h=Harness();addTearDown(h.dispose);h.reportWait=Completer<http.Response>();await h.begin();
    final operation=h.analyze();
    for(var i=0;i<100&&!h.reportRequested;i++) { await Future<void>.delayed(const Duration(milliseconds:1)); }
    expect(h.reportRequested,isTrue);h.controller.lock();h.reportWait!.complete(h.response(h.report()));await operation;
    expect(h.controller.report,isNull);expect(h.controller.photo,isNull);expect(h.controller.job,isNull);expect(h.controller.phase,'capture');
  });
  test('Transport rejects redirects and oversized bodies', () async {
    for(final response in [http.Response('{}',302),http.Response('x'*70000,200)]) {
      final transport=Transport(MockClient((r)async { expect(r.followRedirects,isFalse);return response; }));addTearDown(transport.dispose);
      await expectLater(transport.json(Uri.parse('https://api.example.test/')),throwsA(isA<Failure>()));
    }
  });
  test('Expired or inconsistent reports are rejected by the shared contract projection', () {
    final h=Harness();addTearDown(h.dispose);
    final expired=h.report()..['expires_at']='2020-01-01T00:00:00Z';
    expect(()=>Report.fromJson(expired,owner),throwsA(isA<Failure>()));
    final mismatched=h.report();(mismatched['findings'] as List)[0]['display_value']='invented';
    expect(()=>Report.fromJson(mismatched,owner),throwsA(isA<Failure>()));
  });
}
