import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AuthService } from './core/auth.service';
import { NotificationSync } from './core/notification-sync';
import { HelenaNotifications } from './core/helena-notifications';
import { getApiBase } from './core/api-base';
import { Theme } from './core/theme';
import { LightboxComponent } from './components/lightbox/lightbox.component';
import { TextViewerComponent } from './components/text-viewer/text-viewer.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  template:
    '<ion-app><ion-split-pane contentId="main" when="lg">' +
    '@if (auth.isLoggedIn()) { <app-sidebar></app-sidebar> }' +
    '<ion-router-outlet id="main"></ion-router-outlet>' +
    '</ion-split-pane><app-lightbox></app-lightbox><app-text-viewer></app-text-viewer></ion-app>',
  imports: [IonApp, IonRouterOutlet, IonSplitPane, LightboxComponent, TextViewerComponent, SidebarComponent],
})
export class AppComponent {
  protected auth = inject(AuthService);
  private notif = inject(NotificationSync);
  private theme = inject(Theme); // inicializa o tema (aplica data-theme + status bar)

  constructor() {
    if (Capacitor.isNativePlatform()) {
      this.initNative();
    }
  }

  private async initNative() {
    await this.notif.requestPermissions();
    this.syncIfLoggedIn();
    // re-sincroniza ao voltar pro app (pega novas notificações da fila)
    App.addListener('resume', () => this.syncIfLoggedIn());
  }

  private async syncIfLoggedIn() {
    if (!this.auth.isLoggedIn()) return;
    // injeta as credenciais no nativo p/ o BroadcastReceiver responder (Nível B)
    try {
      await HelenaNotifications.setAuth({
        baseUrl: getApiBase(),
        token: this.auth.token!,
        userId: String(this.auth.user()?.id ?? ''),
      });
    } catch {
      /* plugin indisponível / sem token */
    }
    try {
      await this.notif.sync();
    } catch {
      /* 401 é tratado pelo interceptor; outros erros são silenciosos */
    }
  }
}
