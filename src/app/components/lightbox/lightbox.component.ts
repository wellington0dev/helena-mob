import { Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, close } from 'ionicons/icons';
import { Lightbox } from '../../core/lightbox';
import { FileShare } from '../../core/file-share';

/** Visualizador de imagem em tela cheia, montado na raiz do app. */
@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './lightbox.component.html',
  styleUrls: ['./lightbox.component.scss'],
})
export class LightboxComponent {
  readonly lightbox = inject(Lightbox);
  private fileShare = inject(FileShare);

  constructor() {
    addIcons({ downloadOutline, close });
  }

  /** Baixar / compartilhar a imagem aberta (folha nativa no Android). O src é
   *  um object URL; o FileShare re-busca o blob a partir dele. */
  download() {
    const src = this.lightbox.src();
    if (src) this.fileShare.download(src, this.lightbox.name());
  }
}
