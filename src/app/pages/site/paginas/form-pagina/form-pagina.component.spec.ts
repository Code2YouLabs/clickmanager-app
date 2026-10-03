import { FormBuilder } from '@angular/forms';
import { convertToParamMap, ParamMap, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { SitePaginaResponse } from '../../models/site-pagina.models';
import { SitePaginaService } from '../../services/site-pagina.service';
import { FormPaginaComponent } from './form-pagina.component';

const pagina = (overrides: Partial<SitePaginaResponse> = {}): SitePaginaResponse => ({
  id: 10,
  codigo: null,
  tipo: 'PERSONALIZADA',
  titulo: 'Landing',
  slug: 'landing',
  resumo: 'Resumo',
  ativa: true,
  exibirNoMenu: true,
  ordemMenu: 2,
  exibirNaHome: false,
  ordemHome: 4,
  tituloHome: 'Home',
  subtituloHome: 'Sub',
  limiteItensHome: 6,
  layoutHome: 'GRID',
  textoBotaoHome: 'Ver',
  paginaSistema: false,
  seoTitulo: 'SEO',
  seoDescricao: 'Descrição',
  ...overrides,
});

describe('FormPaginaComponent', () => {
  let component: FormPaginaComponent;
  let service: jasmine.SpyObj<SitePaginaService>;
  let router: jasmine.SpyObj<Router>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let params$: Subject<ParamMap>;

  beforeEach(() => {
    params$ = new Subject<ParamMap>();
    service = jasmine.createSpyObj<SitePaginaService>('SitePaginaService', ['listar', 'buscarPorId', 'criar', 'atualizar']);
    service.listar.and.returnValue(of({ content: [pagina({ ordemMenu: 3, ordemHome: 8 })], totalElements: 1 }));
    service.buscarPorId.and.returnValue(of(pagina()));
    service.criar.and.returnValue(of({} as any));
    service.atualizar.and.returnValue(of({} as any));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);

    component = new FormPaginaComponent(
      new FormBuilder(),
      { paramMap: params$.asObservable() } as any,
      router,
      service,
      toastr
    );
    component.ngOnInit();
  });

  it('captura baseline de criação depois das ordens assíncronas', () => {
    params$.next(convertToParamMap({}));

    expect(component.ordemMenuControl.value).toBe(4);
    expect(component.ordemHomeControl.value).toBe(9);
    component.tituloControl.setValue('Rascunho');
    component.exibirNaHomeControl.setValue(true);

    component.formState.reset();

    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({
      titulo: '',
      slug: '',
      resumo: '',
      ativa: true,
      exibirNoMenu: true,
      exibirNaHome: false,
      ordemMenu: 4,
      ordemHome: 9,
      limiteItensHome: 6,
      layoutHome: 'GRID',
      seoTitulo: '',
      seoDescricao: '',
    }));
    expect(component.tituloHomeControl.disabled).toBeTrue();
  });

  it('restaura edição sem novo GET e preserva estados HOME, sistema e Home desabilitada', () => {
    service.buscarPorId.and.returnValue(of(pagina({
      codigo: 'HOME',
      tipo: 'SISTEMA',
      paginaSistema: true,
      ativa: true,
      slug: 'home',
      exibirNaHome: false,
    })));
    params$.next(convertToParamMap({ id: '10' }));

    expect(component.ativaControl.disabled).toBeTrue();
    expect(component.slugControl.disabled).toBeTrue();
    expect(component.tituloHomeControl.disabled).toBeTrue();

    component.tituloControl.setValue('Alterado');
    component.exibirNaHomeControl.setValue(true);
    component.formState.reset();

    expect(component.tituloControl.value).toBe('Landing');
    expect(component.ativaControl.disabled).toBeTrue();
    expect(component.slugControl.disabled).toBeTrue();
    expect(component.tituloHomeControl.disabled).toBeTrue();
    expect(service.buscarPorId.calls.count()).toBe(1);
  });

  it('não redireciona em erro recuperável de carregamento', () => {
    service.buscarPorId.and.returnValue(throwError(() => ({ status: 500, userMessage: 'Falhou' })));
    params$.next(convertToParamMap({ id: '22' }));

    expect(component.erro).toBe('Falhou');
    expect(component.semPermissao).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('monta payload preservando slug de sistema e HOME ativa', () => {
    service.buscarPorId.and.returnValue(of(pagina({
      codigo: 'HOME',
      tipo: 'SISTEMA',
      paginaSistema: true,
      slug: 'home',
      ativa: true,
    })));
    params$.next(convertToParamMap({ id: '10' }));

    component.ativaControl.enable({ emitEvent: false });
    component.ativaControl.setValue(false);
    component.slugControl.enable({ emitEvent: false });
    component.slugControl.setValue('');
    component.onSubmit();

    expect(service.atualizar).toHaveBeenCalledWith(10, jasmine.objectContaining({ slug: 'home', ativa: true }));
    expect(router.navigate).toHaveBeenCalledWith(['/page/site/paginas']);
  });

  it('mantém dados no form quando salvar falha e libera submit', () => {
    service.atualizar.and.returnValue(throwError(() => ({ userMessage: 'Não salvou' })));
    params$.next(convertToParamMap({ id: '10' }));
    component.tituloControl.setValue('Alterado');

    component.onSubmit();

    expect(component.salvando).toBeFalse();
    expect(component.tituloControl.value).toBe('Alterado');
    expect(toastr.error).toHaveBeenCalledWith('Não salvou');
  });
});
