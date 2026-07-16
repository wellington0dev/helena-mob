import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiBase } from './api-base';
import { ChatMessage, ChatInfo, SendResponse } from './models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private get api() { return getApiBase(); }

  async history(limit = 50): Promise<ChatMessage[]> {
    const res = await firstValueFrom(
      this.http.get<{ messages: ChatMessage[] }>(
        `${this.api}/messages?limit=${limit}`,
      ),
    );
    return res.messages;
  }

  /** Dados da conversa (perfil): início, total e mídias compartilhadas. */
  info(): Promise<ChatInfo> {
    return firstValueFrom(this.http.get<ChatInfo>(`${this.api}/messages/info`));
  }

  async send(
    content: string,
    media?: { media_url: string; media_type: string; media_meta?: any },
  ): Promise<SendResponse> {
    return firstValueFrom(
      this.http.post<SendResponse>(`${this.api}/messages`, { content, ...media }),
    );
  }

  /** Decide sobre um comando de shell que a Helena quer rodar. */
  async decideCommand(
    cmdId: number,
    decision: 'allow' | 'deny' | 'always',
  ): Promise<{ messages: ChatMessage[] }> {
    return firstValueFrom(
      this.http.post<{ messages: ChatMessage[] }>(
        `${this.api}/commands/${cmdId}/decision`,
        { decision },
      ),
    );
  }

  /** Comandos confiados ("permitir sempre"), para revisar/revogar. */
  async listApprovals(): Promise<{ id: number; command: string; created_at: string }[]> {
    const r = await firstValueFrom(
      this.http.get<{ approvals: { id: number; command: string; created_at: string }[] }>(
        `${this.api}/commands/approvals`,
      ),
    );
    return r.approvals;
  }

  /** Revoga um "permitir sempre" — o comando volta a pedir permissão. */
  async revokeApproval(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/commands/approvals/${id}`));
  }

  /** Faz upload de um arquivo e devolve os campos de mídia. */
  async upload(file: File): Promise<{ media_url: string; media_type: string; media_meta: any }> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(
      this.http.post<{ media_url: string; media_type: string; media_meta: any }>(
        `${this.api}/media/upload`,
        form,
      ),
    );
  }

  /** Busca mídia autenticada (JWT via interceptor) como Blob cru. */
  async mediaBlob(mediaUrl: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`${this.api}/media/${mediaUrl}`, { responseType: 'blob' }),
    );
  }

  /** Busca mídia autenticada (JWT via interceptor) como blob → object URL. */
  async mediaObjectUrl(mediaUrl: string): Promise<string> {
    return URL.createObjectURL(await this.mediaBlob(mediaUrl));
  }
}
