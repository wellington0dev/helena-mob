# Helena (mobile/web client)

Cliente Ionic + Angular, empacotado com Capacitor, para o [**helena-ai**](https://github.com/wellington0dev/helena-ai.git) — um agente pessoal de IA que roda na máquina do próprio usuário.

Este repositório contém **apenas o cliente** (interface de chat, listas, configurações etc.). Toda a inteligência, o processamento e a API ficam no backend do projeto **helena-ai**, que precisa estar rodando localmente para este app funcionar.

> 📖 Para entender o que é a Helena, como o backend funciona, autenticação, jobs assíncronos e demais conceitos do sistema, consulte a documentação do repositório principal: **https://github.com/wellington0dev/helena-ai**

## Pré-requisitos

- [Node.js](https://nodejs.org/) 24+ e npm
- [Ionic CLI](https://ionicframework.com/docs/cli) (`npm install -g @ionic/cli`)
- O backend [helena-ai](https://github.com/wellington0dev/helena-ai.git) instalado e rodando (por padrão em `http://localhost:5000`)
- Para build Android: [Android Studio](https://developer.android.com/studio) + SDK/JDK configurados

## Baixando o projeto

```bash
git clone https://github.com/wellington0dev/helena-mob.git
cd helena-mob
npm install
```

## Rodando em modo desenvolvimento (navegador)

Com o backend do `helena-ai` já em execução em `http://localhost:5000`:

```bash
npm start
# ou: ionic serve
```

O app abre em `http://localhost:4200` e conversa com o backend através da URL configurada em [`src/environments/environment.ts`](src/environments/environment.ts).

## Compilando para produção (web)

```bash
npm run build
```

Os artefatos ficam em `www/`, prontos para deploy em qualquer servidor estático.

## Compilando para Android

O app usa Capacitor para empacotar como app nativo Android.

1. Gere o build web e sincronize com o projeto nativo:

   ```bash
   npm run build
   npx cap sync android
   ```

2. Abra no Android Studio e rode/compile a partir dele:

   ```bash
   npx cap open android
   ```

   Ou gere o APK/AAB diretamente pelo Gradle dentro da pasta `android/`.

### Conectando o app Android ao backend local

Como o `helena-ai` roda na máquina do usuário (não em produção na nuvem), ao testar em um dispositivo/emulador Android é preciso expor a porta do backend para o dispositivo, por exemplo via ADB:

```bash
adb reverse tcp:5000 tcp:5000
```

Isso faz o app no dispositivo enxergar `127.0.0.1:5000` como o backend rodando no seu PC (ver [`src/environments/environment.ts`](src/environments/environment.ts) para a URL usada em builds nativos).

## Configuração da URL da API

As URLs do backend estão em:

- [`src/environments/environment.ts`](src/environments/environment.ts) — desenvolvimento
- [`src/environments/environment.prod.ts`](src/environments/environment.prod.ts) — produção

Ajuste `apiUrl` (web) e `apiUrlNative` (app nativo) conforme o endereço onde o `helena-ai` estiver rodando.

## Testes

```bash
npm test
```

## Saiba mais

Este app é apenas a "porta de entrada" visual para a Helena. Para entender o agente em si — arquitetura, comandos, integrações e como rodá-lo — veja o repositório principal:

👉 **https://github.com/wellington0dev/helena-ai**
