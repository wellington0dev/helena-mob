import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'helena_theme';

/** Gerencia o tema (claro/escuro/system): aplica `data-theme`, persiste e
 *  acompanha a preferência do sistema. O tema inicial já é aplicado pré-paint
 *  por um script no index.html; aqui cuidamos das trocas em runtime. */
@Injectable({ providedIn: 'root' })
export class Theme {
  private media = matchMedia('(prefers-color-scheme: dark)');
  readonly pref = signal<ThemePref>((localStorage.getItem(KEY) as ThemePref) || 'system');

  constructor() {
    this.media.addEventListener('change', () => {
      if (this.pref() === 'system') this.apply();
    });
    this.apply();
  }

  /** Tema efetivo atual ('light' | 'dark'), resolvendo 'system'. */
  effective(): 'light' | 'dark' {
    const p = this.pref();
    if (p === 'system') return this.media.matches ? 'dark' : 'light';
    return p;
  }

  set(pref: ThemePref) {
    this.pref.set(pref);
    localStorage.setItem(KEY, pref);
    this.apply();
  }

  private apply() {
    const eff = this.effective();
    document.documentElement.setAttribute('data-theme', eff);
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: eff === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
    }
  }
}
