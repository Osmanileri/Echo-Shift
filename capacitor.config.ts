import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.osmanileri.echoshift',
  appName: 'Echo Shift',
  webDir: 'dist',
  backgroundColor: '#000000',
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'Echo Shift',
  },
  android: {
    backgroundColor: '#000000',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
    },
    Keyboard: {
      resize: 'none',
      style: 'DARK',
    },
  },
};

export default config;
