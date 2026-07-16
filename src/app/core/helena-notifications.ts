import { registerPlugin } from '@capacitor/core';

/** Interface do plugin nativo custom (Nível B, §11). */
export interface HelenaNotificationsPlugin {
  /** Guarda baseUrl + JWT + userId no store seguro nativo (após login). */
  setAuth(opts: { baseUrl: string; token: string; userId: string }): Promise<void>;
  /** Limpa as credenciais nativas (logout). */
  clearAuth(): Promise<void>;
  /** Posta uma notificação com resposta inline (RemoteInput). */
  notifyReplyable(opts: { id: number; title: string; body: string }): Promise<void>;
  /** Dispara um pull de fundo imediato (para testar o WorkManager). */
  syncNow(): Promise<void>;
}

export const HelenaNotifications =
  registerPlugin<HelenaNotificationsPlugin>('HelenaNotifications');
