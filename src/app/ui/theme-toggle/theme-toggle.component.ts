import { Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sunnyOutline, moonOutline, phonePortraitOutline } from 'ionicons/icons';
import { Theme, ThemePref } from '../../core/theme';

/** Seletor de tema: claro / escuro / sistema (segmented glass). */
@Component({
  selector: 'ui-theme-toggle',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
})
export class ThemeToggleComponent {
  private theme = inject(Theme);
  pref = this.theme.pref;

  options: { key: ThemePref; icon: string; label: string }[] = [
    { key: 'light', icon: 'sunny-outline', label: 'Claro' },
    { key: 'dark', icon: 'moon-outline', label: 'Escuro' },
    { key: 'system', icon: 'phone-portrait-outline', label: 'Sistema' },
  ];

  constructor() {
    addIcons({ sunnyOutline, moonOutline, phonePortraitOutline });
  }

  set(pref: ThemePref) {
    this.theme.set(pref);
  }
}
