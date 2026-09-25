import { FormBuilder } from '@angular/forms';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { GraficaCorFormComponent } from '../cores/grafica-cor-form.component';
import { GraficaMaterialFormComponent } from '../materiais/grafica-material-form.component';
import { GraficaFormatoFormComponent } from '../formatos/grafica-formato-form.component';
import { GraficaCategoriaFormComponent } from '../categorias/grafica-categoria-form.component';
import { GraficaServicoFormComponent } from '../servicos/grafica-servico-form.component';
import { GraficaCadastroListComponent } from './grafica-cadastro-list.component';

// Verifica a integração real dos consumidores com o comando do PageCard.
describe('PageCard — cancelamento dos cadastros gráficos', () => {
  for (const Component of [GraficaCorFormComponent, GraficaMaterialFormComponent, GraficaFormatoFormComponent, GraficaCategoriaFormComponent, GraficaServicoFormComponent]) {
    for (const mode of ['create', 'edit', 'clone']) {
      it(`${Component.name}: ${mode} usa a mesma regra compartilhada`, () => {
        const original = { id: 1, nome: 'Backend', descricao: 'Descrição', politicas: [{ tipo: 'FIXO', valorFixo: 25 }] };
        const service: any = {
          listarCores: () => of([original]), listarMateriais: () => of([original]),
          listarFormatos: () => of([original]), listarServicos: () => of([original]),
          options: () => of([]), detalhar: () => of(original),
        };
        const route: any = { paramMap: of(convertToParamMap(mode === 'edit' ? { id: '1' } : {})), snapshot: { queryParamMap: convertToParamMap(mode === 'clone' ? { cloneFrom: '1' } : {}) } };
        const router: any = { navigate: jasmine.createSpy('navigate') };
        const component = new Component(new FormBuilder(), service, route, router, { error: jasmine.createSpy('error') } as any);
        component.ngOnInit(); component.form.patchValue({ nome: 'Alterado' });
        const card = new PageCardComponent(); card.formState = component.formState;
        card.onFooterAction(card.resolvedFooterActions[0]);
        expect(component.form.getRawValue().nome).toBe(mode === 'edit' ? 'Backend' : '');
        expect(component.form.pristine).toBeTrue(); expect(router.navigate).not.toHaveBeenCalled();
      });
    }
  }
  it('cadastro genérico troca entre editar, novo e clonar sem reaproveitar a base errada', () => {
    const component = new GraficaCadastroListComponent(new FormBuilder(), {} as any, {} as any, {} as any, {} as any,
      { open: () => ({ afterClosed: () => of(true) }) } as any);
    const card = new PageCardComponent(); card.formState = component.formState;
    component.novo(); component.form.patchValue({ nome: 'Novo' }); card.onFooterAction(card.resolvedFooterActions[0]);
    expect(component.form.controls.nome.value).toBe('');
    component.editar({ id: 1, nome: 'Backend' } as any); component.form.patchValue({ nome: 'Alterado' });
    card.onFooterAction(card.resolvedFooterActions[0]); expect(component.form.controls.nome.value).toBe('Backend');
    component.clonar({ id: 1, nome: 'Backend' } as any); card.onFooterAction(card.resolvedFooterActions[0]);
    expect(component.form.controls.nome.value).toBe('');
  });
});
