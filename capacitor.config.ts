import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.unibalance.app',
  appName: 'UniBalance',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: '#f8fafc',
      showSpinner: false
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f8fafc',
      overlaysWebView: false
    }
  }
};

export default config;
