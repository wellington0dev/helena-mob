import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon, MenuController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menuOutline, add, createOutline, trashOutline, terminalOutline, close } from 'ionicons/icons';
import { Library, SavedCommand } from '../../core/library';

@Component({
  selector: 'app-comandos',
  standalone: true,
  imports: [FormsModule, IonIcon],
  templateUrl: './comandos.component.html',
  styleUrls: ['./comandos.component.scss'],
})
export class ComandosComponent {
  private lib = inject(Library);
  private menu = inject(MenuController);

  items = signal<SavedCommand[]>([]);
  loading = signal(true);
  editing = signal<Partial<SavedCommand> | null>(null); // null = form fechado
  saving = signal(false);

  constructor() {
    addIcons({ menuOutline, add, createOutline, trashOutline, terminalOutline, close });
  }

  ionViewWillEnter() {
    this.load();
  }

  openMenu() { this.menu.open('main'); }

  private async load() {
    this.loading.set(true);
    try { this.items.set(await this.lib.commands()); } catch { /* ignora */ }
    finally { this.loading.set(false); }
  }

  novo() { this.editing.set({ name: '', description: '', command: '' }); }
  editar(c: SavedCommand) { this.editing.set({ ...c }); }
  cancelar() { this.editing.set(null); }

  async salvar() {
    const e = this.editing();
    if (!e || !e.name?.trim() || !e.command?.trim()) return;
    this.saving.set(true);
    try {
      const data = { name: e.name.trim(), description: e.description ?? '', command: e.command.trim() };
      if (e.id) await this.lib.updateCommand(e.id, data);
      else await this.lib.createCommand(data);
      this.editing.set(null);
      await this.load();
    } catch { /* mantém o form aberto */ }
    finally { this.saving.set(false); }
  }

  async apagar(c: SavedCommand) {
    await this.lib.deleteCommand(c.id);
    this.items.update((xs) => xs.filter((x) => x.id !== c.id));
  }
}
