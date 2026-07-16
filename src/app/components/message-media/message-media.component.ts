import {
  Component, ElementRef, Input, OnDestroy, OnInit, inject, signal, viewChild,
} from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  playOutline, pauseOutline, documentOutline, documentTextOutline,
  downloadOutline, expandOutline, shareOutline,
} from 'ionicons/icons';
import { ChatService } from '../../core/chat.service';
import { Lightbox } from '../../core/lightbox';
import { TextViewer } from '../../core/text-viewer';
import { FileShare } from '../../core/file-share';
import { ChatMessage } from '../../core/models';

/** Renderiza a mídia de uma mensagem, buscando o blob autenticado (JWT) e
 *  liberando o object URL ao destruir (evita vazamento de memória). */
@Component({
  selector: 'app-message-media',
  standalone: true,
  imports: [IonIcon, IonSpinner],
  templateUrl: './message-media.component.html',
  styleUrls: ['./message-media.component.scss'],
})
export class MessageMediaComponent implements OnInit, OnDestroy {
  @Input({ required: true }) message!: ChatMessage;
  private chat = inject(ChatService);
  private lightbox = inject(Lightbox);
  private textViewer = inject(TextViewer);
  private fileShare = inject(FileShare);
  private audioEl = viewChild<ElementRef<HTMLAudioElement>>('audio');
  private blob: Blob | null = null;

  url = signal<string | null>(null);
  loading = signal(true);
  playing = signal(false);
  progress = signal(0);
  private cur = signal(0);
  private dur = signal(0);

  constructor() {
    // registra os ícones (na WebView nativa o Ionicons não busca da rede)
    addIcons({
      playOutline, pauseOutline, documentOutline, documentTextOutline,
      downloadOutline, expandOutline, shareOutline,
    });
  }

  async ngOnInit() {
    if (this.message.media_meta?.['duration']) {
      this.dur.set(this.message.media_meta['duration']);
    }
    if (!this.message.media_url) {
      this.loading.set(false);
      return;
    }
    try {
      this.blob = await this.chat.mediaBlob(this.message.media_url);
      this.url.set(URL.createObjectURL(this.blob));
    } catch {
      this.url.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    const u = this.url();
    if (u) URL.revokeObjectURL(u);
  }

  fileName(): string {
    return this.message.media_meta?.['original_name'] ?? 'arquivo';
  }

  /** Nome sugerido ao baixar uma imagem (usa o original, senão gera pela msg). */
  imageName(): string {
    const orig = this.message.media_meta?.['original_name'];
    if (orig) return orig;
    const mime: string = this.message.media_meta?.['mime'] ?? 'image/png';
    const ext = mime.split('/')[1] || 'png';
    return `helena-${this.message.id}.${ext}`;
  }

  /** É um arquivo de texto puro (abre no leitor interno em vez de app externo)? */
  isText(): boolean {
    if (this.message.media_type !== 'document') return false;
    const mime: string = this.message.media_meta?.['mime'] ?? '';
    return mime === 'text/plain' || this.fileName().toLowerCase().endsWith('.txt');
  }

  /** Abre o conteúdo do .txt no leitor em tela cheia (dentro do app). */
  async viewText() {
    if (!this.blob) return;
    this.textViewer.open(await this.blob.text(), this.fileName());
  }

  /** Baixar / compartilhar o arquivo (folha nativa no Android, <a> na web). */
  download() {
    if (this.blob) this.fileShare.download(this.blob, this.fileName());
  }

  // --- Visualização de imagem em tela cheia (overlay na raiz do app) --- //

  openFull() {
    const u = this.url();
    if (this.message.media_type === 'image' && u) this.lightbox.open(u, this.imageName());
  }

  toggle() {
    const el = this.audioEl()?.nativeElement;
    if (!el) return;
    if (el.paused) { el.play(); this.playing.set(true); }
    else { el.pause(); this.playing.set(false); }
  }

  onMeta() {
    const el = this.audioEl()?.nativeElement;
    if (el && isFinite(el.duration)) this.dur.set(el.duration);
  }

  onTime() {
    const el = this.audioEl()?.nativeElement;
    if (!el) return;
    this.cur.set(el.currentTime);
    this.progress.set(this.dur() ? (el.currentTime / this.dur()) * 100 : 0);
  }

  onEnded() {
    this.playing.set(false);
    this.progress.set(0);
    this.cur.set(0);
  }

  seek(ev: MouseEvent) {
    const el = this.audioEl()?.nativeElement;
    const bar = ev.currentTarget as HTMLElement;
    if (!el || !this.dur()) return;
    const ratio = ev.offsetX / bar.clientWidth;
    el.currentTime = ratio * this.dur();
  }

  timeLabel(): string {
    const secs = Math.floor(this.playing() || this.cur() ? this.cur() : this.dur());
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
