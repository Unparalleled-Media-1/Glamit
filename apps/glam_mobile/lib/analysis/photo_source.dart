import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import '../core/config.dart';

/// Native sources only. Normalize selected bytes, strip metadata, retain no local report.
class PhotoSource {
  Future<Uint8List?> gallery() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600, maxHeight: 1600, imageQuality: 90, requestFullMetadata: false);
    return file == null ? null : normalize(file);
  }
  Future<Uint8List> normalize(XFile file) async {
    if (await file.length() > 10 * 1024 * 1024) throw const Failure('photo_size_invalid');
    final original = await file.readAsBytes();
    ui.ImmutableBuffer? buffer; ui.ImageDescriptor? descriptor; ui.Codec? codec; ui.Image? image;
    try {
      buffer = await ui.ImmutableBuffer.fromUint8List(original);
      descriptor = await ui.ImageDescriptor.encoded(buffer);
      if (descriptor.width < 480 || descriptor.height < 480 || descriptor.width * descriptor.height > 24000000) throw const Failure('photo_dimensions_invalid');
      final scale = math.min(1.0, 1600 / math.max(descriptor.width, descriptor.height));
      final width = (descriptor.width * scale).round();
      if (width < 480 || descriptor.height * scale < 480) throw const Failure('photo_dimensions_invalid');
      codec = await descriptor.instantiateCodec(targetWidth: width);
      final frame = await codec.getNextFrame(); image = frame.image;
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      if (data == null || data.lengthInBytes > 10 * 1024 * 1024) throw const Failure('photo_size_invalid');
      return Uint8List.fromList(data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes));
    } on Failure { rethrow; }
    catch (_) { throw const Failure('photo_unreadable'); }
    finally {
      image?.dispose(); codec?.dispose(); descriptor?.dispose(); buffer?.dispose(); original.fillRange(0, original.length, 0);
      // Delete only a copied temporary file; never remove the user's original library item.
      try {
        final temp = await (await getTemporaryDirectory()).resolveSymbolicLinks();
        final path = await File(file.path).resolveSymbolicLinks();
        if (path.startsWith('$temp${Platform.pathSeparator}')) await File(path).delete();
      } catch (_) { /* OS cache cleanup may retry; no permanent photo is deleted. */ }
    }
  }
}
