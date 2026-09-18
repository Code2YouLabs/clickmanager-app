import { TestBed } from '@angular/core/testing';
import { ProductIdentityComponent } from './product-identity.component';

describe('ProductIdentityComponent', () => {
  it('exibe nome e material, formato e cor sem valores vazios', () => {
    const fixture = TestBed.createComponent(ProductIdentityComponent);
    fixture.componentInstance.name = 'Adesivo Vinil';
    fixture.componentInstance.material = 'Vinil Branco Brilho';
    fixture.componentInstance.format = 'SRA3';
    fixture.componentInstance.color = 'Colorido Frente (4x0)';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Adesivo Vinil');
    expect(fixture.nativeElement.textContent).toContain('Vinil Branco Brilho · SRA3 · Colorido Frente (4x0)');

    fixture.componentInstance.material = null;
    fixture.componentInstance.color = '  ';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SRA3');
    expect(fixture.nativeElement.textContent).not.toContain('null');
    expect(fixture.nativeElement.textContent).not.toContain(' · ');
  });
});
