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
});
