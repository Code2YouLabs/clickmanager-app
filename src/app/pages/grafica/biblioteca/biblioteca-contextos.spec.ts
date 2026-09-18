import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { BibliotecaService } from './biblioteca.service';
import { BibliotecaDialogComponent } from './biblioteca-dialog.component';
import { BibliotecaProdutosSelectorComponent } from './biblioteca-produtos-selector.component';
import { HierarchyTreeComponent } from 'src/app/components/hierarchy-tree/hierarchy-tree.component';
import { OnboardingV2ProductsPageComponent } from '../../onboarding-v2/products-step/onboarding-v2-products-page.component';
import { OnboardingV2Service } from '../../onboarding-v2/services/onboarding-v2.service';
import { OnboardingV2StateService } from '../../onboarding-v2/services/onboarding-v2-state.service';
import { AuthService } from 'src/app/services/auth.service';

for (const host of [BibliotecaDialogComponent, OnboardingV2ProductsPageComponent]) {
  describe(`Biblioteca compartilhada em ${host.name}`, () => {
    it('inicia em árvore, expande ancestrais, alterna para detalhes e preserva seleção', async () => {
      await TestBed.configureTestingModule({
        imports: [host, NoopAnimationsModule],
        providers: [
          { provide: BibliotecaService, useValue: { ultima: () => of(null), listar: () => of([
            { id: 1, tipo: 'PRODUTO', nome: 'Vinil', categoria: 'Adesivos > Folha > Especial', formato: 'A4', tiposPreco: [], acabamentos: [], jaExiste: false },
          ]) } },
          { provide: MatDialogRef, useValue: { close: () => {} } },
          { provide: Router, useValue: jasmine.createSpyObj('Router',['navigateByUrl']) }, { provide: ToastrService, useValue: {} },
          { provide: OnboardingV2Service, useValue: { concluirBiblioteca: () => of({ currentStep: 'summary' }) } },
          { provide: AuthService, useValue: { isAuthenticated: () => true, getDefaultRouteForUsuario: () => "/painel" } },
          { provide: OnboardingV2StateService, useValue: { finishOnboarding: () => of({ currentStep: "summary", onboardingConcluido: true }), refreshProgress: () => of({ onboardingVersion: 'v2', currentStep: 'products', status: 'company_completed', tipoEmpresa: 'GRAFICA' }) } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(host as any);
      fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
      const selector = fixture.debugElement.query(By.directive(BibliotecaProdutosSelectorComponent)).componentInstance as BibliotecaProdutosSelectorComponent;
      expect(selector.modo).toBe('arvore');
      const tree = fixture.debugElement.query(By.directive(HierarchyTreeComponent)).componentInstance as HierarchyTreeComponent;
      expect(tree.treeControl.isExpanded(selector.arvore[0].children![0])).toBe(host !== OnboardingV2ProductsPageComponent);
      expect(tree.treeControl.isExpanded(selector.arvore[0])).toBe(host !== OnboardingV2ProductsPageComponent);
      const checkbox = fixture.nativeElement.querySelector('app-hierarchy-tree input[type="checkbox"]') as HTMLInputElement;
      checkbox.click(); fixture.detectChanges();
      expect(selector.selecionados.size).toBe(1);
      tree.treeControl.collapse(selector.arvore[0]); fixture.detectChanges();
      expect(tree.treeControl.isExpanded(selector.arvore[0])).toBeFalse();
      const buttons = fixture.nativeElement.querySelectorAll('mat-button-toggle button');
      buttons[1].click(); fixture.detectChanges();
      expect(selector.modo).toBe('detalhada');
      expect(fixture.nativeElement.querySelector('article input[type="checkbox"]').checked).toBeTrue();
      buttons[0].click(); fixture.detectChanges(); await fixture.whenStable();
      expect(selector.modo).toBe('arvore'); expect(selector.selecionados.size).toBe(1);
      if (host === OnboardingV2ProductsPageComponent) {
        const header = fixture.nativeElement.querySelector('.onboarding-shell__header') as HTMLElement;
        expect(header.querySelector('button')).toBeNull();
        expect(fixture.nativeElement.querySelector('.onboarding-shell__footer').textContent).toContain('Preparar meu catálogo');
        expect(fixture.nativeElement.querySelector('[aria-current="step"]').textContent).toContain('Seu catálogo');
        selector.termo = 'vinil'; fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
        const filteredTree = fixture.debugElement.query(By.directive(HierarchyTreeComponent)).componentInstance as HierarchyTreeComponent;
        expect(filteredTree.treeControl.isExpanded(selector.arvore[0])).toBeTrue();
        const api = TestBed.inject(BibliotecaService);
        spyOn(api, 'ultima').and.returnValue(of({ id: 1, status: 'CONCLUIDO', fase: 'CONCLUIDO', total: 1, processados: 1,
          criados: 1, duplicados: 0, erros: 0, tempoEstimadoRestanteSegundos: null, itens: [] }));
        selector.reconectar(); await fixture.whenStable(); fixture.detectChanges();
        expect(header.textContent).toContain('100%');
        expect(header.querySelectorAll('li.complete').length).toBe(3);
        expect(fixture.nativeElement.textContent).not.toContain('Quais produtos você oferece?');
        const entrar = fixture.nativeElement.querySelector('.onboarding-page__completion-action button') as HTMLButtonElement;
        expect(entrar.textContent).toContain('Entrar no ClickManager');
        expect(entrar.disabled).toBeFalse(); entrar.click();
        expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/painel');
      }
      fixture.destroy();
    });
  });
}
