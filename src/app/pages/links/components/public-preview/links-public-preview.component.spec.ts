import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LinksPublicPreviewComponent } from './links-public-preview.component';

describe('LinksPublicPreviewComponent', () => {
  let fixture: ComponentFixture<LinksPublicPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LinksPublicPreviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(LinksPublicPreviewComponent);
    fixture.componentRef.setInput('model', {
      titulo: 'Links',
      descricao: 'Descrição',
      identidade: { nome: 'Empresa', slug: 'empresa', logoUrl: 'https://cdn/logo.png' },
      tema: 'CLARO',
      corPrincipal: '#112233',
      corFundo: '#FFFFFF',
      formatoBotao: 'QUADRADO',
      itens: [
        { id: 2, tipo: 'LINK', titulo: 'Inativo', subtitulo: null, url: 'https://example.com/2', ordem: 0, ativo: false, createdAt: '', updatedAt: '' },
        { id: 1, tipo: 'WHATSAPP', titulo: 'WhatsApp', subtitulo: 'Atendimento', url: 'https://example.com/1', ordem: 1, ativo: true, createdAt: '', updatedAt: '' },
      ],
    });
    fixture.detectChanges();
  });

  it('renderiza somente links ativos e aplica aparencia segura', () => {
    expect(fixture.nativeElement.textContent).toContain('WhatsApp');
    expect(fixture.nativeElement.textContent).toContain('Atendimento');
    expect(fixture.nativeElement.textContent).not.toContain('Abrir');
    expect(fixture.nativeElement.textContent).not.toContain('Inativo');
    expect(fixture.nativeElement.querySelector('.clicklink-preview__link-icon mat-icon')?.textContent.trim()).toBe('chat');
    expect(fixture.componentInstance.estilosPagina()['--clicklink-primary']).toBe('#112233');
    expect(fixture.componentInstance.estilosPagina()['--clicklink-radius']).toBe('8px');
    expect(fixture.componentInstance.estilosPagina()['--clicklink-surface']).toBe('rgba(255, 255, 255, 0.94)');
    expect(fixture.componentInstance.estilosPagina()['--clicklink-logo-gradient-start']).toBe('rgba(255, 255, 255, 0.82)');
    expect(fixture.nativeElement.querySelector('.clicklink-preview__logo')?.getAttribute('src')).toBe('https://cdn/logo.png');
  });

  it('usa os mesmos tokens principais do renderer publico', () => {
    fixture.componentRef.setInput('model', {
      titulo: 'Links',
      descricao: null,
      identidade: null,
      tema: 'CLARO',
      corPrincipal: '#F8FAFC',
      corFundo: '#FFFFFF',
      formatoBotao: 'ARREDONDADO',
      itens: [],
    });
    const claro = fixture.componentInstance.estilosPagina();

    fixture.componentRef.setInput('model', {
      titulo: 'Links',
      descricao: null,
      identidade: null,
      tema: 'ESCURO',
      corPrincipal: '#F8FAFC',
      corFundo: '#FFFFFF',
      formatoBotao: 'ARREDONDADO',
      itens: [],
    });
    const escuro = fixture.componentInstance.estilosPagina();

    expect(claro['--clicklink-text']).toBe('#101828');
    expect(escuro['--clicklink-text']).toBe('#F8FAFC');
    expect(escuro['--clicklink-primary']).toBe('#F8FAFC');
    expect(escuro['--clicklink-surface']).toBe('rgba(15, 23, 42, 0.84)');
    expect(escuro['--clicklink-surface-text']).toBe('#F8FAFC');
    expect(escuro['--clicklink-logo-gradient-start']).toBe('rgba(15, 23, 42, 0.88)');
  });

  it('omite nome da empresa quando repete o titulo normalizado', () => {
    fixture.componentRef.setInput('model', {
      titulo: ' Empresa ',
      descricao: null,
      identidade: { nome: 'empresa', slug: 'empresa', logoUrl: null },
      tema: 'CLARO',
      corPrincipal: '#FF0000',
      corFundo: '#0057B8',
      formatoBotao: 'ARREDONDADO',
      itens: [],
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.deveExibirEmpresa()).toBeFalse();
    expect((fixture.nativeElement.textContent.match(/Empresa/gi) || []).length).toBe(1);
    expect(fixture.componentInstance.estilosPagina()['--clicklink-text']).toBe('#FFFFFF');
    expect(fixture.componentInstance.estilosPagina()['--clicklink-radius']).toBe('28px');
  });
});
