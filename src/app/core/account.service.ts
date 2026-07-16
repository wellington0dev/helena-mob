import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiBase } from './api-base';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private get api() { return getApiBase(); }

  me(): Promise<{ user: User }> {
    return firstValueFrom(this.http.get<{ user: User }>(`${this.api}/account/me`));
  }

  updateNotifPrefs(prefs: Record<string, any>): Promise<any> {
    return firstValueFrom(this.http.put(`${this.api}/account/notif-prefs`, prefs));
  }

  updateName(name: string): Promise<{ ok: boolean; name: string }> {
    return firstValueFrom(
      this.http.put<{ ok: boolean; name: string }>(`${this.api}/account/name`, { name }),
    );
  }

  resetChat(): Promise<any> {
    return firstValueFrom(this.http.post(`${this.api}/account/reset-chat`, {}));
  }

  resetContext(): Promise<any> {
    return firstValueFrom(this.http.post(`${this.api}/account/reset-context`, {}));
  }

  wipe(deleteAccount: boolean): Promise<any> {
    return firstValueFrom(
      this.http.post(`${this.api}/account/wipe`, { deleteAccount }),
    );
  }

  /** Trilha do que a Helena executou na máquina (shell/desktop). */
  audit(): Promise<{ entries: AuditEntry[] }> {
    return firstValueFrom(
      this.http.get<{ entries: AuditEntry[] }>(`${this.api}/account/audit`),
    );
  }

  /** Kill switch: revoga todas as permissões e nega comandos pendentes. */
  panic(): Promise<any> {
    return firstValueFrom(this.http.post(`${this.api}/account/panic`, {}));
  }

  /** Navegadores instalados nesta máquina + qual está configurado como padrão. */
  listBrowsers(): Promise<{ installed: BrowserInfo[]; default: string | null }> {
    return firstValueFrom(
      this.http.get<{ installed: BrowserInfo[]; default: string | null }>(
        `${this.api}/account/browsers`,
      ),
    );
  }

  setDefaultBrowser(browserId: string | null): Promise<{ ok: boolean; default: string | null }> {
    return firstValueFrom(
      this.http.put<{ ok: boolean; default: string | null }>(
        `${this.api}/account/browsers/default`,
        { browser_id: browserId },
      ),
    );
  }
}

export interface BrowserInfo {
  id: string;
  label: string;
  path: string;
}

export interface AuditEntry {
  id: number;
  kind: string;
  detail: string;
  exit_code: number | null;
  created_at: string;
}
