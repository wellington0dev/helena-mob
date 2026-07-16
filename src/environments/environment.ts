// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.

export const environment = {
  production: false,
  // Web/dev (ng serve, Playwright).
  apiUrl: 'http://localhost:5000',
  // App nativo: `adb reverse tcp:5000 tcp:5000` faz o loopback do device chegar
  // no backend do PC. Usamos 127.0.0.1 (não "localhost") porque a stack HTTP
  // nativa em background não resolve o hostname "localhost" de forma confiável.
  apiUrlNative: 'http://127.0.0.1:5000',
};
