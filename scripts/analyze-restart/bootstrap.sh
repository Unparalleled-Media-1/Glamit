#!/usr/bin/env bash
set -euo pipefail
cd apps/glam_mobile
flutter create --no-pub --platforms=ios,android --project-name=glam_mobile --org=com.glambeauty.analyze .
python3 - <<'PY'
from pathlib import Path
import plistlib,re,shutil
identifier='com.glambeauty.analyzereview'
p=Path('android/app/build.gradle.kts');s=p.read_text();s,n=re.subn(r'applicationId = "[^"]+"',f'applicationId = "{identifier}"',s);assert n==1;p.write_text(s)
p=Path('android/app/src/main/AndroidManifest.xml');s=p.read_text();s=re.sub(r'android:label="[^"]+"','android:label="GLAM Beauty"',s)
s=s.replace('<application','<uses-permission android:name="android.permission.CAMERA"/><uses-permission android:name="android.permission.INTERNET"/><uses-feature android:name="android.hardware.camera.any" android:required="false"/><application',1)
s=s.replace('<application','<application android:enableOnBackInvokedCallback="true"',1);p.write_text(s)
p=Path('ios/Runner.xcodeproj/project.pbxproj');s=p.read_text();s,n=re.subn(r'PRODUCT_BUNDLE_IDENTIFIER = [^;]+;',lambda m:f'PRODUCT_BUNDLE_IDENTIFIER = {identifier}'+('.RunnerTests;' if 'RunnerTests' in m.group() else ';'),s);assert n>=3
s=re.sub(r'IPHONEOS_DEPLOYMENT_TARGET = [^;]+;','IPHONEOS_DEPLOYMENT_TARGET = 15.0;',s);p.write_text(s)
p=Path('ios/Runner/Info.plist')
with p.open('rb') as f:d=plistlib.load(f)
d['CFBundleDisplayName']='GLAM Beauty'
d['NSCameraUsageDescription']='Frame and capture your photo. Upload and analysis require separate permission.'
d['NSPhotoLibraryUsageDescription']='Choose a photo for your private beauty analysis.'
with p.open('wb') as f:plistlib.dump(d,f)
p=Path('ios/Podfile')
if p.exists():p.write_text(re.sub(r"#?\s*platform :ios, '[^']+'","platform :ios, '15.0'",p.read_text()))
for image in Path('ios/Runner/Assets.xcassets/LaunchImage.imageset').glob('*.png'):shutil.copyfile('assets/brand/app-icon.png',image)
p=Path('test/widget_test.dart')
if p.exists():p.unlink()
PY
