import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon, AlertController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trashOutline, refreshOutline, warningOutline, logOutOutline, serverOutline,
  personOutline, atOutline, chevronForwardOutline, moonOutline, terminalOutline,
  globeOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { AccountService, BrowserInfo } from '../../core/account.service';
import { ChatService } from '../../core/chat.service';
import { SocketService } from '../../core/socket.service';
import { HelenaNotifications } from '../../core/helena-notifications';
import { getApiBase, setApiBase, getDefaultApiBase } from '../../core/api-base';
import { TopbarComponent } from '../../ui/topbar/topbar.component';
import { ToggleComponent } from '../../ui/toggle/toggle.component';
import { FieldComponent } from '../../ui/field/field.component';
import { ThemeToggleComponent } from '../../ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule, IonIcon, TopbarComponent, ToggleComponent, FieldComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage {
  auth = inject(AuthService);
  private account = inject(AccountService);
  private chat = inject(ChatService);
  private socket = inject(SocketService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  quietEnabled = false;
  quietStart = '22:00';
  quietEnd = '08:00';
  /** Comandos que o usuário confiou ("permitir sempre"). */
  trustedCommands = signal<{ id: number; command: string; created_at: string }[]>([]);
  /** Navegadores instalados nesta máquina, pra tarefas de navegação da Helena. */
  installedBrowsers = signal<BrowserInfo[]>([]);
  defaultBrowserId = signal<string | null>(null);

  constructor() {
    addIcons({
      trashOutline, refreshOutline, warningOutline, logOutOutline, serverOutline,
      personOutline, atOutline, chevronForwardOutline, moonOutline, terminalOutline,
      globeOutline,
    });
    this.loadPrefs();
    this.loadTrusted();
    this.loadBrowsers();
  }

  private async loadBrowsers() {
    try {
      const { installed, default: def } = await this.account.listBrowsers();
      this.installedBrowsers.set(installed);
      this.defaultBrowserId.set(def);
    } catch {
      /* silencioso — seção só não aparece */
    }
  }

  defaultBrowserLabel(): string {
    const id = this.defaultBrowserId();
    const found = this.installedBrowsers().find((b) => b.id === id);
    return found?.label ?? 'automático (1º detectado)';
  }

  async editDefaultBrowser() {
    const browsers = this.installedBrowsers();
    if (!browsers.length) {
      await this.toast('Nenhum navegador foi encontrado nesta máquina.');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Navegador padrão',
      message: 'A Helena usa esse navegador quando precisa navegar na web por você.',
      inputs: [
        { type: 'radio', label: 'Automático (1º detectado)', value: null, checked: this.defaultBrowserId() === null },
        ...browsers.map((b) => ({
          type: 'radio' as const,
          label: b.label,
          value: b.id,
          checked: this.defaultBrowserId() === b.id,
        })),
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: async (browserId: string | null) => {
            try {
              const { default: def } = await this.account.setDefaultBrowser(browserId);
              this.defaultBrowserId.set(def);
              await this.toast('Navegador padrão atualizado.');
            } catch {
              await this.toast('Não consegui salvar agora.');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async loadTrusted() {
    try {
      this.trustedCommands.set(await this.chat.listApprovals());
    } catch {
      /* silencioso — seção só não aparece */
    }
  }

  async revokeTrusted(id: number) {
    const ok = await this.confirm(
      'Revogar comando confiável',
      'A Helena vai voltar a pedir permissão para este comando. Continuar?',
      'Revogar',
    );
    if (!ok) return;
    try {
      await this.chat.revokeApproval(id);
      this.trustedCommands.update((cs) => cs.filter((c) => c.id !== id));
      await this.toast('Comando revogado.');
    } catch {
      await this.toast('Não consegui revogar agora.');
    }
  }

  serverUrl(): string {
    return getApiBase();
  }

  async editServerUrl() {
    const alert = await this.alertCtrl.create({
      header: 'Endereço do servidor',
      message: `URL onde a IA está rodando (ex.: http://192.168.0.10:5000). Deixe vazio para usar o padrão (${getDefaultApiBase()}).`,
      inputs: [{ name: 'url', type: 'url', value: getApiBase(), placeholder: 'http://IP:5000' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: async (data) => {
            const url = (data.url || '').trim();
            if (url && !/^https?:\/\//i.test(url)) {
              await this.toast('URL inválida — precisa começar com http:// ou https://');
              return false;
            }
            setApiBase(url);
            // reaponta o nativo (receiver/worker) e o socket para o novo servidor
            HelenaNotifications.setAuth({
              baseUrl: getApiBase(),
              token: this.auth.token ?? '',
              userId: String(this.auth.user()?.id ?? ''),
            }).catch(() => {});
            this.socket.disconnect();
            this.socket.connect();
            await this.toast('Servidor atualizado. Se algo não carregar, saia e entre de novo.');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async loadPrefs() {
    try {
      const { user } = await this.account.me();
      const p = (user as any).notif_prefs || {};
      this.quietEnabled = !!p.quiet_enabled;
      if (p.quiet_start) this.quietStart = p.quiet_start;
      if (p.quiet_end) this.quietEnd = p.quiet_end;
    } catch {
      /* interceptor trata 401 */
    }
  }

  async savePrefs() {
    try {
      await this.account.updateNotifPrefs({
        quiet_enabled: this.quietEnabled,
        quiet_start: this.quietStart,
        quiet_end: this.quietEnd,
      });
    } catch { /* silencioso */ }
  }

  private async toast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, position: 'top' });
    await t.present();
  }

  private async confirm(header: string, message: string, confirmText: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const a = await this.alertCtrl.create({
        header, message,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: confirmText, role: 'destructive', handler: () => resolve(true) },
        ],
      });
      await a.present();
    });
  }

  async confirmResetChat() {
    if (await this.confirm('Recomeçar chat', 'Apagar todas as mensagens? A Helena mantém o que aprendeu.', 'Recomeçar')) {
      await this.account.resetChat();
      await this.toast('Chat recomeçado.');
      this.router.navigateByUrl('/chat');
    }
  }

  async confirmResetContext() {
    if (await this.confirm('Apagar chat + contexto', 'Apagar mensagens, memória e perfil? A agenda é mantida.', 'Apagar')) {
      await this.account.resetContext();
      await this.toast('Chat e contexto apagados.');
      this.router.navigateByUrl('/chat');
    }
  }

  async confirmWipe() {
    const a = await this.alertCtrl.create({
      header: 'Limpar dados da conta',
      message: 'Isso apaga TUDO, inclusive arquivos. Escolha:',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Só esvaziar', role: 'destructive',
          handler: async () => {
            await this.account.wipe(false);
            await this.toast('Dados limpos.');
            this.router.navigateByUrl('/chat');
          },
        },
        {
          text: 'Excluir conta', role: 'destructive',
          handler: async () => {
            await this.account.wipe(true);
            this.socket.disconnect();
            HelenaNotifications.clearAuth().catch(() => {});
            this.auth.logout();
            this.router.navigateByUrl('/login');
          },
        },
      ],
    });
    await a.present();
  }

  /** Kill switch: revoga todas as permissões da Helena. */
  async confirmPanic() {
    const ok = await this.confirm(
      'Modo pânico 🛑',
      'Revoga TODAS as permissões da Helena (ela para de mexer na máquina na hora) e nega comandos pendentes. Você reativa depois pelo CLI. Continuar?',
      'Revogar tudo',
    );
    if (!ok) return;
    try {
      await this.account.panic();
      await this.toast('Permissões revogadas. A Helena não controla mais a máquina.');
    } catch {
      await this.toast('Não consegui aplicar agora.');
    }
  }

  async editName() {
    const alert = await this.alertCtrl.create({
      header: 'Seu nome',
      message: 'Como você quer que a Helena te chame?',
      inputs: [{ name: 'name', type: 'text', value: this.auth.user()?.name ?? '', placeholder: 'seu nome' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: async (data) => {
            const name = (data.name || '').trim();
            if (!name) return;
            try {
              await this.account.updateName(name);
              this.auth.setName(name);
              await this.toast('Nome atualizado.');
            } catch { /* interceptor trata 401 */ }
          },
        },
      ],
    });
    await alert.present();
  }

  logout() {
    this.socket.disconnect();
    HelenaNotifications.clearAuth().catch(() => {}); // limpa JWT nativo
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
