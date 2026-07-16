import { Injectable, signal } from '@angular/core';

/** Estado global do leitor de texto em tela cheia. Fica na raiz do app (mesmo
 *  motivo do Lightbox: escapar de transform/contain das bolhas p/ o overlay
 *  `position: fixed` cobrir a viewport inteira). */
@Injectable({ providedIn: 'root' })
export class TextViewer {
  readonly text = signal<string | null>(null);
  readonly name = signal<string>('arquivo');

  open(text: string, name: string) {
    this.name.set(name || 'arquivo');
    this.text.set(text);
  }

  close() {
    this.text.set(null);
  }
}
