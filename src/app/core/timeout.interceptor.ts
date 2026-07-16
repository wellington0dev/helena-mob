import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { TimeoutError, catchError, throwError, timeout } from 'rxjs';

/** Falha rápido quando o servidor não responde (evita o "carrega pra sempre").
 *  Endpoints que rodam o agente (lentos) ganham timeout longo; o resto, curto. */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;
  let ms = 20_000; // padrão: histórico, config, conta, etc.
  if (url.endsWith('/messages') && req.method === 'POST') ms = 150_000; // turno do agente
  else if (url.includes('/commands/') && url.endsWith('/decision')) ms = 150_000; // executa + re-invoca
  else if (url.includes('/media/upload')) ms = 90_000; // upload de mídia

  return next(req).pipe(
    timeout(ms),
    catchError((err) => {
      if (err instanceof TimeoutError) {
        return throwError(() => new HttpErrorResponse({
          status: 0,
          statusText: 'timeout',
          url,
          error: 'O servidor não respondeu. Confira a conexão e o endereço do servidor nas configurações.',
        }));
      }
      return throwError(() => err);
    }),
  );
};
