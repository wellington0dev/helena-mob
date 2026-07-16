import { ChangeDetectionStrategy, Component, Input, booleanAttribute, inject } from '@angular/core';
import { Location } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';

/** Barra de topo custom (glass) com voltar opcional, título e slot à direita. */
@Component({
  selector: 'ui-topbar',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  @Input() title = '';
  @Input({ transform: booleanAttribute }) back = false;
  private location = inject(Location);

  constructor() {
    addIcons({ chevronBackOutline });
  }

  goBack(): void {
    this.location.back();
  }
}
