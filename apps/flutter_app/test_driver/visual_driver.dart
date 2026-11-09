import 'dart:convert';
import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() async {
  final directory = Directory(Platform.environment['GLAM_FLUTTER_EVIDENCE'] ?? '../../artifacts/flutter-f1');
  await directory.create(recursive: true);
  final names = <String>[];
  await integrationDriver(onScreenshot: (name, bytes, [arguments]) async {
    if (!RegExp(r'^\d{2}-[a-z-]+$').hasMatch(name)) return false;
    await File('${directory.path}/$name.png').writeAsBytes(bytes, flush: true);
    names.add(name);
    stdout.writeln('F1_NATIVE_SCREENSHOT $name (${bytes.length} bytes)');
    return true;
  });
  await File('${directory.path}/screenshots.json').writeAsString(jsonEncode({
    'runtime': 'installed Flutter native application',
    'screenshots': names,
    'visual_approval': 'PENDING USER REVIEW',
    'backend_operations': 'NOT CONNECTED IN F1',
    'physical_device': 'NOT TESTED',
  }));
}
