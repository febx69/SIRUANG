import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dinkes.pamekasan.siruang',
  appName: 'SIRUANG',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
