# Helena (mobile/web client)

Cliente Ionic + Angular, empacotado com Capacitor, para o [**helena-ai**](https://github.com/wellington0dev/helena-ai.git) — um agente pessoal de IA que roda na máquina do próprio usuário.

Este repositório contém **apenas o cliente** (interface de chat, listas, configurações etc.). Toda a inteligência, o processamento e a API ficam no backend do projeto **helena-ai**, que precisa estar rodando localmente para este app funcionar.

> 📖 Para entender o que é a Helena, como o backend funciona, autenticação, jobs assíncronos e demais conceitos do sistema, consulte a documentação do repositório principal: **https://github.com/wellington0dev/helena-ai**

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ e npm
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

## Acessando a Helena fora da rede local (VPN)

Como o `helena-ai` roda na máquina pessoal do usuário, por padrão ele só é acessível quando o app está na mesma rede local (Wi-Fi/LAN). Para usar o app fora de casa (dados móveis, outra rede etc.), uma opção simples é criar uma VPN mesh com o [Tailscale](https://tailscale.com/):

1. Instale o Tailscale na máquina onde o `helena-ai` roda e no dispositivo/celular onde o app cliente será usado, e faça login na mesma conta/tailnet em ambos.
2. Anote o IP Tailscale (ou o [MagicDNS](https://tailscale.com/kb/1081/magicdns) name, ex. `minha-maquina.tailXXXX.ts.net`) da máquina que roda o backend — algo como `100.x.y.z`.
3. Aponte o app cliente para esse endereço em vez de `localhost`/`127.0.0.1`, ajustando `apiUrl`/`apiUrlNative` em [`src/environments/environment.ts`](src/environments/environment.ts) (ou `environment.prod.ts` para builds de produção), por exemplo:

   ```ts
   apiUrl: 'http://100.x.y.z:5000',
   apiUrlNative: 'http://100.x.y.z:5000',
   ```

4. Gere o build novamente (`npm run build` e, se for Android, `npx cap sync android`) para que a nova URL seja empacotada no app.

Com isso, o dispositivo consegue falar com o backend `helena-ai` através do túnel do Tailscale de qualquer lugar, sem precisar expor a porta 5000 diretamente na internet. Vale lembrar que essa configuração é só do lado do cliente — o `helena-ai` também precisa estar acessível/rodando na máquina com o Tailscale ativo (ver documentação do [repositório principal](https://github.com/wellington0dev/helena-ai.git)).

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
