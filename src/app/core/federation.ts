import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiBase } from './api-base';

export type TrustLevel = 'confiavel' | 'nao_confiavel' | 'a_averiguar';

export interface Peer {
  id: number;
  link_id: string;
  remote_base_url: string;
  label: string;
  trust_level: TrustLevel;
  ai_dialogue_enabled: boolean;
  ai_can_initiate: boolean;
  created_at: string;
}

export type PeerMessageKind = 'chat' | 'task_share' | 'help_request' | 'help_response';

export interface PeerMessage {
  id: number;
  peer_id: number;
  direction: 'incoming' | 'outgoing';
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'received';
  authored_by: 'human' | 'ai';
  kind: PeerMessageKind;
  request_id: string | null;
  in_reply_to: string | null;
  verified_request_message_id: number | null;
  created_at: string;
}

export interface FederationSettings {
  public_url_configured: boolean;
  paused: boolean;
}

export interface PairingCodeResponse {
  code: string;
  expires_at: string;
}

/** Federação: pareamento + mensagens de texto com outras instâncias da Helena. */
@Injectable({ providedIn: 'root' })
export class Federation {
  private http = inject(HttpClient);
  private get api() { return getApiBase(); }

  settings(): Promise<FederationSettings> {
    return firstValueFrom(this.http.get<FederationSettings>(`${this.api}/federation/settings`));
  }

  resume(): Promise<{ ok: boolean }> {
    return firstValueFrom(this.http.post<{ ok: boolean }>(`${this.api}/federation/resume`, {}));
  }

  generateCode(): Promise<PairingCodeResponse> {
    return firstValueFrom(
      this.http.post<PairingCodeResponse>(`${this.api}/federation/peers/pairing-codes`, {}),
    );
  }

  async peers(): Promise<Peer[]> {
    const r = await firstValueFrom(this.http.get<{ peers: Peer[] }>(`${this.api}/federation/peers`));
    return r.peers;
  }

  join(code: string, baseUrl: string): Promise<{ peer: Peer }> {
    return firstValueFrom(
      this.http.post<{ peer: Peer }>(`${this.api}/federation/peers`, { code, base_url: baseUrl }),
    );
  }

  updatePeer(
    id: number,
    data: {
      label?: string;
      trust_level?: TrustLevel;
      ai_dialogue_enabled?: boolean;
      ai_can_initiate?: boolean;
    },
  ): Promise<{ peer: Peer }> {
    return firstValueFrom(this.http.put<{ peer: Peer }>(`${this.api}/federation/peers/${id}`, data));
  }

  deletePeer(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/federation/peers/${id}`));
  }

  async messages(peerId: number): Promise<PeerMessage[]> {
    const r = await firstValueFrom(
      this.http.get<{ messages: PeerMessage[] }>(`${this.api}/federation/peers/${peerId}/messages`),
    );
    return r.messages;
  }

  sendMessage(peerId: number, body: string, replyToMessageId?: number): Promise<{ message: PeerMessage }> {
    return firstValueFrom(
      this.http.post<{ message: PeerMessage }>(`${this.api}/federation/peers/${peerId}/messages`, {
        body,
        ...(replyToMessageId != null ? { reply_to_message_id: replyToMessageId } : {}),
      }),
    );
  }
}
