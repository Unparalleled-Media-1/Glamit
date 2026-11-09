import 'package:flutter_riverpod/flutter_riverpod.dart';

/// F1 session state is deliberately local and never represented as account data.
class PreviewSession {
  const PreviewSession({this.saved = const {}, this.mood = 0, this.tool = 0,
    this.compare = .5, this.brief = '', this.filter = 0});
  final Set<int> saved;
  final int mood, tool, filter;
  final double compare;
  final String brief;
  PreviewSession copyWith({Set<int>? saved, int? mood, int? tool,
    double? compare, String? brief, int? filter}) => PreviewSession(
      saved: saved ?? this.saved, mood: mood ?? this.mood, tool: tool ?? this.tool,
      compare: compare ?? this.compare, brief: brief ?? this.brief,
      filter: filter ?? this.filter);
}

class PreviewController extends Notifier<PreviewSession> {
  @override
  PreviewSession build() => const PreviewSession();
  void toggleSaved(int id) {
    final next = {...state.saved};
    if (!next.add(id)) next.remove(id);
    state = state.copyWith(saved: next);
  }
  void mood(int value) => state = state.copyWith(mood: value);
  void tool(int value) => state = state.copyWith(tool: value);
  void compare(double value) => state = state.copyWith(compare: value);
  void filter(int value) => state = state.copyWith(filter: value);
  void brief(String value) => state = state.copyWith(brief: value.trim());
  void clear() => state = const PreviewSession();
}

final previewProvider = NotifierProvider<PreviewController, PreviewSession>(PreviewController.new);
