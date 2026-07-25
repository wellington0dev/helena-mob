import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sparkles } from 'ionicons/icons';
import { AuthService } from '../../core/auth.service';
import { getApiBase, setApiBase, getDefaultApiBase } from '../../core/api-base';
import { FieldComponent } from '../../ui/field/field.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { ThemeToggleComponent } from '../../ui/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IonIcon, FieldComponent, ButtonComponent, ThemeToggleComponent],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  username = '';
  password = '';
  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    addIcons({ sparkles });
  }

  // a página fica em cache no IonRouterOutlet; ao voltar (ex.: após logout)
  // reseta para o modo login em vez de manter "registrar" da sessão anterior.
  ionViewWillEnter() {
    this.mode.set('login');
    this.password = '';
    this.error.set(null);
  }

  toggle() {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.error.set(null);
  }

  async submit() {
    const username = this.username.trim().toLowerCase();
    if (!username || !this.password) {
      this.error.set('Preencha usuário e senha.');
      return;
    }
    if (this.mode() === 'register' && !/^[a-z0-9._-]{3,40}$/.test(username)) {
      this.error.set('Usuário: 3 a 40 caracteres — letras minúsculas, números, ponto, hífen ou underscore.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      if (this.mode() === 'login') {
        await this.auth.login(username, this.password);
      } else {
        await this.auth.register(username, this.password);
      }
      await this.router.navigateByUrl('/chat');
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Falha ao autenticar. Tente de novo.');
    } finally {
      this.loading.set(false);
    }
  }

  async editServerUrl() {
    const alert = await this.alertCtrl.create({
      header: 'Endereço do servidor',
      message: `URL onde a Helena está rodando. Vazio = padrão (${getDefaultApiBase()}).`,
      inputs: [{ name: 'url', type: 'url', value: getApiBase(), placeholder: 'http://IP:5000' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: (data) => {
            const url = (data.url || '').trim();
            if (url && !/^https?:\/\//i.test(url)) {
              this.error.set('URL do servidor inválida.');
              return false;
            }
            setApiBase(url);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }
}
