import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getApiBase } from './api-base';
import { HelenaNotifications } from './helena-notifications';

// Tipos de notificação respondíveis (mensagens da IA) → Nível B (RemoteInput).
// Lembretes → Nível A (local-notifications, agendado por AlarmManager).
const REPLYABLE = new Set(['job_done', 'ai_initiative']);

interface PendingNotification {
  id: number;
  title: string;
  body: string;
  fire_at: string;
  type: string;
  reference_id: number | null;
}

/**
 * Sincroniza a fila de notificações do servidor com o agendamento local
 * (offline-first, CLAUDE.md §10): puxa as notificações das próximas 24h,
 * arma cada uma localmente via AlarmManager (setExactAndAllowWhileIdle, acorda
 * mesmo em Doze) e marca como entregue. Dedupe pelo id da fila = id local.
 */
@Injectable({ providedIn: 'root' })
export class NotificationSync {
  private http = inject(HttpClient);

  /** Pede permissão de notificação (POST_NOTIFICATIONS no Android 13+). */
  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  }

  /** Puxa a fila do servidor, agenda o que falta e dá ack. Idempotente. */
  async sync(): Promise<{ scheduled: number }> {
    if (!Capacitor.isNativePlatform()) return { scheduled: 0 };

    const pending = await this.fetchPending();
    if (!pending.length) return { scheduled: 0 };

    // não reagenda o que já está armado localmente (dedupe por id)
    const already = new Set(
      (await LocalNotifications.getPending()).notifications.map((n) => n.id),
    );
    const toSchedule = pending.filter((n) => !already.has(n.id));

    // Lembretes: agenda local via AlarmManager (fire_at futuro, acorda em Doze).
    const reminders = toSchedule.filter((n) => !REPLYABLE.has(n.type));
    if (reminders.length) {
      await LocalNotifications.schedule({
        notifications: reminders.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          schedule: { at: new Date(n.fire_at), allowWhileIdle: true },
          extra: { type: n.type, reference_id: n.reference_id },
        })),
      });
    }

    // Mensagens da IA (job terminado / iniciativa): notificação com resposta
    // inline (Nível B). São imediatas por natureza (fire_at ~agora).
    const replyable = toSchedule.filter((n) => REPLYABLE.has(n.type));
    for (const n of replyable) {
      await HelenaNotifications.notifyReplyable({
        id: n.id,
        title: n.title,
        body: n.body,
      });
    }

    // ack de tudo que foi puxado (o servidor não precisa reenviar)
    await this.ack(pending.map((n) => n.id));
    return { scheduled: toSchedule.length };
  }

  private async fetchPending(): Promise<PendingNotification[]> {
    const res = await firstValueFrom(
      this.http.get<{ notifications: PendingNotification[] }>(
        `${getApiBase()}/notifications/pending`,
      ),
    );
    return res.notifications;
  }

  private async ack(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await firstValueFrom(this.http.post(`${getApiBase()}/notifications/ack`, { ids }));
  }
}
