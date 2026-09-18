import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material.module';
import { PageCardComponent } from './page-card.component';

@Component({
  standalone: true,
  imports: [PageCardComponent, MaterialModule],
  template: `
    <app-page-card
      titulo="Produtos gráficos"
      subtitulo="Configuração de venda"
      [showFooter]="showFooter"
      [headerDivider]="headerDivider"
      [footerDivider]="footerDivider">
      <button page-header-actions mat-button>Nova ação</button>
      <div class="body-content">Conteúdo principal</div>
      <button page-footer-left mat-button>Cancelar</button>
      <button page-footer-right mat-flat-button>Salvar</button>
    </app-page-card>
  `,
})
class PageCardHostComponent {
  showFooter = false;
  headerDivider = true;
  footerDivider = true;
}

describe('PageCardComponent', () => {
  let fixture: ComponentFixture<PageCardHostComponent>;
  let host: PageCardHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PageCardHostComponent, NoopAnimationsModule],
    });

    fixture = TestBed.createComponent(PageCardHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('projeta titulo, subtitulo, acoes de header e conteudo principal', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Produtos gráficos');
    expect(text).toContain('Configuração de venda');
    expect(text).toContain('Nova ação');
    expect(text).toContain('Conteúdo principal');
    expect(fixture.debugElement.query(By.css('.page-card__footer'))).toBeNull();
  });

  it('renderiza footer em areas esquerda e direita quando habilitado', () => {
    host.showFooter = true;
    fixture.detectChanges();

    const footer = fixture.debugElement.query(By.css('.page-card__footer'));
    expect(footer).not.toBeNull();
    expect(footer.query(By.css('.page-card__footer-left')).nativeElement.textContent).toContain('Cancelar');
    expect(footer.query(By.css('.page-card__footer-right')).nativeElement.textContent).toContain('Salvar');
  });

  it('controla divisores de header e footer separadamente', () => {
    host.showFooter = true;
    host.headerDivider = false;
    host.footerDivider = false;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-card-header mat-divider'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.page-card__footer-divider'))).toBeNull();
  });
});
