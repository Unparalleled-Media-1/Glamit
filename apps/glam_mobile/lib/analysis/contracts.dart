import '../core/config.dart';
void require(bool condition) { if (!condition) throw const Failure('invalid_response'); }
String identifier(dynamic value) {
  require(value is String && RegExp(r'^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$', caseSensitive: false).hasMatch(value));
  return value as String;
}
String text(dynamic value, [int max = 1000]) { require(value is String && value.trim().isNotEmpty && value.length <= max); return value as String; }
Map<String, dynamic> object(dynamic value) { require(value is Map<String, dynamic>); return value as Map<String, dynamic>; }
DateTime instant(dynamic value) { final date = value is String ? DateTime.tryParse(value) : null; require(date != null); return date!; }
int revision(dynamic value) { require(value is int && value >= 0 && value < 2147483647); return value as int; }

class Permission {
  Permission.fromJson(dynamic raw, String purpose) {
    final value = object(raw), policy = object(value['policy']);
    id = identifier(policy['id']); content = text(policy['content'], 30000); version = text(policy['version'], 200);
    require(policy['purpose'] == purpose && value['granted'] is bool); granted = value['granted'] as bool;
  }
  late final String id, content, version;
  late final bool granted;
}
class Permissions {
  Permissions.fromJson(Map<String, dynamic> value) {
    require(value['eligible'] is bool); eligible = value['eligible'] as bool;
    storage = Permission.fromJson(value['storage'], 'private_photo_storage');
    analysis = Permission.fromJson(value['analysis'], 'cosmetic_photo_analysis');
  }
  late final bool eligible;
  late final Permission storage, analysis;
  bool get allowed => eligible && storage.granted && analysis.granted;
}
class MediaRecord {
  MediaRecord.fromJson(Map<String, dynamic> value) {
    id = identifier(value['id']); state = text(value['state'], 32);
    require(['pending','ready','deletion_pending','deleted'].contains(state));
    require(value['content_type'] == 'image/png'); expires = instant(value['expires_at']);
    require(expires.isAfter(DateTime.now()));
    instant(value['created_at']);
    if (state == 'ready') {
      for (final key in ['width','height','stored_size']) { require(value[key] is int && (value[key] as int) > 0); }
      require((value['stored_size'] as int) <= 10 * 1024 * 1024);
    }
  }
  late final String id, state;
  late final DateTime expires;
}
class AnalysisJob {
  AnalysisJob.fromJson(Map<String, dynamic> value) {
    id = identifier(value['id']); mediaId = identifier(value['media_id']); state = text(value['state'], 32);
    require(['queued','running','completed','failed','cancelled','expired'].contains(state));
    expires = instant(value['expires_at']);
    require(value['error_code'] == null || value['error_code'] is String);
  }
  late final String id, mediaId, state;
  late final DateTime expires;
  bool get pending => ['queued','running'].contains(state) && expires.isAfter(DateTime.now());
}
class Finding {
  Finding.fromJson(dynamic raw, Map<String, dynamic> corrections) {
    final v = object(raw); key = text(v['key'], 40);
    require(['face-shape','eyes','brows','lips','undertone'].contains(key));
    certainty = text(v['ai_certainty'], 32); uncertainty = text(v['uncertainty']);
    require(['supported','tentative','unavailable'].contains(certainty));
    final estimate = v['ai_estimate'], correction = v['user_correction'];
    require((certainty == 'unavailable') == (estimate == null));
    if (estimate != null) text(estimate, 240);
    if (correction != null) text(correction, 240);
    require(correction == corrections[key] && v['display_value'] == (correction ?? estimate));
    require(v['source'] == (correction == null ? 'ai' : 'user'));
    value = v['display_value'] as String?;
    userCorrected = correction != null;
  }
  late final String key, certainty, uncertainty;
  late final String? value;
  late final bool userCorrected;
}
class Report {
  Report.fromJson(Map<String, dynamic> value, String owner) {
    id = identifier(value['id']); mediaId = identifier(value['media_id']);
    require(value['subject'] == owner && value['provider'] == 'openai');
    model = text(value['model'], 200); expires = instant(value['expires_at']);
    require(expires.isAfter(DateTime.now())); correctionRevision = revision(value['correction_revision']);
    final corrections = object(value['corrections']);
    require(corrections.length <= 5);
    userCorrections = {};
    for (final entry in corrections.entries) {
      require(['face-shape','eyes','brows','lips','undertone'].contains(entry.key)); text(entry.value, 240); userCorrections[entry.key] = entry.value as String;
    }
    require(value['findings'] is List && (value['findings'] as List).length == 5);
    findings = (value['findings'] as List).map((v) => Finding.fromJson(v, corrections)).toList();
    require(findings.map((v) => v.key).toSet().length == 5);
    require(value['directions'] is List && (value['directions'] as List).length <= 12);
    directions = (value['directions'] as List).map((v) {
      final d = object(v); return (title: text(d['title'], 160), rationale: text(d['rationale']));
    }).toList();
  }
  late final String id, mediaId, model;
  late final DateTime expires;
  late final int correctionRevision;
  late final Map<String, String> userCorrections;
  late final List<Finding> findings;
  late final List<({String title, String rationale})> directions;
}
class Passport {
  Passport.fromJson(Map<String, dynamic> value, String owner) {
    identifier(value['id']); require(value['profile_id'] == owner);
    version = revision(value['revision']); require(version > 0);
    final state = value['analysis_state']; require(['empty','ready','expired'].contains(state));
    require((state == 'ready') == (value['analysis'] != null));
    report = value['analysis'] == null ? null : Report.fromJson(object(value['analysis']), owner);
  }
  late final int version;
  late final Report? report;
}
