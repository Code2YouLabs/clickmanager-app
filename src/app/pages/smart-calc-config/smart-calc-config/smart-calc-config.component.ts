import { Component, HostListener, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { CalculadoraConfigService } from '../calculadora-config.service';
import { CalculadoraConfigResponse } from 'src/app/models/calculadora/calculadora-config-response.model';
import { CalculadoraConfigRequest } from 'src/app/models/calculadora/calculadora-config-request.model';
import { extrairMensagemErro } from 'src/app/utils/mensagem.util';
import { ProdutoOption } from 'src/app/models/produto/produto-option.model';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { InputMultiSelectComponent } from 'src/app/components/inputs/input-multi-select/input-multi-select-component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';

@Component({
    selector: 'app-calculadora-config',
    standalone: true,
    imports: [
      CommonModule,
      ReactiveFormsModule,
      MatSlideToggleModule,
      MatButtonModule,
      MatProgressSpinnerModule,
      MatIconModule,
      RouterModule,
      PageCardComponent,
      SectionCardComponent,
      InputMultiSelectComponent,
      MobileTotalBarComponent
    ],
    templateUrl: './smart-calc-config.component.html',
    styleUrls: ['./smart-calc-config.component.scss']
})
export class CalculadoraConfigComponent implements OnInit {
    private fb = inject(FormBuilder);
    private destroyRef = inject(DestroyRef);
    private calculadoraService = inject(CalculadoraConfigService);
    private toastr = inject(ToastrService);
    private route = inject(ActivatedRoute);

    carregando = signal<boolean>(true);
    salvando = signal<boolean>(false);
    isMobileView = false;
    isEditMode = false;

    produtoOptions: ProdutoOption[] = [];
    configAtual?: CalculadoraConfigResponse;

    form = this.fb.nonNullable.group({
        ativo: this.fb.nonNullable.control<boolean>(true),
        produtoIds: this.fb.nonNullable.control<number[]>([]),
    });

    ngOnInit(): void {
        this.atualizarViewport();
        this.isEditMode = this.route.snapshot.routeConfig?.path?.includes('editar') ?? false;
        this.carregando.set(true);
        this.loadConfig();
    }

    @HostListener('window:resize')
    onWindowResize(): void {
        this.atualizarViewport();
    }

    private loadConfig(): void {
        const t0 = performance.now();

        this.calculadoraService.getConfigCompleta()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.carregando.set(false))
            )
            .subscribe({
                next: (res) => {
                    this.configAtual = res?.config ?? undefined;
                    this.produtoOptions = res?.produtosDisponiveis ?? [];
                    const idsDisponiveis = new Set(this.produtoOptions.map((produto) => produto.id));
                    const produtos = res?.config?.produtos ?? [];

                    const produtoIds = produtos
                        .map(p => p?.id)
                        .filter((id): id is number => typeof id === 'number' && idsDisponiveis.has(id));

                    this.form.patchValue({
                        ativo: res?.config?.ativo ?? false,
                        produtoIds,
                    });

                },
                error: (err) => {
                    const msg = extrairMensagemErro(err, 'Não foi possível carregar as configurações.');
                    this.toastr.error(msg, 'SmartCalc');
                    this.produtoOptions = [];
                },
                complete: () => {
                    const t1 = performance.now();
                }
            });
    }


    private mapNomesToIds(nomes?: string[]): number[] {
        if (!nomes?.length) return [];
        const byName = new Map(this.produtoOptions.map(p => [p.nome, p.id]));
        return nomes.map(n => byName.get(n)).filter((v): v is number => typeof v === 'number');
    }

    onSubmit(): void {
        const formValue = this.form.getRawValue();
        if (formValue.ativo && (!formValue.produtoIds || formValue.produtoIds.length === 0)) {
            this.toastr.warning('Para habilitar o SmartCalc, selecione ao menos um produto.');
            this.form.markAllAsTouched();
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const req: CalculadoraConfigRequest = formValue;
        this.salvando.set(true);

        this.calculadoraService.salvar(req)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.configAtual = res ?? undefined;
                    this.toastr.success('Configurações salvas com sucesso!', 'SmartCalc');
                },
                error: (err) => {
                    const msg = extrairMensagemErro(err, 'Não foi possível salvar as configurações.');
                    this.toastr.error(msg, 'SmartCalc');
                },
                complete: () => this.salvando.set(false)
            });
    }

    trackById = (_: number, item: ProdutoOption) => item.id;

    get tituloPagina(): string {
        return this.isEditMode ? 'Editar SmartCalc' : 'Configuração SmartCalc';
    }

    get textoAcaoPrincipal(): string {
        return this.salvando() ? 'Salvando...' : 'Salvar';
    }

    get resumoProdutos(): string {
        const total = this.produtoIdsControl.value?.length ?? 0;
        return total === 1 ? '1 produto habilitado' : `${total} produtos habilitados`;
    }

    get resumoProdutosCurto(): string {
        const total = this.produtoIdsControl.value?.length ?? 0;
        return total === 1 ? '1 produto' : `${total} produtos`;
    }

    get produtoIdsControl(): FormControl<number[]> {
        return this.form.get('produtoIds') as FormControl<number[]>;
    }

    voltar(): void {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();
            return;
        }
    }

    private atualizarViewport(): void {
        if (typeof window === 'undefined') {
            return;
        }

        this.isMobileView = window.innerWidth <= 768;
    }
}
