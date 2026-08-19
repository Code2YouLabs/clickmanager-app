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
      identidade: { nome: 'Empresa', slug: 'empresa', logoUrl: null },
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
    expect(fixture.nativeElement.textContent).not.toContain('Inativo');
    expect(fixture.componentInstance.estilosPagina()['--clicklink-primary']).toBe('#112233');
    expect(fixture.componentInstance.estilosPagina()['--clicklink-radius']).toBe('6px');
  });

  it('diferencia tema claro e escuro sem depender apenas da cor de fundo', () => {
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

    expect(claro['--clicklink-surface']).toBe('#FFFFFF');
    expect(escuro['--clicklink-surface']).toBe('#111827');
    expect(claro['--clicklink-surface-text']).not.toBe(escuro['--clicklink-surface-text']);
    expect(escuro['--clicklink-primary']).toBe('#F8FAFC');
    expect(escuro['--clicklink-button-text']).toBe('#101828');
  });
});
