import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpContextToken } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { LoadingService } from 'src/app/services/loading.service';

export const SILENT_REQUEST = new HttpContextToken<boolean>(() => false);

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private readonly ignoredPaths = ['/api/demo/'];

  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const url = req.url.toLowerCase();
    if (req.context.get(SILENT_REQUEST) || this.ignoredPaths.some(path => url.includes(path))) {
      return next.handle(req);
    }

    this.loadingService.show();
    return next.handle(req).pipe(
      finalize(() => this.loadingService.hide())
    );
  }
}
