import { Injectable, signal } from '@angular/core';

/** Estado global do visualizador de imagem em tela cheia. Fica na raiz do app
 *  (fora de qualquer bubble/ion-page com transform/contain) para que o overlay
 *  `position: fixed` cubra a viewport inteira. */
@Injectable({
  providedIn: 'root',
})
export class Lightbox {
  readonly src = signal<string | null>(null);
  readonly name = signal<string>('imagem');

  open(src: string, name: string) {
    this.name.set(name || 'imagem');
    this.src.set(src);
  }

  close() {
    this.src.set(null);
  }
}
