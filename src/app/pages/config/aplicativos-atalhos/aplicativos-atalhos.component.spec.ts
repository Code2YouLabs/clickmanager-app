import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { AuthService } from 'src/app/services/auth.service';
import { ConfiguracaoAplicativosService } from 'src/app/services/configuracao-aplicativos.service';
import { ConfiguracaoAplicativos } from 'src/app/models/config/configuracao-aplicativos.model';
import { AplicativosAtalhosComponent } from './aplicativos-atalhos.component';

describe('AplicativosAtalhosComponent', () => {
  let fixture: ComponentFixture<AplicativosAtalhosComponent>;
  let component: AplicativosAtalhosComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let configuracaoService: jasmine.SpyObj<ConfiguracaoAplicativosService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const configInicial: ConfiguracaoAplicativos = {
    aplicativos: [
      { aplicativo: 'SMARTCALC', ativo: true },
      { aplicativo: 'SMARTCALC_CONFIG', ativo: true },
      { aplicativo: 'CALCULADORA_REVESTIMENTO', ativo: true },
    ],
    atalhos: [
      { id: 2, nome: 'Atalho B', url: 'https://b.example', novaAba: false, ativo: true, ordem: 2 },
      { id: 1, nome: 'Atalho A', url: 'https://a.example', novaAba: true, ativo: true, ordem: 1 },
    ],
  };

  function setup(options: {
    tipoEmpresa?: TipoEmpresa;
    podeEditar?: boolean;
    carregar?: any;
  } = {}): void {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['temPermissao', 'getTipoEmpresa']);
    configuracaoService = jasmine.createSpyObj<ConfiguracaoAplicativosService>('ConfiguracaoAplicativosService', ['carregar', 'salvar']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);

    authService.getTipoEmpresa.and.returnValue(options.tipoEmpresa ?? TipoEmpresa.GRAFICA);
    authService.temPermissao.and.callFake((permissao: string) => {
      if (permissao === 'CONFIGURACOES_APLICATIVOS_ATALHOS_EDITAR') {
        return options.podeEditar ?? true;
      }
      return true;
    });
    configuracaoService.carregar.and.returnValue(options.carregar ?? of(configInicial));
    configuracaoService.salvar.and.returnValue(of({
      aplicativos: [{ aplicativo: 'SMARTCALC', ativo: false }],
      atalhos: [{ id: 1, nome: 'Salvo', url: 'https://salvo.example', novaAba: true, ativo: true, ordem: 1 }],
    }));

    TestBed.configureTestingModule({
      imports: [AplicativosAtalhosComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ConfiguracaoAplicativosService, useValue: configuracaoService },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    fixture = TestBed.createComponent(AplicativosAtalhosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent;
  }

  function buttonByText(label: string): HTMLButtonElement | undefined {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.includes(label));
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('filtra aplicativos por segmento para gráfica', () => {
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA });

    expect(component.aplicativosCatalogo.map((app) => app.aplicativo)).toEqual(['SMARTCALC']);
    expect(text()).toContain('SmartCalc');
    expect(text()).not.toContain('Calculadora de revestimento');
    expect(text()).not.toContain('Configuração SmartCalc');
  });

  it('filtra aplicativos por segmento para depósito', () => {
    setup({ tipoEmpresa: TipoEmpresa.DEPOSITO });

    expect(component.aplicativosCatalogo.map((app) => app.aplicativo)).toEqual(['CALCULADORA_REVESTIMENTO']);
    expect(text()).toContain('Calculadora de revestimento');
    expect(text()).not.toContain('SmartCalc');
    expect(text()).not.toContain('Configuração SmartCalc');
  });

  it('mostra modo somente leitura sem footer de edição', () => {
    setup({ podeEditar: false });

    expect(text()).toContain('Você pode visualizar estas configurações, mas não possui permissão para editar.');
    expect(component.form.disabled).toBeTrue();
    expect(buttonByText('Adicionar')?.disabled).toBeTrue();
    expect(buttonByText('Salvar')).toBeUndefined();
    expect(buttonByText('Cancelar')).toBeUndefined();
  });

  it('mostra erro, retry e não renderiza formulário vazio em falha de GET', () => {
    setup({ carregar: throwError(() => ({ userMessage: 'Falha ao carregar' })) });

    expect(text()).toContain('Não foi possível carregar aplicativos e atalhos');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    configuracaoService.carregar.and.returnValue(of(configInicial));
    component.carregar();
    fixture.detectChanges();

    expect(configuracaoService.carregar).toHaveBeenCalledTimes(2);
    expect(component.atalhos.controls.map((control) => control.controls.nome.value)).toEqual(['Atalho A', 'Atalho B']);
  });

  it('mostra acesso restrito em 403 sem toast de erro genérico', () => {
    setup({ carregar: throwError(() => ({ status: 403 })) });

    expect(text()).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(toastr.error).not.toHaveBeenCalled();
  });

  it('usa footer do PageCard e submit associado ao form id', () => {
    setup();

    expect(fixture.debugElement.queryAll(By.css('app-page-card')).length).toBe(1);
    expect(fixture.debugElement.queryAll(By.css('app-section-card')).length).toBe(2);
    expect(fixture.nativeElement.querySelector('form')?.getAttribute('id')).toBe('aplicativos-atalhos-form');
    expect(buttonByText('Salvar')?.getAttribute('form')).toBe('aplicativos-atalhos-form');
    expect(buttonByText('Cancelar')).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.links-actions'))).toBeNull();
  });

  it('restaura estrutura completa de atalhos ao cancelar pelo PageFormState sem novo GET', fakeAsync(() => {
    setup();

    component.removerAtalho(0);
    component.adicionarAtalho();
    component.atalhos.at(0).controls.nome.setValue('B editado');
    component.atalhos.at(0).controls.url.setValue('https://b-editado.example');
    component.atalhos.at(0).controls.novaAba.setValue(true);
    fixture.detectChanges();

    buttonByText('Cancelar')?.click();
    tick();
    fixture.detectChanges();

    expect(component.atalhos.length).toBe(2);
    expect(component.atalhos.controls.map((control) => control.controls.nome.value)).toEqual(['Atalho A', 'Atalho B']);
    expect(component.atalhos.controls.map((control) => control.controls.url.value)).toEqual(['https://a.example', 'https://b.example']);
    expect(component.atalhos.controls.map((control) => control.controls.novaAba.value)).toEqual([true, false]);
    expect(configuracaoService.carregar).toHaveBeenCalledTimes(1);
  }));

  it('monta payload sem SMARTCALC_CONFIG e preserva aplicativo invisível de outro segmento', () => {
    setup({ tipoEmpresa: TipoEmpresa.GRAFICA });

    component.aplicativos.at(0).controls.ativo.setValue(false);
    component.form.markAsDirty();
    component.salvar();

    const payload = configuracaoService.salvar.calls.mostRecent().args[0] as ConfiguracaoAplicativos;
    expect(payload.aplicativos).toEqual([
      { aplicativo: 'CALCULADORA_REVESTIMENTO', ativo: true },
      { aplicativo: 'SMARTCALC', ativo: false },
    ]);
    expect(payload.aplicativos.some((app) => app.aplicativo === 'SMARTCALC_CONFIG')).toBeFalse();
  });

  it('ordena, adiciona, remove e reordena atalhos no payload', () => {
    setup();

    expect(component.atalhos.controls.map((control) => control.controls.nome.value)).toEqual(['Atalho A', 'Atalho B']);

    component.adicionarAtalho();
    component.atalhos.at(2).patchValue({ nome: 'Atalho C', url: 'https://c.example' });
    component.removerAtalho(1);
    component.form.markAsDirty();
    component.salvar();

    const payload = configuracaoService.salvar.calls.mostRecent().args[0] as ConfiguracaoAplicativos;
    expect(payload.atalhos.map((atalho) => ({ nome: atalho.nome, ordem: atalho.ordem }))).toEqual([
      { nome: 'Atalho A', ordem: 1 },
      { nome: 'Atalho C', ordem: 2 },
    ]);
  });

  it('atualiza baseline após salvar', fakeAsync(() => {
    setup();

    component.atalhos.at(0).controls.nome.setValue('Alterado B');
    component.form.markAsDirty();
    component.salvar();
    fixture.detectChanges();

    expect(component.atalhos.controls.map((control) => control.controls.nome.value)).toEqual(['Salvo']);

    component.atalhos.at(0).controls.nome.setValue('Alterado C');
    fixture.detectChanges();
    buttonByText('Cancelar')?.click();
    tick();

    expect(component.atalhos.controls.map((control) => control.controls.nome.value)).toEqual(['Salvo']);
  }));

  it('preserva dados digitados em erro de save', () => {
    setup();
    configuracaoService.salvar.and.returnValue(throwError(() => ({ userMessage: 'Falha ao salvar' })));

    component.atalhos.at(0).controls.nome.setValue('Alterado');
    component.form.markAsDirty();
    component.salvar();

    expect(component.atalhos.at(0).controls.nome.value).toBe('Alterado');
    expect(component.salvando).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('Falha ao salvar');
  });
});
