import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

/** Base da API do servidor que roda a IA. Configurável em runtime (o usuário
 *  aponta pro IP/URL do PC/VPS nas configurações); cai no default compilado
 *  se nada foi configurado. */
const KEY = 'helena_server_url';

const defaultBase = Capacitor.isNativePlatform()
  ? environment.apiUrlNative
  : environment.apiUrl;

/** URL base atual (configurada pelo usuário ou o default). */
export function getApiBase(): string {
  const saved = (localStorage.getItem(KEY) || '').trim();
  return saved || defaultBase;
}

/** Salva a URL do servidor. Vazio → volta ao default. Normaliza a barra final. */
export function setApiBase(url: string): void {
  const clean = (url || '').trim().replace(/\/+$/, '');
  if (clean) localStorage.setItem(KEY, clean);
  else localStorage.removeItem(KEY);
}

export function getDefaultApiBase(): string {
  return defaultBase;
}
