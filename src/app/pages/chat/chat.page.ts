import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon, MenuController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  send, settingsOutline, add, close, mic, trash, sparkles, documentOutline,
  terminalOutline, menuOutline,
} from 'ionicons/icons';
import { App } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { Subscription } from 'rxjs';
import { ChatService } from '../../core/chat.service';
import { AuthService } from '../../core/auth.service';
import { SocketService } from '../../core/socket.service';
import { AudioRecorder } from '../../core/audio-recorder';
import { ChatMessage } from '../../core/models';
import { MessageMediaComponent } from '../../components/message-media/message-media.component';

type MediaPayload = { media_url: string; media_type: string; media_meta: any };

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, IonIcon, MessageMediaComponent],
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnDestroy {
  private chat = inject(ChatService);
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private recorder = inject(AudioRecorder);
  private router = inject(Router);
  private menu = inject(MenuController);
  private scroll = viewChild<ElementRef<HTMLElement>>('scroll');
  private ta = viewChild<ElementRef<HTMLTextAreaElement>>('ta');

  messages = signal<ChatMessage[]>([]);
  draft = '';
  loadingHistory = signal(true);
  thinking = signal(false);
  uploading = signal(false);
  pending = signal<File | null>(null);
  recording = signal(false);
  recSeconds = signal(0);
  private recTimer?: any;
  /** Feedback contínuo de um job iterativo em andamento (ao vivo, efêmero). */
  progress = signal<string[]>([]);

  loadError = signal(false);
  private jobSub?: Subscription;
  private msgSub?: Subscription;
  private progressSub?: Subscription;
  private progressTimer?: any;
  private resumeHandle?: PluginListenerHandle;

  constructor() {
    addIcons({
      send, settingsOutline, add, close, mic, trash, sparkles, documentOutline,
      terminalOutline, menuOutline,
    });
    // resultado de background job chegando em tempo real (app aberto)
    this.jobSub = this.socket.jobDone.subscribe((msg) => {
      this.clearProgress(); // a entrega chegou → some com o play-by-play
      this.appendUnique(msg);
      this.scrollDown();
    });
    // feedback contínuo do job iterativo ("já entendi X, seguindo...")
    this.progressSub = this.socket.jobProgress.subscribe((line) => {
      this.progress.update((ls) => [...ls, line]);
      // rede de segurança: se o job_done se perder (socket caiu numa pesquisa
      // longa), as bolhas efêmeras sumem sozinhas após um tempo sem novidade.
      this.armProgressTimeout();
      this.scrollDown();
    });
    // mensagens novas ao vivo (inclui respostas feitas pela notificação)
    this.msgSub = this.socket.newMessages.subscribe((msgs) => {
      this.clearProgress(); // chegou mensagem normal → o job já acabou
      msgs.forEach((m) => this.appendUnique(m));
      this.scrollDown();
    });
    // ao voltar pro app (ex.: depois de responder por uma notificação com o
    // app em background), recarrega o histórico para não ficar desatualizado.
    App.addListener('resume', () => this.load()).then((h) => (this.resumeHandle = h));
  }

  // recarrega ao entrar na view (inclui voltar de /settings após uma ação
  // destrutiva) — a página fica em cache no IonRouterOutlet e o construtor
  // não roda de novo.
  ionViewWillEnter() {
    this.socket.connect();
    this.load();
  }

  ngOnDestroy() {
    this.jobSub?.unsubscribe();
    this.msgSub?.unsubscribe();
    this.progressSub?.unsubscribe();
    if (this.progressTimer) clearTimeout(this.progressTimer);
    this.resumeHandle?.remove();
  }

  /** Anexa uma mensagem só se o id ainda não estiver na lista (dedupe). */
  private appendUnique(msg: ChatMessage) {
    this.messages.update((ms) => (ms.some((m) => m.id === msg.id) ? ms : [...ms, msg]));
  }

  /** Decide sobre um comando de shell que a Helena pediu para rodar. */
  async decide(m: ChatMessage, decision: 'allow' | 'deny' | 'always') {
    const cmdId = m.media_meta?.['cmd_id'];
    if (!cmdId || (m.media_meta?.['status'] ?? 'pending') !== 'pending') return;
    // otimista: marca como decidido (some com os botões na hora)
    const status = decision === 'deny' ? 'denied' : 'allowed';
    this.messages.update((ms) =>
      ms.map((x) => (x.id === m.id ? { ...x, media_meta: { ...x.media_meta, status } } : x)),
    );
    this.thinking.set(true);
    try {
      const res = await this.chat.decideCommand(cmdId, decision);
      res.messages.forEach((msg) => this.appendUnique(msg));
    } catch {
      this.messages.update((ms) => [...ms, this.errorBubble('Não consegui enviar a decisão.')]);
    } finally {
      this.thinking.set(false);
      this.scrollDown();
    }
  }

  openSettings() {
    this.router.navigateByUrl('/settings');
  }

  openMenu() {
    this.menu.open('main');
  }

  openProfile() {
    this.router.navigateByUrl('/profile');
  }

  retry() {
    this.loadingHistory.set(true);
    this.load();
  }

  onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pending.set(file);
    input.value = ''; // permite re-selecionar o mesmo arquivo
  }

  clearAttach() {
    this.pending.set(null);
  }

  /** Limpa o feedback de progresso efêmero e o timer de segurança. */
  private clearProgress() {
    if (this.progressTimer) { clearTimeout(this.progressTimer); this.progressTimer = undefined; }
    this.progress.set([]);
  }

  /** (Re)arma o timeout de segurança: se o job_done se perder (socket caiu numa
   *  pesquisa longa), recarrega o histórico — descarta as bolhas E traz o
   *  resultado já persistido do job. */
  private armProgressTimeout() {
    if (this.progressTimer) clearTimeout(this.progressTimer);
    this.progressTimer = setTimeout(() => this.load(), 90000);
  }

  private async load() {
    this.loadError.set(false);
    // ao (re)carregar o histórico, o resultado do job já está persistido —
    // descarta as bolhas de progresso efêmeras (evita que fiquem órfãs se o
    // job_done tiver se perdido com o socket caindo).
    this.clearProgress();
    try {
      this.messages.set(await this.chat.history());
    } catch (e: any) {
      // 401 já é tratado pelo interceptor (redireciona ao login). Outros erros:
      // sinaliza em vez de mostrar um chat vazio silencioso.
      if (e?.status !== 401) this.loadError.set(true);
    } finally {
      this.loadingHistory.set(false);
      this.scrollDown();
    }
  }

  onEnter(ev: Event) {
    const ke = ev as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.send();
    }
  }

  /** Auto-grow do textarea conforme o conteúdo (até um teto). */
  autoGrow() {
    const el = this.ta()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 132) + 'px';
  }

  /** Recolhe o textarea ao tamanho de 1 linha, esperando o ngModel esvaziar
   *  o valor no DOM (senão o scrollHeight ainda reflete o texto antigo). */
  private resetComposerHeight() {
    setTimeout(() => this.autoGrow(), 0);
  }

  async send() {
    const text = this.draft.trim();
    const file = this.pending();
    if ((!text && !file) || this.thinking() || this.uploading()) return;
    this.draft = '';
    this.resetComposerHeight();

    let media: MediaPayload | undefined;
    if (file) {
      media = await this.uploadFile(file);
      if (!media) return; // erro já sinalizado
      this.pending.set(null);
    }
    await this.dispatch(text, media);
  }

  /** Faz upload de um File e devolve o payload de mídia (ou undefined em erro). */
  private async uploadFile(file: File): Promise<MediaPayload | undefined> {
    this.uploading.set(true);
    try {
      return await this.chat.upload(file);
    } catch {
      this.messages.update((ms) => [...ms, this.errorBubble('Falha ao enviar o arquivo.')]);
      return undefined;
    } finally {
      this.uploading.set(false);
    }
  }

  /** Mostra a mensagem otimista, envia ao agente e anexa as respostas. */
  private async dispatch(text: string, media?: MediaPayload) {
    const optimistic: ChatMessage = {
      id: Date.now(), role: 'user', content: text,
      media_url: media?.media_url ?? null,
      media_type: (media?.media_type as any) ?? null,
      media_meta: media?.media_meta ?? null,
      tool_name: null, created_at: new Date().toISOString(),
    };
    this.messages.update((ms) => [...ms, optimistic]);
    this.thinking.set(true);
    this.scrollDown();

    try {
      const res = await this.chat.send(text, media);
      this.messages.update((ms) => {
        const without = ms.filter((m) => m.id !== optimistic.id);
        return [...without, res.message, ...res.replies];
      });
    } catch {
      this.messages.update((ms) => [
        ...ms,
        this.errorBubble('(Ops, não consegui responder agora. Tenta de novo?)'),
      ]);
    } finally {
      this.thinking.set(false);
      this.scrollDown();
    }
  }

  // --- Gravação de áudio (voz estilo WhatsApp) --- //

  async startRecording() {
    if (this.thinking() || this.uploading()) return;
    const ok = await this.recorder.start();
    if (!ok) {
      this.messages.update((ms) => [...ms, this.errorBubble('Não consegui acessar o microfone.')]);
      return;
    }
    this.recSeconds.set(0);
    this.recording.set(true);
    this.recTimer = setInterval(() => this.recSeconds.update((s) => s + 1), 1000);
  }

  async cancelRecording() {
    this.stopTimer();
    this.recording.set(false);
    await this.recorder.cancel();
  }

  async stopAndSend() {
    this.stopTimer();
    this.recording.set(false);
    this.uploading.set(true);
    const rec = await this.recorder.stop();
    if (!rec) {
      this.uploading.set(false);
      return;
    }
    const media = await this.uploadFile(rec.file);
    if (!media) return;
    media.media_meta = { ...(media.media_meta || {}), duration: rec.durationSec };
    await this.dispatch('', media);
  }

  recTimeLabel(): string {
    const s = this.recSeconds();
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }

  private stopTimer() {
    if (this.recTimer) { clearInterval(this.recTimer); this.recTimer = undefined; }
  }

  private errorBubble(text: string): ChatMessage {
    return {
      id: Date.now() + Math.random(), role: 'assistant', content: text,
      media_url: null, media_type: null, media_meta: null,
      tool_name: null, created_at: new Date().toISOString(),
    };
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.scroll()?.nativeElement;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 60);
  }
}
