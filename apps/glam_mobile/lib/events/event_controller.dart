import 'package:flutter/foundation.dart';
import 'event_brief.dart';

/// In-memory state for the "dress for an event" journey. Deliberately not persisted or uploaded: remembering events
/// across launches or syncing them is a product/privacy decision that has not been made.
class EventDressController extends ChangeNotifier {
  EventDressController({DateTime Function()? now}) : _now = now ?? DateTime.now;
  final DateTime Function() _now;
  EventBrief brief = EventBrief();
  final Set<String> done = {};
  DateTime get today { final n = _now(); return DateTime(n.year, n.month, n.day); }
  void update(void Function(EventBrief b) change) { change(brief); notifyListeners(); }
  void toggle(String id) { done.contains(id) ? done.remove(id) : done.add(id); notifyListeners(); }
  void reset() { brief = EventBrief(); done.clear(); notifyListeners(); }
}
