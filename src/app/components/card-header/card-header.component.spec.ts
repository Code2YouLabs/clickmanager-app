import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CardHeaderComponent } from './card-header.component';
import { AuthService } from 'src/app/services/auth.service';
@Component({ standalone: true, imports: [CardHeaderComponent], template: `<app-card-header titulo="Produtos" subtitulo="Configuração"
  botaoTexto="Novo" botaoRota="/novo" helpRota="/ajuda" [actionDisabled]="disabled" [actionPending]="pending" [permissao]="permission">
  <button class="extra" type="button">Biblioteca</button></app-card-header>` })
class Host { disabled = false; pending = false; permission = ''; }
describe('CardHeaderComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host, NoopAnimationsModule], providers: [provideRouter([]), { provide: AuthService, useValue: { temPermissao: () => false } }] }));
  afterEach(() => TestBed.resetTestingModule());
  it('preserva titulo, subtitulo, ajuda e acoes projetadas com semantica de heading', () => {
    const f = TestBed.createComponent(Host); f.detectChanges();
    expect(f.nativeElement.querySelector('[role=heading]').textContent).toContain('Produtos');
    expect(f.nativeElement.textContent).toContain('Configuração'); expect(f.nativeElement.querySelector('.extra')).toBeTruthy();
    expect(f.nativeElement.querySelector('a[aria-label=Ajuda]').getAttribute('href')).toBe('/ajuda');
    expect(f.nativeElement.querySelector('button[mat-stroked-button]').type).toBe('button');
  });
  it('bloqueia acao configurada por disabled/pending sem alterar projecoes', () => {
    const f = TestBed.createComponent(Host); f.componentInstance.disabled = true; f.detectChanges();
    expect(f.nativeElement.querySelector('button[mat-stroked-button]').disabled).toBeTrue();
    f.componentInstance.disabled = false; f.componentInstance.pending = true; f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Aguarde...');
    expect(f.nativeElement.querySelector('.extra').disabled).toBeFalse();
  });
  it('mantem verificacao de permissao da acao configurada', () => {
    const f = TestBed.createComponent(Host); f.componentInstance.permission = 'CRIAR'; f.detectChanges();
    expect(f.nativeElement.querySelector('button[mat-stroked-button]')).toBeNull();
  });
});
