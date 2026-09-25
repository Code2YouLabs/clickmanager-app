import { Component, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { CalculadoraConfigService } from '../calculadora-config.service';
import { CalculadoraConfigResponse } from 'src/app/models/calculadora/calculadora-config-response.model';
import { CalculadoraConfigRequest } from 'src/app/models/calculadora/calculadora-config-request.model';
import { extrairMensagemErro } from 'src/app/utils/mensagem.util';
import { ProdutoOption } from 'src/app/models/produto/produto-option.model';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { DualListTransferComponent, DualListTransferItem } from 'src/app/components/dual-list-transfer/dual-list-transfer.component';
import { ProductIdentityComponent } from 'src/app/components/product-identity/product-identity.component';

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
      DualListTransferComponent,
      ProductIdentityComponent
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
    private router = inject(Router);

    carregando = signal<boolean>(true);
    salvando = signal<boolean>(false);
    erroCarregamento = false;
    isEditMode = false;

    produtoOptions: ProdutoOption[] = [];
    selecionados = new Set<number>();
    configAtual?: CalculadoraConfigResponse;
    private snapshot?: { ativo: boolean; selecionados: Set<number> };

    form = this.fb.nonNullable.group({
        ativo: this.fb.nonNullable.control<boolean>(true),
    });

    readonly formState = new PageFormState(() => this.form, {
        read: () => this.selecionados, write: value => this.selecionados = value,
    });
    get footerActions(): PageCardAction[] {
        return [{ id: 'salvar', label: 'Salvar', icon: 'save', type: 'submit', form: 'smartcalc-config-form', primary: true, disabled: this.salvarDesabilitado }];
    }

    ngOnInit(): void {
        this.formState.begin('edit');
        this.isEditMode = this.route.snapshot.routeConfig?.path?.includes('editar') ?? false;
        this.carregando.set(true);
        this.loadConfig();
    }

    private loadConfig(): void {
        this.calculadoraService.getConfigCompleta()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.carregando.set(false))
            )
            .subscribe({
                next: (res) => {
                    this.erroCarregamento = false;
                    this.configAtual = res?.config ?? undefined;
                    this.produtoOptions = res?.produtosDisponiveis ?? [];
                    this.selecionados = new Set(this.produtoOptions.filter(p => p.habilitado).map(p => p.id));
                    this.form.patchValue({
                        ativo: res?.config?.ativo ?? false,
                    });
                    this.registrarSnapshot();

                },
                error: (err) => {
                    this.erroCarregamento = true;
                    const msg = extrairMensagemErro(err, 'Não foi possível carregar as configurações.');
                    this.toastr.error(msg, 'SmartCalc');
                    this.produtoOptions = [];
                }
            });
    }


    onSubmit(): void {
        if (this.salvarDesabilitado) return;
        const formValue = this.form.getRawValue();

        const req: CalculadoraConfigRequest = {
            ativo: formValue.ativo,
            produtoGraficoIds: [...this.selecionados],
        };
        this.salvando.set(true);

        this.calculadoraService.salvar(req)
            .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.salvando.set(false)))
            .subscribe({
                next: (res) => {
                    this.configAtual = res.config ?? undefined;
                    this.produtoOptions = res.produtosDisponiveis;
                    this.selecionados = new Set(this.produtoOptions.filter(p => p.habilitado).map(p => p.id));
                    this.form.patchValue({ ativo: res.config?.ativo ?? formValue.ativo });
                    this.registrarSnapshot();
                    this.toastr.success('Configurações salvas com sucesso!', 'SmartCalc');
                },
                error: (err) => {
                    const msg = extrairMensagemErro(err, 'Não foi possível salvar as configurações.');
                    this.toastr.error(msg, 'SmartCalc');
                }
            });
    }

    get transferItems(): DualListTransferItem[] {
        return this.produtoOptions.map(produto => ({
            id: produto.id,
            label: produto.nome,
            searchText: [produto.materialNome, produto.formatoNome, produto.corNome, produto.codigo]
                .filter(Boolean).join(' '),
            group: produto.familiaNome || 'Sem família',
            status: produto.suportado ? 'PRONTO' : 'PRECISA_AJUSTE',
            details: produto.suportado ? [] : (produto.motivos || []).map(motivo => this.motivoTexto(motivo)),
            editRoute: produto.suportado ? undefined : ['/page/grafica/produtos', produto.id, 'editar'],
        }));
    }

    get selectedIds(): number[] {
        return [...this.selecionados];
    }

    atualizarSelecao(ids: number[]): void {
        this.selecionados = new Set(ids);
    }

    get salvarDesabilitado(): boolean {
        if (this.carregando() || this.erroCarregamento || this.salvando() || this.form.invalid || !this.snapshot) {
            return true;
        }
        return this.form.controls.ativo.value === this.snapshot.ativo
            && this.selecionados.size === this.snapshot.selecionados.size
            && [...this.selecionados].every(id => this.snapshot!.selecionados.has(id));
    }

    private registrarSnapshot(): void {
        this.formState.loaded();
        this.snapshot = {
            ativo: this.form.controls.ativo.value,
            selecionados: new Set(this.selecionados),
        };
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    produtoPorId(id: number): ProdutoOption | undefined {
        return this.produtoOptions.find(produto => produto.id === id);
    }

    motivoTexto(codigo: string): string {
        const mensagens: Record<string, string> = {
            EMPRESA_INVALIDA: 'Produto de outra empresa.',
            PRODUTO_INATIVO: 'Produto inativo.',
            FAMILIA_INVALIDA: 'Família do produto inválida.',
            CATALOGO_INDISPONIVEL: 'Catálogo indisponível ou orçamento desativado.',
            FORMATO_AUSENTE: 'Selecione um formato com dimensões físicas.',
            FORMATO_INVALIDO: 'O formato não pertence à empresa.',
            FORMATO_NAO_DIMENSIONAL: 'O formato não possui unidade dimensional.',
            DIMENSOES_INVALIDAS: 'O formato não possui largura e altura produtivas válidas.',
            PRECO_LOTE_NAO_SUPORTADO: 'Preço por lote ainda não é suportado no SmartCalc.',
            PRECO_FAIXA_NAO_SUPORTADO: 'Preço por faixa de quantidade ainda não é suportado no SmartCalc.',
            PRECO_AREA_NAO_SUPORTADO: 'Preço por metro quadrado ainda não é suportado no SmartCalc.',
            PRECO_FIXO_INDISPONIVEL: 'Configure um preço fixo válido para uma unidade da base.',
        };
        return mensagens[codigo] || 'Produto ainda não compatível com o SmartCalc.';
    }

    get tituloPagina(): string {
        return this.isEditMode ? 'Editar SmartCalc' : 'Configuração SmartCalc';
    }

    get textoAcaoPrincipal(): string {
        return this.salvando() ? 'Salvando...' : 'Salvar';
    }

    get resumoProdutosCurto(): string {
        const total = this.selecionados.size;
        return total === 1 ? '1 produto' : `${total} produtos`;
    }

    voltar(): void {
        this.router.navigate(['/smartcalc']);
    }

}
