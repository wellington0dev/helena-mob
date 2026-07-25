import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/chat/chat.page').then((m) => m.ChatPage),
  },
  {
    path: 'comandos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/comandos/comandos.component').then((m) => m.ComandosComponent),
  },
  {
    path: 'listas',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/listas/listas.component').then((m) => m.ListasComponent),
  },
  {
    path: 'atividade',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/atividade/atividade.component').then((m) => m.AtividadeComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  { path: '**', redirectTo: 'chat' },
];
