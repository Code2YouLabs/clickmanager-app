import { FormBuilder } from '@angular/forms';
import { convertToParamMap, ParamMap, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FormBannerComponent } from './form-banner.component';
import { SiteBannerService } from '../../services/site-banner.service';
import { SiteBannerResponse } from '../../models/site-banner.models';

describe('FormBannerComponent', () => {
  let service: jasmine.SpyObj<SiteBannerService>;
  let router: jasmine.SpyObj<Router>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let paramMap$: Subject<ParamMap>;
  let component: FormBannerComponent;

  const banner: SiteBannerResponse = {
    id: 7,
    titulo: 'Original',
    subtitulo: 'Sub',
    descricao: 'Desc',
    ctaTexto: 'Ver',
    ctaUrl: 'https://example.com',
    altText: 'Alt',
    ordem: 8,
    ativo: false,
    abrirEmNovaAba: true,
    posicaoTexto: 'DIREITA',
    corTexto: 'ESCURO',
    overlayAtivo: false,
    overlayOpacidade: 33,
    dataInicio: '2026-09-28T00:00:00',
    dataFim: '2026-09-30T23:59:59',
    displayUrl: '/storage/original.webp',
  };

  function init(params: Record<string, string> = {}): void {
    paramMap$ = new Subject<ParamMap>();
    const route = { paramMap: paramMap$.asObservable() } as any;
    component = new FormBannerComponent(new FormBuilder(), route, router, service, toastr);
    component.ngOnInit();
    paramMap$.next(convertToParamMap(params));
  }

  beforeEach(() => {
    service = jasmine.createSpyObj('SiteBannerService', ['listar', 'buscarPorId', 'criar', 'atualizar']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']);
  });

  it('na criacao captura baseline depois da ordem resolvida e Cancelar restaura defaults', () => {
    service.listar.and.returnValue(of({ content: [{ ...banner, ordem: 5 }], totalElements: 1 }));
    init();

    component.form.patchValue({ titulo: 'Alterado', ordem: 99, ativo: false, overlayOpacidade: 80 });
    const file = new File(['novo'], 'novo.webp', { type: 'image/webp' });
    component.onImagemSelecionada(file);
    component.onPreviewChange('blob:novo');

    component.formState.reset();

    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
      titulo: '',
      subtitulo: '',
      descricao: '',
      ctaTexto: '',
      ctaUrl: '',
      abrirEmNovaAba: false,
      altText: '',
      ordem: 6,
      ativo: true,
      posicaoTexto: 'ESQUERDA',
      corTexto: 'CLARO',
      overlayAtivo: true,
      overlayOpacidade: 45,
      dataInicio: '',
      dataFim: '',
    }));
    expect(component.imagemSelecionada).toBeNull();
    expect(component.previewImagem).toBe('');
  });

  it('usa fallback de ordem 1 quando calculo falha', () => {
    service.listar.and.returnValue(throwError(() => new Error('falha')));
    init();

    expect(component.ordemControl.value).toBe(1);
    expect(component.formState.ready).toBeTrue();
  });

  it('na edicao carrega snapshot e Cancelar restaura banner e imagem original sem novo GET', () => {
    service.buscarPorId.and.returnValue(of(banner));
    init({ id: '7' });
    const chamadas = service.buscarPorId.calls.count();

    component.form.patchValue({ titulo: 'Alterado', ativo: true, dataInicio: '2026-10-01' });
    component.onImagemSelecionada(new File(['novo'], 'novo.png', { type: 'image/png' }));
    component.onPreviewChange('blob:novo');
    component.formState.reset();

    expect(service.buscarPorId.calls.count()).toBe(chamadas);
    expect(component.tituloControl.value).toBe('Original');
    expect(component.ativoControl.value).toBeFalse();
    expect(component.dataInicioControl.value).toBe('2026-09-28');
    expect(component.imagemSelecionada).toBeNull();
    expect(component.previewImagem).toContain('original.webp');
  });

  it('mantem erro recuperavel ao carregar edicao e nao navega automaticamente', () => {
    service.buscarPorId.and.returnValue(throwError(() => ({ userMessage: 'Falha ao buscar' })));
    init({ id: '7' });

    expect(component.erro).toBe('Falha ao buscar');
    expect(router.navigate).not.toHaveBeenCalled();
    component.tentarNovamente();
    expect(service.buscarPorId).toHaveBeenCalledTimes(2);
  });

  it('marca forbidden na edicao', () => {
    service.buscarPorId.and.returnValue(throwError(() => ({ status: 403 })));
    init({ id: '7' });

    expect(component.semPermissao).toBeTrue();
    expect(component.erro).toBeNull();
  });

  it('exige imagem na criacao e envia FormData conceitual com datas normalizadas', () => {
    service.listar.and.returnValue(of([]));
    service.criar.and.returnValue(of(banner));
    init();
    component.form.patchValue({
      titulo: ' Novo ',
      dataInicio: '2026-09-28',
      dataFim: '2026-09-30',
      overlayOpacidade: 101,
    });

    component.onSubmit();
    expect(toastr.warning).toHaveBeenCalledWith('Selecione uma imagem para criar o banner.');

    const file = new File(['novo'], 'novo.webp', { type: 'image/webp' });
    component.onImagemSelecionada(file);
    component.onSubmit();

    const payload = service.criar.calls.mostRecent().args[0];
    expect(payload.titulo).toBe('Novo');
    expect(payload.dataInicio).toBe('2026-09-28T00:00:00');
    expect(payload.dataFim).toBe('2026-09-30T23:59:59');
    expect(payload.overlayOpacidade).toBe(100);
    expect(payload.imagem).toBe(file);
    expect(router.navigate).toHaveBeenCalledWith(['/page/site/banners']);
  });

  it('na atualizacao imagem nova e opcional e bloqueia dupla submissao', () => {
    service.buscarPorId.and.returnValue(of(banner));
    service.atualizar.and.returnValue(of(banner));
    init({ id: '7' });

    component.onSubmit();
    expect(service.atualizar.calls.mostRecent().args[1].imagem).toBeNull();

    component.salvando = true;
    component.onSubmit();
    expect(service.atualizar).toHaveBeenCalledTimes(1);
  });
});
