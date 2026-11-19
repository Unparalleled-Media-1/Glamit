import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';
import 'event_brief.dart';
import 'themed_events.dart';
import '../tryon/tryon_controller.dart';

/// Opens an external URL in the user's own app. Returns false when nothing could handle it.
typedef UrlOpener = Future<bool> Function(Uri uri);
Future<bool> openExternally(Uri uri) async { try { return await launchUrl(uri, mode: LaunchMode.externalApplication); } catch (_) { return false; } }

/// In-memory state for the "dress for an event" journey. Deliberately not persisted or uploaded: remembering events
/// across launches or syncing them is a product/privacy decision that has not been made.
class EventDressController extends ChangeNotifier {
  EventDressController({DateTime Function()? now, UrlOpener? openUrl, this.tryOn}) : _now = now ?? DateTime.now, openUrl = openUrl ?? openExternally;
  /// Real try-on journey; null (or an unavailable service) keeps the honest "not available" card.
  final TryOnController? tryOn;
  final DateTime Function() _now;
  final UrlOpener openUrl;
  String? selectedEventId;
  ThemedEvent get selectedEvent => themedEventById(selectedEventId ?? '') ?? kThemedEvents.first;
  EventBrief brief = EventBrief();
  final Set<String> done = {};
  DateTime get today { final n = _now(); return DateTime(n.year, n.month, n.day); }
  void update(void Function(EventBrief b) change) { change(brief); notifyListeners(); }
  void toggle(String id) { done.contains(id) ? done.remove(id) : done.add(id); notifyListeners(); }
  void select(ThemedEvent e) { selectedEventId = e.id; notifyListeners(); }
  /// Pre-fills the user's own event from a themed event; they can still edit every field.
  void applyThemed(ThemedEvent e) { selectedEventId = e.id; brief = e.toBrief(); done.clear(); notifyListeners(); }
  void reset() { brief = EventBrief(); done.clear(); selectedEventId = null; notifyListeners(); }
}
