export async function configureNativeShell() {
  try {
    const [{ Capacitor }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
    ]);

    if (!Capacitor.isNativePlatform?.()) return false;

    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#f8fafc" });
    await StatusBar.setOverlaysWebView({ overlay: false });
    await SplashScreen.hide();
    return true;
  } catch (error) {
    return false;
  }
}
