import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon, MenuController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline, add, createOutline, trashOutline, listOutline, close, arrowUp, arrowDown,
} from 'ionicons/icons';
import { Library, Routine, RoutineStep } from '../../core/library';

type Draft = { id?: number; name: string; description: string; steps: RoutineStep[] };

@Component({
  selector: 'app-listas',
  standalone: true,
  imports: [FormsModule, IonIcon],
  templateUrl: './listas.component.html',
  styleUrls: ['./listas.component.scss'],
})
export class ListasComponent {
  private lib = inject(Library);
  private menu = inject(MenuController);

  items = signal<Routine[]>([]);
  loading = signal(true);
  editing = signal<Draft | null>(null);
  saving = signal(false);

  constructor() {
    addIcons({ menuOutline, add, createOutline, trashOutline, listOutline, close, arrowUp, arrowDown });
  }

  ionViewWillEnter() { this.load(); }
  openMenu() { this.menu.open('main'); }

  private async load() {
    this.loading.set(true);
    try { this.items.set(await this.lib.routines()); } catch { /* ignora */ }
    finally { this.loading.set(false); }
  }

  novo() { this.editing.set({ name: '', description: '', steps: [{ kind: 'shell', value: '' }] }); }
  editar(r: Routine) {
    this.editing.set({ id: r.id, name: r.name, description: r.description ?? '', steps: r.steps.map((s) => ({ ...s })) });
  }
  cancelar() { this.editing.set(null); }

  addStep() { this.editing.update((e) => e && ({ ...e, steps: [...e.steps, { kind: 'shell', value: '' }] })); }
  removeStep(i: number) { this.editing.update((e) => e && ({ ...e, steps: e.steps.filter((_, j) => j !== i) })); }
  move(i: number, dir: -1 | 1) {
    this.editing.update((e) => {
      if (!e) return e;
      const s = [...e.steps];
      const j = i + dir;
      if (j < 0 || j >= s.length) return e;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...e, steps: s };
    });
  }

  async salvar() {
    const e = this.editing();
    if (!e || !e.name.trim()) return;
    const steps = e.steps.filter((s) => s.value.trim()).map((s) => ({ kind: s.kind, value: s.value.trim() }));
    if (!steps.length) return;
    this.saving.set(true);
    try {
      const data = { name: e.name.trim(), description: e.description, steps };
      if (e.id) await this.lib.updateRoutine(e.id, data);
      else await this.lib.createRoutine(data);
      this.editing.set(null);
      await this.load();
    } catch { /* mantém aberto */ }
    finally { this.saving.set(false); }
  }

  async apagar(r: Routine) {
    await this.lib.deleteRoutine(r.id);
    this.items.update((xs) => xs.filter((x) => x.id !== r.id));
  }

  resumo(r: Routine): string {
    return r.steps.map((s) => s.value).join(' · ');
  }
}
