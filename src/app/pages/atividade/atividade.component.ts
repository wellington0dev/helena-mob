import { Component, inject, signal } from '@angular/core';
import { IonIcon, MenuController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menuOutline, terminalOutline, desktopOutline, refreshOutline } from 'ionicons/icons';
import { AccountService, AuditEntry } from '../../core/account.service';

@Component({
  selector: 'app-atividade',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './atividade.component.html',
  styleUrls: ['./atividade.component.scss'],
})
export class AtividadeComponent {
  private account = inject(AccountService);
  private menu = inject(MenuController);

  items = signal<AuditEntry[]>([]);
  loading = signal(true);

  constructor() {
    addIcons({ menuOutline, terminalOutline, desktopOutline, refreshOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  openMenu() {
    this.menu.open('main');
  }

  async load() {
    this.loading.set(true);
    try {
      this.items.set((await this.account.audit()).entries);
    } catch {
      /* ignora */
    } finally {
      this.loading.set(false);
    }
  }

  when(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }
}
