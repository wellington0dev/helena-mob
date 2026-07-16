import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** Baixar / compartilhar um arquivo de mídia. No nativo grava o blob no cache
 *  do app e abre a folha de compartilhar do Android (Salvar em Arquivos, abrir
 *  com um leitor, etc.). Na web cai no <a download> clássico (que funciona lá).
 *
 *  Trabalha SEMPRE a partir do blob — nunca da URL /media/... protegida por
 *  JWT (o SO não manda o Bearer, daria 401). */
@Injectable({ providedIn: 'root' })
export class FileShare {
  /** `source` pode ser o Blob já em mãos ou um object URL (blob:) — nesse caso
   *  o blob é re-buscado localmente. `fileName` deve ser o nome amigável
   *  (media_meta.original_name), nunca o uuid do disco. */
  async download(source: Blob | string, fileName: string): Promise<void> {
    const blob = typeof source === 'string'
      ? await fetch(source).then((r) => r.blob())
      : source;

    if (Capacitor.isNativePlatform()) {
      await this.nativeShare(blob, fileName);
    } else {
      this.webDownload(blob, fileName);
    }
  }

  private async nativeShare(blob: Blob, fileName: string): Promise<void> {
    const base64 = await blobToBase64(blob);
    await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
    try {
      await Share.share({ files: [uri], title: fileName });
    } catch (e) {
      // usuário cancelou a folha de compartilhar → não é erro
      if (isShareCancel(e)) return;
      throw e;
    }
  }

  private webDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

/** Blob → base64 puro (sem o prefixo `data:...;base64,`), como o Filesystem espera. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const res = reader.result as string;
      resolve(res.slice(res.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function isShareCancel(e: unknown): boolean {
  const msg = (e as { message?: string })?.message?.toLowerCase() ?? '';
  return msg.includes('cancel') || msg.includes('abort');
}
