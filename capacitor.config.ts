import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.betha.helena',
  appName: 'Helena',
  webDir: 'www',
  server: {
    // Serve a WebView por http://localhost (não https). Assim requests HTTP para
    // um servidor na LAN/remoto (ex.: http://192.168.x.x:5000) não são bloqueados
    // como "mixed content" (seriam, se a página fosse https). O conteúdo do app é
    // empacotado localmente, então servir por http local é aceitável.
    androidScheme: 'http',
  },
};

export default config;
