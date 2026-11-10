import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';

void main() {
  // F1 is an intentionally offline visual review. No provider, auth, permission,
  // payment or production backend is initialized before design approval.
  runApp(const ProviderScope(child: GlamBeautyApp()));
}
