import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonMenu, IonMenuToggle, IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline, terminalOutline, listOutline, settingsOutline,
  personOutline, sparkles, pulseOutline,
} from 'ionicons/icons';

/** Gaveta de navegação (ion-menu) estilizada com os tokens do app. */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IonMenu, IonMenuToggle, IonContent, IonIcon],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  nav = [
    { path: '/chat', label: 'Chat', icon: 'chatbubble-ellipses-outline' },
    { path: '/comandos', label: 'Comandos', icon: 'terminal-outline' },
    { path: '/listas', label: 'Listas', icon: 'list-outline' },
    { path: '/atividade', label: 'Atividade', icon: 'pulse-outline' },
    { path: '/settings', label: 'Configurações', icon: 'settings-outline' },
    { path: '/profile', label: 'Perfil', icon: 'person-outline' },
  ];

  constructor() {
    addIcons({
      chatbubbleEllipsesOutline, terminalOutline, listOutline, settingsOutline,
      personOutline, sparkles, pulseOutline,
    });
  }
}
