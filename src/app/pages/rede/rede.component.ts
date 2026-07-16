import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, MenuController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline, add, close, globeOutline, qrCodeOutline, keyOutline,
  createOutline, trashOutline, sendOutline, chevronBackOutline, checkmarkCircle,
  helpCircleOutline, closeCircleOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { Federation, FederationSettings, Peer, PeerMessage, TrustLevel } from '../../core/federation';
import { SocketService } from '../../core/socket.service';

const TRUST_LABEL: Record<TrustLevel, string> = {
  confiavel: 'Confiável',
  nao_confiavel: 'Não confiável',
  a_averiguar: 'A averiguar',
};

@Component({
  selector: 'app-rede',
  standalone: true,
  imports: [FormsModule, IonIcon, DatePipe, SlicePipe],
  templateUrl: './rede.component.html',
  styleUrls: ['./rede.component.scss'],
})
export class RedeComponent implements OnDestroy {
  private fed = inject(Federation);
  private menu = inject(MenuController);
  private toastCtrl = inject(ToastController);
  private socket = inject(SocketService);

  peers = signal<Peer[]>([]);
  loading = signal(true);
  settings = signal<FederationSettings | null>(null);

  /** null = fechado; 'choose' = escolhendo entre gerar/inserir; 'generate'/'join' = form aberto. */
  addMode = signal<'choose' | 'generate' | 'join' | null>(null);
  generatedCode = signal<{ code: string; expires_at: string } | null>(null);
  generating = signal(false);
  joinCode = '';
  joinUrl = '';
  joining = signal(false);

  editingPeer = signal<Peer | null>(null);
  editLabel = '';
  editTrust: TrustLevel = 'a_averiguar';
  editAiDialogue = false;
  editAiCanInitiate = false;

  activePeer = signal<Peer | null>(null);
  threadMessages = signal<PeerMessage[]>([]);
  loadingThread = signal(false);
  newMessageText = '';
  sendingMessage = signal(false);
  replyingTo = signal<PeerMessage | null>(null);

  trustLabel = TRUST_LABEL;

  private peerMsgSub?: Subscription;
  private peerPairedSub?: Subscription;

  constructor() {
    addIcons({
      menuOutline, add, close, globeOutline, qrCodeOutline, keyOutline,
      createOutline, trashOutline, sendOutline, chevronBackOutline, checkmarkCircle,
      helpCircleOutline, closeCircleOutline,
    });

    this.peerMsgSub = this.socket.peerMessage.subscribe((msg) => {
      if (this.activePeer()?.id === msg.peer_id) {
        this.threadMessages.update((ms) => [...ms, msg]);
      }
    });
    this.peerPairedSub = this.socket.peerPaired.subscribe(() => {
      this.loadPeers();
    });
  }

  ionViewWillEnter() {
    this.socket.connect();
    this.loadPeers();
    this.loadSettings();
  }

  ngOnDestroy() {
    this.peerMsgSub?.unsubscribe();
    this.peerPairedSub?.unsubscribe();
  }

  openMenu() { this.menu.open('main'); }

  toggleAdd() { this.addMode.set(this.addMode() === null ? 'choose' : null); this.generatedCode.set(null); }

  private async loadPeers() {
    this.loading.set(true);
    try { this.peers.set(await this.fed.peers()); } catch { /* ignora */ }
    finally { this.loading.set(false); }
  }

  private async loadSettings() {
    try { this.settings.set(await this.fed.settings()); } catch { /* ignora */ }
  }

  async resume() {
    try {
      await this.fed.resume();
      await this.loadSettings();
      await this.toast('Federação reativada.');
    } catch { await this.toast('Não consegui reativar agora.'); }
  }

  // ---- pareamento ----

  async startGenerate() {
    this.addMode.set('generate');
    this.generatedCode.set(null);
    this.generating.set(true);
    try {
      this.generatedCode.set(await this.fed.generateCode());
    } catch {
      await this.toast('Não consegui gerar o código agora.');
      this.addMode.set(null);
    } finally {
      this.generating.set(false);
    }
  }

  startJoin() {
    this.addMode.set('join');
    this.joinCode = '';
    this.joinUrl = '';
  }

  cancelAdd() {
    this.addMode.set(null);
    this.generatedCode.set(null);
  }

  async submitJoin() {
    const code = this.joinCode.trim();
    const url = this.joinUrl.trim();
    if (!code || !url) return;
    this.joining.set(true);
    try {
      await this.fed.join(code, url);
      this.addMode.set(null);
      await this.loadPeers();
      await this.toast('Pareado com sucesso.');
    } catch (e: any) {
      await this.toast(e?.error?.error || 'Código ou URL inválidos.');
    } finally {
      this.joining.set(false);
    }
  }

  // ---- editar peer (nome / confiança) ----

  editPeer(p: Peer) {
    this.editingPeer.set(p);
    this.editLabel = p.label;
    this.editTrust = p.trust_level;
    this.editAiDialogue = p.ai_dialogue_enabled;
    this.editAiCanInitiate = p.ai_can_initiate;
  }

  cancelEdit() { this.editingPeer.set(null); }

  async saveEdit() {
    const p = this.editingPeer();
    if (!p) return;
    try {
      const { peer } = await this.fed.updatePeer(p.id, {
        label: this.editLabel.trim() || p.label,
        trust_level: this.editTrust,
        ai_dialogue_enabled: this.editTrust === 'nao_confiavel' ? false : this.editAiDialogue,
        ai_can_initiate: this.editTrust !== 'confiavel' ? false : this.editAiCanInitiate,
      });
      this.peers.update((ps) => ps.map((x) => (x.id === peer.id ? peer : x)));
      this.editingPeer.set(null);
    } catch { await this.toast('Não consegui salvar agora.'); }
  }

  async removePeer(p: Peer) {
    try {
      await this.fed.deletePeer(p.id);
      this.peers.update((ps) => ps.filter((x) => x.id !== p.id));
      if (this.activePeer()?.id === p.id) this.activePeer.set(null);
    } catch { await this.toast('Não consegui remover agora.'); }
  }

  // ---- thread de mensagens ----

  async openThread(p: Peer) {
    this.activePeer.set(p);
    this.threadMessages.set([]);
    this.replyingTo.set(null);
    this.loadingThread.set(true);
    try { this.threadMessages.set(await this.fed.messages(p.id)); }
    catch { /* ignora */ }
    finally { this.loadingThread.set(false); }
  }

  closeThread() { this.activePeer.set(null); this.replyingTo.set(null); }

  replyTo(m: PeerMessage) { this.replyingTo.set(m); }
  cancelReply() { this.replyingTo.set(null); }

  async sendMessage() {
    const p = this.activePeer();
    const body = this.newMessageText.trim();
    if (!p || !body) return;
    this.sendingMessage.set(true);
    try {
      const replyId = this.replyingTo()?.id;
      const { message } = await this.fed.sendMessage(p.id, body, replyId);
      this.threadMessages.update((ms) => [...ms, message]);
      this.newMessageText = '';
      this.replyingTo.set(null);
    } catch {
      await this.toast('Não consegui entregar a mensagem.');
    } finally {
      this.sendingMessage.set(false);
    }
  }

  private async toast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2500, position: 'top' });
    await t.present();
  }
}
