import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { EmpresaIdentidadePublicaService } from 'src/app/pages/empresa/empresa-identidade-publica.service';
import { EmpresaFormService } from 'src/app/pages/empresa/empresa-form.service';
import { PresencaPublicaService } from 'src/app/pages/config/presenca-publica/presenca-publica.service';
import { LinksService } from '../../services/links.service';
import { LinksEditorComponent } from './links-editor.component';

describe('ClickLink — continuidade mobile na rota real', () => {
  let api: any, created: any;
  const identidade = { nome: 'Clickarte', slug: 'clickarte', logoUrl: null };
  beforeEach(() => {
    api = jasmine.createSpyObj('LinksService', ['criarPagina', 'buscarPagina', 'editarPagina']);
    api.buscarPagina.and.callFake(() => of(created)); api.editarPagina.and.callFake((_id: number, payload: object) => of({ ...created, ...payload }));
    TestBed.configureTestingModule({ imports: [LinksEditorComponent, NoopAnimationsModule], providers: [
      provideRouter([{ path: 'page/links', children: [{ path: 'nova', component: LinksEditorComponent }, { path: ':id', component: LinksEditorComponent }] }]),
      { provide: BreakpointObserver, useValue: { observe: () => of({ matches: true, breakpoints: {} }) } },
      { provide: LinksService, useValue: api }, { provide: EmpresaIdentidadePublicaService, useValue: { buscar: () => of(identidade) } },
      { provide: EmpresaFormService, useValue: { buscarEmpresa: () => of({ id: 1, nome: 'Clickarte' }) } },
      { provide: PresencaPublicaService, useValue: { buscar: () => of({ slugPublico: 'clickarte' }) } },
      { provide: AuthService, useValue: { usuario$: of({ empresa: { id: 1 } }), temPermissao: () => true } },
      { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error', 'info']) },
    ] });
  });
  it('cria uma vez, navega para edição, reabre Links e mantém os campos e o ID persistido', async () => {
    const response = new Subject<any>(); api.criarPagina.and.returnValue(response);
    const harness = await RouterTestingHarness.create(); const initial = await harness.navigateByUrl('/page/links/nova', LinksEditorComponent); harness.detectChanges();
    const values = { titulo: 'Canais da loja', descricao: 'Equipe comercial', tema: 'ESCURO', corPrincipal: '#123ABC', corFundo: '#000000', formatoBotao: 'SUAVE' } as const;
    initial.form.patchValue(values); initial.setMobileSection('links', true); harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.links-mobile-save-first button')!.click(); harness.detectChanges(); initial.salvarOuCriar(true);
    expect(api.criarPagina).toHaveBeenCalledTimes(1); expect(api.criarPagina).toHaveBeenCalledWith(values);
    created = { ...values, id: 19, slug: 'canais-da-loja', ativa: true, publicada: false, principal: false, identidade, itens: [] };
    response.next(created); response.complete(); await harness.fixture.whenStable(); harness.detectChanges();
    const current = harness.routeDebugElement!.componentInstance as LinksEditorComponent;
    expect(current).not.toBe(initial); expect(current.isNova).toBeFalse(); expect(current.pagina?.id).toBe(19); expect(api.buscarPagina).toHaveBeenCalledWith(19); expect(current.mobileSection).toBe('links'); expect(current.form.getRawValue()).toEqual(values);
    expect(harness.routeNativeElement!.querySelector('.links-mobile-save-first')).toBeNull(); expect(harness.routeNativeElement!.querySelector('.links-mobile-add')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('[data-mobile-section="links"] .section-card__toggle')!.getAttribute('aria-expanded')).toBe('true');
    current.tituloControl.setValue('Canais atualizados'); current.salvarOuCriar(); expect(api.editarPagina).toHaveBeenCalledWith(19, jasmine.objectContaining({ titulo: 'Canais atualizados' })); expect(api.criarPagina).toHaveBeenCalledTimes(1);
  });
});
