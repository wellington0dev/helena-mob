import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { getApiBase } from './api-base';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';
import { HelenaNotifications } from './helena-notifications';

/** Anexa o Bearer JWT e, num 401 da API (sessão inválida/expirada), desloga e
 *  manda de volta ao login — em vez de deixar o app preso num chat vazio. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const socket = inject(SocketService);
  const router = inject(Router);
  const isApi = req.url.startsWith(getApiBase());
  const isAuthRoute = req.url.includes('/auth/');

  const token = auth.token;
  if (token && isApi) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 fora das rotas de login = sessão morta → limpa e redireciona
      if (err.status === 401 && isApi && !isAuthRoute) {
        socket.disconnect();
        HelenaNotifications.clearAuth().catch(() => {}); // limpa JWT nativo
        auth.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
