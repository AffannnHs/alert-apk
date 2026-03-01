import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.eas.mobile',
  appName: 'Emergency Alert',
  webDir: 'dist',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: false,
          androidScheme: 'https',
        },
      }
    : {}),
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    Geolocation: {
      // Izin lokasi di background
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#FF0000',
      sound: 'beep.wav',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f1117',
    },
    BackgroundGeolocation: {
      locationAuthorizationRequest: 'Always',
      backgroundPermissionRationale: {
        title: 'Izin Lokasi Background',
        message: 'EAS butuh akses lokasi di background untuk update posisi dan terima alert.',
        positiveAction: 'Izinkan',
        negativeAction: 'Tolak',
      },
    },
  },
};

export default config;
