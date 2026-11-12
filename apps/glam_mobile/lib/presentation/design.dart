import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../design/tokens.dart';

/// Mobile chrome and touch scales; no website layout or typography is imported.
abstract final class MobileDesign {
  static const background = Color(0xff0f0e10), cream = Color(0xfff8f3ef), rose = Color(0xffb76d8c), blush = Color(0xfff6c6d8);
  static ThemeData theme() => ThemeData(brightness: Brightness.dark, useMaterial3: true,
    scaffoldBackgroundColor: background, extensions: const [GlamTokens.dark],
    colorScheme: const ColorScheme.dark(primary: blush, onPrimary: background, surface: background, onSurface: cream),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(minimumSize: const Size(48, 54),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)))),
    bottomSheetTheme: const BottomSheetThemeData(showDragHandle: true, backgroundColor: Color(0xff282329),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28)))),
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder(), filled: true),
  );
  static Future<T?> sheet<T>(BuildContext context, Widget child) => showModalBottomSheet<T>(context: context,
    isScrollControlled: true, useSafeArea: true, useRootNavigator: true, builder: (context) => Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
      child: ConstrainedBox(constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .8),
        child: SingleChildScrollView(child: child))));
  static PageRoute<void> route(BuildContext context, Widget child) => Theme.of(context).platform == TargetPlatform.iOS
    ? CupertinoPageRoute(builder: (_) => child) : MaterialPageRoute(builder: (_) => child);
}
class TouchAction extends StatelessWidget {
  const TouchAction({super.key, required this.label, required this.icon, required this.onTap});
  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  @override Widget build(BuildContext context) => IconButton(tooltip: label, onPressed: onTap == null ? null : () {
    HapticFeedback.selectionClick(); onTap!();
  }, style: IconButton.styleFrom(minimumSize: const Size(48,48), backgroundColor: Colors.black45), icon: Icon(icon));
}
String message(String? code) => switch (code) {
  'private_record_unavailable' => 'These private records are no longer available. Reload your account to confirm their status.',
  'api_not_configured' => 'Private analysis is unavailable. Your photo has not been uploaded.',
  'auth_not_configured' => 'Sign-in is unavailable in this build. Your photo has not been uploaded.',
  'sign_in_required' => 'Sign in to your existing account to continue.',
  'sign_in_unavailable' => 'Email sign-in is unavailable. No account was created.',
  'device_cleanup_unconfirmed' => 'Local account cleanup could not be confirmed. Unlock your device and retry.',
  'session_changed' => 'Your session changed. Reopen your saved analysis after signing in.',
  'analysis_unavailable' || 'service_unavailable' => 'The analysis service is unavailable. Your result has not been simulated.',
  'eligibility_required' => 'This account is not currently eligible for private photo analysis.',
  'policy_changed' => 'The permission policy changed. Review the current policies before continuing.',
  'explicit_consent_required' => 'Confirm both photo-storage and analysis permissions.',
  'server_revision_changed' => 'This record changed. Reload it before saving again.',
  'rate_limited' => 'Too many requests. Wait before trying again.',
  'camera_permission_denied' => 'Camera permission is unavailable. You can use the photo library or change permission in device settings.',
  'camera_unavailable' => 'A camera is unavailable on this device. Use the photo library.',
  'photo_dimensions_invalid' => 'Choose a clear photo at least 480 pixels on each side.',
  'photo_size_invalid' => 'Choose a photo under 10 MB.',
  'photo_unreadable' => 'This photo could not be opened. Choose another photo.',
  'resume_previous_request' => 'Resume or remove the previous analysis before starting another.',
  'invalid_response' => 'The response could not be verified. No result was accepted.',
  'request_cancelled' => 'Stopped waiting. Server work may still exist; use Resume to confirm.',
  _ => 'The operation could not be confirmed. Check your connection and retry safely.',
};
