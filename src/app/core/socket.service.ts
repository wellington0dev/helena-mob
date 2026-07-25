import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { getApiBase } from './api-base';
import { AuthService } from './auth.service';
import { ChatMessage } from './models';

/** Conexão Socket.IO para resultados assíncronos (background jobs). */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private auth = inject(AuthService);
  private socket?: Socket;
  private connectedToken?: string;

  /** Emite a mensagem do assistant quando um job termina (app aberto). */
  readonly jobDone = new Subject<ChatMessage>();
  /** Emite mensagens novas do turno (inclui respostas via notificação). */
  readonly newMessages = new Subject<ChatMessage[]>();
  /** Feedback contínuo de um job iterativo em andamento (ao vivo, efêmero). */
  readonly jobProgress = new Subject<string>();

  connect() {
    const token = this.auth.token;
    if (!token) return;
    // já conectado com ESTE token → nada a fazer. Se o token mudou (logout e
    // login como outro usuário na mesma sessão), reconecta para entrar na room
    // certa — senão o socket ficaria preso na room do usuário anterior.
    if (this.socket?.connected && this.connectedToken === token) return;
    this.disconnect();
    this.connectedToken = token;
    this.socket = io(getApiBase(), {
      auth: { token },
      // Só polling: o servidor de dev (Werkzeug + threading) não faz o upgrade
      // de WebSocket (retorna 500 e cai pra polling de qualquer forma). Polling
      // entrega os emits de forma confiável. WS real exige servidor de produção.
      transports: ['polling'],
    });
    this.socket.on('job_done', (data: { message: ChatMessage }) => {
      if (data?.message) this.jobDone.next(data.message);
    });
    this.socket.on('new_messages', (data: { messages: ChatMessage[] }) => {
      if (data?.messages?.length) this.newMessages.next(data.messages);
    });
    this.socket.on('job_progress', (data: { text: string }) => {
      if (data?.text) this.jobProgress.next(data.text);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
    this.connectedToken = undefined;
  }
}
