import { Component, inject, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, chatbubbleEllipsesOutline, imagesOutline, sparkles } from 'ionicons/icons';
import { ChatService } from '../../core/chat.service';
import { ChatInfo, ChatMessage } from '../../core/models';
import { MessageMediaComponent } from '../../components/message-media/message-media.component';
import { TopbarComponent } from '../../ui/topbar/topbar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonIcon, MessageMediaComponent, TopbarComponent],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage {
  private chat = inject(ChatService);
  loading = signal(true);
  info = signal<ChatInfo | null>(null);

  constructor() {
    addIcons({ calendarOutline, chatbubbleEllipsesOutline, imagesOutline, sparkles });
  }

  ionViewWillEnter() {
    this.load();
  }

  private async load() {
    try {
      this.info.set(await this.chat.info());
    } catch {
      /* 401 tratado pelo interceptor */
    } finally {
      this.loading.set(false);
    }
  }

  images(): ChatMessage[] {
    return (this.info()?.media ?? []).filter((m) => m.media_type === 'image');
  }

  files(): ChatMessage[] {
    return (this.info()?.media ?? []).filter((m) => m.media_type !== 'image');
  }

  startedLabel(): string {
    const d = this.info()?.started_at;
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }
}
