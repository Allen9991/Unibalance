# UniBalance Native Build Notes

Native iOS and Android work is currently paused.

The project is now web-first. We will return to iOS/Android only after the web app is stable, deployed, and being used by real students.

See [web-roadmap.md](web-roadmap.md) for the active plan.

The notes below are preserved for later, because the Capacitor setup already exists.

## Current native setup

- App id: `com.unibalance.app`
- App name: `UniBalance`
- Web output copied from: `dist`
- Native platforms generated:
  - `ios/`
  - `android/`
- Native plugins:
  - `@capacitor/preferences` for native persistence
  - `@capacitor/splash-screen`
  - `@capacitor/status-bar`

## Commands

Do not use these during normal web-first development unless native work has explicitly resumed.

```bash
npm run cap:sync
./node_modules/.bin/cap open ios
./node_modules/.bin/cap open android
```

Android debug APK, once the Android SDK is installed:

```bash
cd android
JAVA_HOME=/Users/allenpanikulam/Library/Java/JavaVirtualMachines/ms-21.0.7/Contents/Home ./gradlew assembleDebug
```

The generated debug APK is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Local machine setup

- iOS build requires full Xcode. This machine currently has Command Line Tools active, so `xcodebuild` cannot build the iOS app yet.
- Android command-line tools are installed through Homebrew.
- Android SDK root is `/Users/allenpanikulam/Library/Android/sdk`.
- Installed Android SDK packages:
  - `platform-tools`
  - `platforms;android-36`
  - `build-tools;35.0.0`
  - `build-tools;36.0.0`
  - `emulator`
- Java 25 is too new for the Android Gradle toolchain here; use the installed JDK 21 path shown above.

## AI proxy from native

Installed native builds cannot call Vite's local middleware at `/api/anthropic/messages`.
Set `VITE_AI_PROXY_BASE_URL` to a reachable proxy host when building for device testing.

For the current web-first phase, use the normal local web proxy with:

```bash
npm run dev
```
