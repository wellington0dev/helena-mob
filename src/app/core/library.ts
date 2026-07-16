import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getApiBase } from './api-base';

export type StepKind = 'command' | 'shell';
export interface RoutineStep { kind: StepKind; value: string; }

export interface SavedCommand {
  id: number;
  name: string;
  description: string | null;
  command: string;
  created_by: 'user' | 'ai';
}
export interface Routine {
  id: number;
  name: string;
  description: string | null;
  steps: RoutineStep[];
  created_by: 'user' | 'ai';
}

/** CRUD de comandos salvos e listas/rotinas. */
@Injectable({ providedIn: 'root' })
export class Library {
  private http = inject(HttpClient);
  private get api() { return getApiBase(); }

  // --- comandos ---
  async commands(): Promise<SavedCommand[]> {
    const r = await firstValueFrom(
      this.http.get<{ commands: SavedCommand[] }>(`${this.api}/saved-commands`),
    );
    return r.commands;
  }
  createCommand(data: Partial<SavedCommand>): Promise<{ command: SavedCommand }> {
    return firstValueFrom(this.http.post<{ command: SavedCommand }>(`${this.api}/saved-commands`, data));
  }
  updateCommand(id: number, data: Partial<SavedCommand>): Promise<{ command: SavedCommand }> {
    return firstValueFrom(this.http.put<{ command: SavedCommand }>(`${this.api}/saved-commands/${id}`, data));
  }
  deleteCommand(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/saved-commands/${id}`));
  }

  // --- listas/rotinas ---
  async routines(): Promise<Routine[]> {
    const r = await firstValueFrom(
      this.http.get<{ routines: Routine[] }>(`${this.api}/routines`),
    );
    return r.routines;
  }
  createRoutine(data: Partial<Routine>): Promise<{ routine: Routine }> {
    return firstValueFrom(this.http.post<{ routine: Routine }>(`${this.api}/routines`, data));
  }
  updateRoutine(id: number, data: Partial<Routine>): Promise<{ routine: Routine }> {
    return firstValueFrom(this.http.put<{ routine: Routine }>(`${this.api}/routines/${id}`, data));
  }
  deleteRoutine(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/routines/${id}`));
  }
}
