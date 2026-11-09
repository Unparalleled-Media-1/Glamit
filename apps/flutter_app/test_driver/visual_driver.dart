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
    final platform = Platform.environment['GLAM_FLUTTER_PLATFORM'];
    final device = Platform.environment['GLAM_FLUTTER_DEVICE_ID'];
    if (device == null || !['android', 'ios'].contains(platform)) {
      throw StateError('Native OS screenshot target is required for F1 evidence');
    }
    await Future<void>.delayed(const Duration(milliseconds: 250));
    final osImage = File('${directory.path}/$name-os.png');
    if (platform == 'android') {
      final result = await Process.run('adb', ['-s', device, 'exec-out', 'screencap', '-p'], stdoutEncoding: null);
      if (result.exitCode != 0) throw StateError('Android compositor capture failed');
      await osImage.writeAsBytes(result.stdout as List<int>, flush: true);
    } else {
      final result = await Process.run('xcrun', ['simctl', 'io', device, 'screenshot', osImage.path]);
      if (result.exitCode != 0) throw StateError('iOS compositor capture failed');
    }
    final actual = await osImage.readAsBytes();
    if (actual.length < 10000 || actual[0] != 137 || actual[1] != 80) {
      throw StateError('Native compositor screenshot is missing or invalid');
    }

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
