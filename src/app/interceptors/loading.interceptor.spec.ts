import { HttpContext, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { LoadingInterceptor, SILENT_REQUEST } from './loading.interceptor';
import { LoadingService } from 'src/app/services/loading.service';

describe('LoadingInterceptor', () => {
  it('não aciona o loading global para acompanhamento silencioso', () => {
    const loading = jasmine.createSpyObj<LoadingService>('LoadingService', ['show', 'hide']);
    const interceptor = new LoadingInterceptor(loading);
    const next: HttpHandler = { handle: () => of(new HttpResponse({ status: 200 })) };
    const request = new HttpRequest('GET', '/api/grafica/biblioteca/importacoes/123', {
      context: new HttpContext().set(SILENT_REQUEST, true),
    });
    interceptor.intercept(request, next).subscribe();
    expect(loading.show).not.toHaveBeenCalled();
    expect(loading.hide).not.toHaveBeenCalled();
  });
});
