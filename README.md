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

O app abre em `http://localhost:8100` e conversa com o backend através da URL configurada em [`src/environments/environment.ts`](src/environments/environment.ts).

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

Por padrão, um build nativo tenta falar com `127.0.0.1:5000` (a própria máquina do dispositivo), o que só funciona de fato via emulador/ADB reverse. Para testar em um dispositivo/emulador Android apontando para o backend rodando no seu PC, há duas opções:

- **ADB reverse** (mantém o app usando o endereço padrão `127.0.0.1`):

  ```bash
  adb reverse tcp:5000 tcp:5000
  ```

  Isso faz o app no dispositivo enxergar `127.0.0.1:5000` como se fosse o backend do próprio PC.

- **Apontar direto pro IP da máquina na LAN**, editando o endereço do servidor dentro do próprio app (ver seção seguinte) — sem precisar de ADB nem de rebuild.

## Configurando a URL do servidor (backend)

A URL do `helena-ai` **não é fixa no build**: ela é configurável em tempo de execução, direto pela interface do app, e fica salva no dispositivo (`localStorage`, via [`src/app/core/api-base.ts`](src/app/core/api-base.ts)). Não é necessário editar código nem recompilar para trocar de servidor.

Onde configurar:

- **Tela de login**: há um atalho para abrir "Endereço do servidor" e informar a URL do `helena-ai` antes mesmo de autenticar ([`login.page.ts`](src/app/pages/login/login.page.ts)).
- **Configurações → Servidor**: já autenticado, em [`/settings`](src/app/pages/settings/settings.page.ts) é possível ver e trocar a URL a qualquer momento; ao salvar, o app reconecta o socket e reaponta as notificações nativas automaticamente para o novo endereço.

Se o campo for deixado em branco, o app volta a usar o valor padrão de fábrica, que **é** definido em tempo de build:

- [`src/environments/environment.ts`](src/environments/environment.ts) — `apiUrl`/`apiUrlNative` usados em desenvolvimento (`ng serve`)
- [`src/environments/environment.prod.ts`](src/environments/environment.prod.ts) — usados no build de produção (`ng build`)

`apiUrl` é o padrão para a versão web e `apiUrlNative` para o app empacotado (Android). Editar esses arquivos só faz sentido se você quiser mudar o *padrão de fábrica* do app — o uso normal é configurar a URL direto na tela de login/configurações.

## Acessando a Helena fora da rede local (VPN)

Como o `helena-ai` roda na máquina pessoal do usuário, por padrão ele só é acessível quando o dispositivo está na mesma rede local (Wi-Fi/LAN). Para usar o app fora de casa (dados móveis, outra rede etc.), uma opção simples é criar uma VPN mesh com o [Tailscale](https://tailscale.com/):

1. Instale o Tailscale na máquina onde o `helena-ai` roda e no dispositivo/celular onde o app cliente será usado, e faça login na mesma conta/tailnet em ambos.
2. Anote o IP Tailscale (ou o [MagicDNS](https://tailscale.com/kb/1081/magicdns) name, ex. `minha-maquina.tailXXXX.ts.net`) da máquina que roda o backend — algo como `100.x.y.z`.
3. No app, abra a tela de login (ou Configurações → Servidor, se já estiver logado) e informe esse endereço, ex. `http://100.x.y.z:5000`. Não é preciso recompilar: a mudança é salva no dispositivo na hora.

Com isso, o dispositivo consegue falar com o backend `helena-ai` através do túnel do Tailscale de qualquer lugar, sem precisar expor a porta 5000 diretamente na internet. Vale lembrar que essa configuração é só do lado do cliente — o `helena-ai` também precisa estar acessível/rodando na máquina com o Tailscale ativo (ver documentação do [repositório principal](https://github.com/wellington0dev/helena-ai.git)).

## Páginas do app

O app é uma SPA Angular com rotas standalone ([`src/app/app.routes.ts`](src/app/app.routes.ts)), todas protegidas por `authGuard` exceto `/login`. A navegação entre elas é feita pelo menu lateral (`ion-menu`).

- **`/login`** — [`login.page.ts`](src/app/pages/login/login.page.ts): tela de entrada/cadastro (email e senha). Também é onde dá pra configurar a URL do servidor `helena-ai` antes de autenticar.
- **`/chat`** — [`chat.page.ts`](src/app/pages/chat/chat.page.ts): tela principal, o chat com a Helena. Envia texto, arquivos e áudio (gravação estilo WhatsApp), mostra o histórico da conversa e recebe respostas em tempo real via Socket.IO — inclusive feedback de progresso de jobs longos rodando em segundo plano e pedidos de confirmação quando a Helena quer executar um comando no PC (permitir/negar/sempre permitir).
- **`/comandos`** — [`comandos.component.ts`](src/app/pages/comandos/comandos.component.ts): biblioteca de comandos de shell salvos pelo usuário (criar, editar, apagar), para reaproveitar/pedir à Helena depois.
- **`/listas`** — [`listas.component.ts`](src/app/pages/listas/listas.component.ts): rotinas — sequências de passos (ex.: comandos de shell) que podem ser reordenados, editados e disparados como uma lista única.
- **`/atividade`** — [`atividade.component.ts`](src/app/pages/atividade/atividade.component.ts): log de auditoria das ações que a Helena executou na máquina (histórico com data/hora).
- **`/rede`** — [`rede.component.ts`](src/app/pages/rede/rede.component.ts): federação entre instâncias da Helena — parear com outra máquina/usuário (via QR/código), gerenciar nível de confiança de cada peer e trocar mensagens com eles em uma thread própria.
- **`/settings`** — [`settings.page.ts`](src/app/pages/settings/settings.page.ts): configurações da conta — endereço do servidor, nome do usuário, preferências de notificação (modo silencioso), navegador padrão para tarefas de navegação da Helena, comandos confiados (aprovados permanentemente), "modo pânico" (revoga todas as permissões da Helena na hora), reset de chat/contexto, limpeza de dados e logout.
- **`/profile`** — [`profile.page.ts`](src/app/pages/profile/profile.page.ts): visão geral da conversa — data de início do chat e galeria de imagens/arquivos trocados com a Helena.

## Testes

```bash
npm test
```

## Saiba mais

Este app é apenas a "porta de entrada" visual para a Helena. Para entender o agente em si — arquitetura, comandos, integrações e como rodá-lo — veja o repositório principal:

👉 **https://github.com/wellington0dev/helena-ai**
