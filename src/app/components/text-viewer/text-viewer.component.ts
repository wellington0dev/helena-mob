import { Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shareOutline, close } from 'ionicons/icons';
import { TextViewer } from '../../core/text-viewer';
import { FileShare } from '../../core/file-share';

/** Leitor de arquivo de texto em tela cheia, montado na raiz do app. */
@Component({
  selector: 'app-text-viewer',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './text-viewer.component.html',
  styleUrls: ['./text-viewer.component.scss'],
})
export class TextViewerComponent {
  readonly viewer = inject(TextViewer);
  private fileShare = inject(FileShare);

  constructor() {
    addIcons({ shareOutline, close });
  }

  async share() {
    const text = this.viewer.text();
    if (text == null) return;
    const blob = new Blob([text], { type: 'text/plain' });
    await this.fileShare.download(blob, this.viewer.name());
  }
}
