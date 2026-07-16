import { Injectable } from '@angular/core';
import { VoiceRecorder } from 'capacitor-voice-recorder';

export interface RecordedAudio {
  file: File;
  durationSec: number;
}

/** Grava áudio (voz) no chat, estilo WhatsApp. Usa o plugin nativo
 *  capacitor-voice-recorder (Android: AAC). Devolve um File pronto p/ upload. */
@Injectable({ providedIn: 'root' })
export class AudioRecorder {
  async ensurePermission(): Promise<boolean> {
    const has = await VoiceRecorder.hasAudioRecordingPermission().catch(() => ({ value: false }));
    if (has.value) return true;
    const req = await VoiceRecorder.requestAudioRecordingPermission().catch(() => ({ value: false }));
    return req.value;
  }

  async start(): Promise<boolean> {
    if (!(await this.ensurePermission())) return false;
    const res = await VoiceRecorder.startRecording().catch(() => ({ value: false }));
    return res.value;
  }

  /** Para a gravação e devolve o áudio como File (.aac) + duração em segundos. */
  async stop(): Promise<RecordedAudio | null> {
    const res = await VoiceRecorder.stopRecording().catch(() => null);
    if (!res?.value?.recordDataBase64) return null;
    const { recordDataBase64, msDuration, mimeType } = res.value;
    const mime = mimeType || 'audio/aac';
    // deriva a extensão do subtipo (nativo: aac; web: webm/ogg/mp4)
    const sub = mime.split('/')[1]?.split(';')[0] ?? 'aac';
    const ext = ({ webm: 'webm', ogg: 'ogg', mp4: 'm4a', aac: 'aac', wav: 'wav', mpeg: 'mp3' } as any)[sub] || 'aac';
    const blob = this.base64ToBlob(recordDataBase64, mime);
    const file = new File([blob], `voz.${ext}`, { type: mime });
    return { file, durationSec: Math.round((msDuration || 0) / 100) / 10 };
  }

  async cancel(): Promise<void> {
    await VoiceRecorder.stopRecording().catch(() => null);
  }

  private base64ToBlob(b64: string, mime: string): Blob {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
}
