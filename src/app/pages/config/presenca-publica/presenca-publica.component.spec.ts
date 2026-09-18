import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { PresencaPublicaComponent } from './presenca-publica.component';
import { PresencaPublicaService } from './presenca-publica.service';

describe('PresencaPublicaComponent', () => {
  let fixture: ComponentFixture<PresencaPublicaComponent>;
  let service: jasmine.SpyObj<PresencaPublicaService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<PresencaPublicaService>('PresencaPublicaService', [
      'buscar',
      'consultarSlugDisponivel',
      'alterarSlug',
      'configurarDominioProprio',
      'removerDominioProprio',
    ]);
    service.buscar.and.returnValue(of({
      slugPublico: 'santa-luzia',
      dominioProprio: 'santaluzia.com.br',
      dominioProprioAtivo: true,
    }));
    service.consultarSlugDisponivel.and.returnValue(of({ slug: 'nova-loja', disponivel: true }));
    service.alterarSlug.and.returnValue(of({
      slugPublico: 'nova-loja',
      dominioProprio: 'santaluzia.com.br',
      dominioProprioAtivo: true,
    }));
    service.configurarDominioProprio.and.returnValue(service.buscar());
    service.removerDominioProprio.and.returnValue(of({
      slugPublico: 'santa-luzia',
      dominioProprio: null,
      dominioProprioAtivo: false,
    }));

    TestBed.configureTestingModule({
      imports: [PresencaPublicaComponent, NoopAnimationsModule],
      providers: [
        { provide: PresencaPublicaService, useValue: service },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error']) },
      ],
    });
    fixture = TestBed.createComponent(PresencaPublicaComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('mostra endereco ClickManager editavel com dominio fixo', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('santa-luzia.clickmanager.com.br');
    expect(fixture.componentInstance.slugControl.value).toBe('santa-luzia');
    expect(fixture.componentInstance.dominioControl.value).toBe('santaluzia.com.br');
    expect(text).toContain('Ativo');
    expect(text).toContain('.clickmanager.com.br');
    expect(text).not.toContain('DNS verificado');
    expect(text).not.toContain('SSL emitido');
  });

  it('consulta disponibilidade do slug normalizado antes de salvar', () => {
    fixture.componentInstance.slugControl.setValue('Nova Loja');

    fixture.componentInstance.consultarSlug();

    expect(fixture.componentInstance.slugControl.value).toBe('nova-loja');
    expect(service.consultarSlugDisponivel).toHaveBeenCalledWith('nova-loja');
    expect(fixture.componentInstance.slugConsultado).toEqual({ slug: 'nova-loja', disponivel: true });
  });

  it('altera slug apenas depois de disponibilidade confirmada', () => {
    fixture.componentInstance.slugControl.setValue('nova-loja');

    fixture.componentInstance.salvarSlug();

    expect(service.alterarSlug).not.toHaveBeenCalled();

    fixture.componentInstance.slugConsultado = { slug: 'nova-loja', disponivel: true };
    fixture.componentInstance.salvarSlug();

    expect(service.alterarSlug).toHaveBeenCalledWith({ slug: 'nova-loja' });
    expect(fixture.componentInstance.slugControl.value).toBe('nova-loja');
  });

  it('configura dominio proprio atual', () => {
    fixture.componentInstance.dominioControl.setValue('https://novo.com.br/site');
    fixture.componentInstance.ativoControl.setValue(true);

    fixture.componentInstance.salvarDominio();

    expect(service.configurarDominioProprio).toHaveBeenCalledWith({
      dominio: 'novo.com.br',
      ativo: true,
    });
  });
});
