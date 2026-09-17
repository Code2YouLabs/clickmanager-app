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
          { provide: BibliotecaService, useValue: { listar: () => of([
            { id: 1, tipo: 'PRODUTO', nome: 'Vinil', categoria: 'Adesivos > Folha > Especial', formato: 'A4', tiposPreco: [], acabamentos: [], jaExiste: false },
          ]) } },
          { provide: MatDialogRef, useValue: { close: () => {} } },
          { provide: Router, useValue: {} }, { provide: ToastrService, useValue: {} },
          { provide: OnboardingV2Service, useValue: {} },
          { provide: AuthService, useValue: { isAuthenticated: () => true } },
          { provide: OnboardingV2StateService, useValue: { refreshProgress: () => of({ onboardingVersion: 'v2', currentStep: 'products', status: 'company_completed', tipoEmpresa: 'GRAFICA' }) } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(host as any);
      fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
      const selector = fixture.debugElement.query(By.directive(BibliotecaProdutosSelectorComponent)).componentInstance as BibliotecaProdutosSelectorComponent;
      expect(selector.modo).toBe('arvore');
      const tree = fixture.debugElement.query(By.directive(HierarchyTreeComponent)).componentInstance as HierarchyTreeComponent;
      expect(tree.treeControl.isExpanded(selector.arvore[0].children![0])).toBeTrue();
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
        const layout = fixture.nativeElement.querySelector('.onboarding-page-layout') as HTMLElement;
        const header = fixture.nativeElement.querySelector('.onboarding-shell__header') as HTMLElement;
        expect(header.querySelector('nav button[mat-flat-button]')!.textContent).toContain('Continuar');
        expect(fixture.nativeElement.querySelector('.onboarding-shell__footer')).toBeNull();
        const spacer = document.createElement('div');
        spacer.style.height = '2000px';
        fixture.nativeElement.querySelector('.onboarding-shell__content').appendChild(spacer);
        layout.scrollTop = 300;
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const top = header.getBoundingClientRect().top - layout.getBoundingClientRect().top;
        expect(layout.scrollTop).toBe(300);
        expect(top).toBeGreaterThanOrEqual(0);
        expect(top).toBeLessThanOrEqual(16);
      }
      fixture.destroy();
    });
  });
}
