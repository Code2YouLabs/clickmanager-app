import { Component, ElementRef, HostListener, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCard } from '@angular/material/card';

import { InputMultiSelectComponent } from 'src/app/components/inputs/input-multi-select/input-multi-select-component';
import { InputNumericoComponent } from 'src/app/components/inputs/input-numerico/input-numerico.component';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';

import { SmartCalcInitDataService } from './smart-calc-init-data.service';
import { SmartCalcDataService } from './smart-calc-data.service'; // (por enquanto mantém cálculo + pedido aqui)
import { SmartCalcRequest } from 'src/app/models/smart-calc/smart-calc-request.model';
import { SmartCalcItem } from 'src/app/models/smart-calc/smart-calc-item.model';
import { SmartCalcResultado } from 'src/app/models/smart-calc/smart-calc-resultado.model';

import { SmartCalcInitResponse, ProdutoSmartCalcInitResponse, ProdutoVariacaoSmartCalcInitResponse } from 'src/app/models/smart-calc/init/smartcalc-init.model';
import { ProdutoListagem } from 'src/app/models/produto/produto-listagem.model';

import { ToastrService } from 'ngx-toastr';
import { Subject, finalize, debounceTime, takeUntil } from 'rxjs';

import { Router } from '@angular/router';

import { CalculadoraConfigService } from 'src/app/pages/smart-calc-config/calculadora-config.service';
import { CalculadoraConfigResponse } from 'src/app/models/calculadora/calculadora-config-response.model';
import { extrairMensagemErro } from 'src/app/utils/mensagem.util';

type Material = { id: number; nome: string; descricao?: string };
type Acabamento = { id: string; nome: string };

@Component({
  selector: 'app-smart-calc',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    InputMultiSelectComponent,
    InputNumericoComponent,
    InputOptionsComponent,
    MobileTotalBarComponent,
    MatCard,
  ],
  templateUrl: './smart-calc.component.html',
  styleUrls: ['./smart-calc.component.scss'],
})
export class SmartCalcComponent implements OnInit, OnDestroy {
  // =========================
  // INIT (tela)
  // =========================
  init: SmartCalcInitResponse | null = null;

  // produtos exibidos no select (mantém ProdutoListagem só pra não mexer no HTML)
  produtos: ProdutoListagem[] = [];

  // produto do init selecionado
  produtoInitSelecionado: ProdutoSmartCalcInitResponse | null = null;

  // mapa: materialId -> variacoes do init
  private variacoesPorMaterialInit = new Map<number, ProdutoVariacaoSmartCalcInitResponse[]>();

  // (para pedido) variação escolhida para o material atual
  materiais: Material[] = [];
  acabamentos: Acabamento[] = [];

  carregandoProdutos = false;
  erroProdutos: string | null = null;
  carregandoCalculo = false;
  erroCalculo: string | null = null;
  carregandoAdd = false;
  needsRecalcular = signal(false);
  animandoResultado = signal(false);
  mobileViewport = signal(false);
  resultadoMobileAberto = signal(false);
  private readonly recalculo$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private calculoRequestId = 0;
  private focoInicialAplicado = false;
  private gestoSheetStartY: number | null = null;

  // =========================
  // FORM
  // =========================
  form!: FormGroup<{
    largura: FormControl<number | null>;
    altura: FormControl<number | null>;
    quantidade: FormControl<number | null>;
    produtoId: FormControl<number | null>;
    materialId: FormControl<number | null>;
    acabamentosIds: FormControl<string[]>;
    permiteRotacao: FormControl<boolean>;
  }>;

  // =========================
  // RESULTADO (core)
  // =========================
  resultado = signal<SmartCalcResultado | null>(null);
  itens = computed<SmartCalcItem[]>(() => this.resultado()?.itens ?? []);
  observacao = computed<string | undefined>(() => this.resultado()?.observacao);
  total = computed<number>(() => this.resultado()?.total ?? 0);
  melhor = computed<SmartCalcItem | null>(() => this.itens()[0] ?? null);
  temResultado = computed<boolean>(() => !!this.resultado() && this.itens().length > 0);

  // =========================
  // CONFIG (tela config antiga)
  // =========================
  config?: CalculadoraConfigResponse | null;
  private allowedProductIds = new Set<number>();
  configAtiva = false;

  constructor(
    private fb: FormBuilder,
    private initSvc: SmartCalcInitDataService, // ✅ NOVO: só init
    private dataSvc: SmartCalcDataService, // ✅ por enquanto mantém cálculo + pedido aqui
    private toastr: ToastrService,
    private router: Router,
    private calcCfgSvc: CalculadoraConfigService,
    private host: ElementRef<HTMLElement>
  ) { }

  ngOnInit(): void {
    this.atualizarViewport();

    // 1) cria o form
    this.form = this.fb.group({
      largura: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
      altura: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
      quantidade: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
      produtoId: this.fb.control<number | null>(null, [Validators.required]),
      materialId: this.fb.control<number | null>(null),
      acabamentosIds: this.fb.nonNullable.control<string[]>([]),
      permiteRotacao: this.fb.nonNullable.control(true),
    });

    this.recalculo$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.calcular(true));

    this.agendarFocoInicial();

    // 2) listeners
    this.form.controls.produtoId.valueChanges.subscribe((id) => {
      if (id) {
        this.carregarProdutoInit(id);
      } else {
        this.resetProdutoDependencias();
      }
    });

    this.form.controls.materialId.valueChanges.subscribe((mid) => {
      this.atualizarListasPorMaterial(mid ?? undefined);
      // ⚠️ regra METRO/LINEAR depende de preço; no INIT atual não vem preço
      // deixe por enquanto sem travar largura, ou ajuste quando o init passar preço.
      this.aplicarModoCobrancaRegraLargura();
    });

    this.form.valueChanges.subscribe(() => {
      if (!this.configAtiva || this.carregandoProdutos) {
        return;
      }

      this.erroCalculo = null;

      if (!this.temParametrosMinimosParaCalcular()) {
        this.calculoRequestId++;
        this.carregandoCalculo = false;
        this.resultado.set(null);
        this.needsRecalcular.set(false);
        return;
      }

      this.needsRecalcular.set(true);
      this.recalculo$.next();
    });

    // 3) carrega configuração (whitelist)
    this.calcCfgSvc.getConfig().subscribe({
      next: (cfg) => {
        this.config = cfg;
        this.configAtiva = !!cfg?.ativo;

        this.allowedProductIds.clear();
        for (const p of (cfg?.produtos ?? [])) {
          if (p?.id != null) this.allowedProductIds.add(p.id);
        }

        if (!this.configAtiva) {
          this.toastr.warning('O SmartCalc está desabilitado nas configurações.', 'SmartCalc');
        }

        // 4) carrega INIT (produtos + variações + materiais/acabamentos)
        this.carregarInit();
      },
      error: (err) => {
        console.error('[SmartCalc] erro ao obter config', err);
        // sem config -> não trava a tela
        this.configAtiva = true;
        this.carregarInit();
      },
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    this.destroy$.next();
    this.destroy$.complete();
    this.recalculo$.complete();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  // ==========================================================
  // INIT: Carregamento da tela
  // ==========================================================
  private carregarInit(): void {
    this.carregandoProdutos = true;
    this.erroProdutos = null;

    this.initSvc.carregarInit$().subscribe({
      next: (init) => {
        this.init = init;
        // se o init vier desativado, respeita também
        // (mantém compatibilidade com sua configAtiva)
        this.configAtiva = this.configAtiva && !!init?.ativo;

        let arr = (init?.produtos ?? []).map(
          (p) => ({ id: p.id, nome: p.nome } as unknown as ProdutoListagem)
        );

        if (this.allowedProductIds.size > 0) {
          arr = arr.filter((p) => this.allowedProductIds.has(p.id));
        }

        this.produtos = arr;

        if (!this.form.controls.produtoId.value) {
          this.form.controls.produtoId.setValue(null, { emitEvent: false });
        }

        if (!this.configAtiva) {
          this.form.disable({ emitEvent: false });
        } else {
          this.form.enable({ emitEvent: false });
        }

        this.agendarFocoInicial();

        this.carregandoProdutos = false;
      },
      error: (err) => {
        console.error('Erro ao carregar init', err);
        this.erroProdutos = 'Não foi possível carregar a SmartCalc (init).';
        this.carregandoProdutos = false;
      },
    });
  }

  private resetProdutoDependencias(): void {
    this.calculoRequestId++;
    this.carregandoCalculo = false;
    this.produtoInitSelecionado = null;
    this.resultado.set(null);
    this.needsRecalcular.set(false);

    this.acabamentos = [];
    this.materiais = [];

    this.variacoesPorMaterialInit.clear();

    this.form.controls.materialId.setValue(null, { emitEvent: false });
    this.form.controls.acabamentosIds.setValue([], { emitEvent: false });

    this.form.controls.largura.setValue(null, { emitEvent: false });
    this.form.controls.altura.setValue(null, { emitEvent: false });
    this.form.controls.quantidade.setValue(null, { emitEvent: false });

    this.aplicarModoCobrancaRegraLargura();
  }


  private carregarProdutoInit(produtoId: number): void {
    // limpa estado dependente
    this.resultado.set(null);
    this.needsRecalcular.set(false);
    this.acabamentos = [];
    this.materiais = [];
    this.variacoesPorMaterialInit.clear();
    this.form.controls.materialId.setValue(null, { emitEvent: false });

    const prod = (this.init?.produtos ?? []).find((p) => p.id === produtoId) ?? null;
    this.produtoInitSelecionado = prod;

    if (!prod) {
      this.atualizarListasPorMaterial(undefined);
      return;
    }

    // monta map material -> variacoes
    this.variacoesPorMaterialInit = this.initSvc.mapVariacoesPorMaterial(prod);

    // materiais
    this.materiais = this.initSvc.extrairMateriaisBasicos(this.variacoesPorMaterialInit);

    if (this.materiais.length) {
      const firstId = this.materiais[0].id;
      this.form.controls.materialId.setValue(firstId, { emitEvent: false });
      this.atualizarListasPorMaterial(firstId);
    } else {
      this.atualizarListasPorMaterial(undefined);
    }

    this.aplicarModoCobrancaRegraLargura();
    this.form.controls.largura.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }

  private atualizarListasPorMaterial(materialId?: number): void {
    // acabamentos do INIT filtrados por material
    const novosAcab = this.initSvc
      .extrairAcabamentosPorMaterial(this.variacoesPorMaterialInit, materialId)
      .map((a) => ({ id: String(a.id), nome: a.nome }));

    this.acabamentos = novosAcab;

    // remove seleções inválidas
    const selAcab = (this.form.controls.acabamentosIds.value ?? []).filter((id) =>
      this.acabamentos.some((a) => a.id === id)
    );

    if (selAcab.length !== (this.form.controls.acabamentosIds.value ?? []).length) {
      this.form.controls.acabamentosIds.setValue(selAcab);
    }
  }

  // ==========================================================
  // CORE: cálculo (por enquanto fica no dataSvc antigo)
  // ==========================================================
  calcular(automatico = false): void {
    if (!this.configAtiva) {
      return;
    }
    if (!this.temParametrosMinimosParaCalcular()) return;

    const payload = this.montarPayload();
    if (!payload) return;

    this.carregandoCalculo = true;
    this.erroCalculo = null;
    const requestId = ++this.calculoRequestId;

    this.dataSvc.calcularSmartCalc(payload).subscribe({
      next: (res) => {
        if (requestId !== this.calculoRequestId) return;
        this.resultado.set(res ?? { itens: [], total: 0, observacao: undefined });
        this.needsRecalcular.set(false);
        this.carregandoCalculo = false;
        this.dispararAnimacaoResultado();
      },
      error: (err) => {
        if (requestId !== this.calculoRequestId) return;
        const msg = extrairMensagemErro(err, 'Não foi possível calcular. Tente novamente.');
        if (!automatico) {
          this.toastr.error(msg, 'SmartCalc', { timeOut: 6000, closeButton: true, progressBar: true });
        }
        this.resultado.set(null);
        this.erroCalculo = msg;
        this.needsRecalcular.set(false);
        this.carregandoCalculo = false;
      },
    });
  }

  private montarPayload(): SmartCalcRequest | null {
    const v = this.form.getRawValue();
    if (v.largura == null || v.altura == null || v.quantidade == null || v.produtoId == null) return null;
    return {
      catalogoProdutoId: v.produtoId,
      produtoId: v.produtoId,
      materialId: v.materialId ?? undefined,
      largura: Number(v.largura),
      altura: Number(v.altura),
      quantidade: Number(v.quantidade),
      unidadeDimensao: 'CENTIMETRO',
      acabamentosCodigos: v.acabamentosIds ?? [],
      acabamentosIds: v.acabamentosIds ?? [],
    };
  }

  // ==========================================================
  // PEDIDO: (por enquanto fica no dataSvc antigo)
  // ==========================================================
  adicionarAoPedido(): void {
    if (!this.configAtiva) {
      this.toastr.warning('O SmartCalc está desabilitado nas configurações.', 'SmartCalc');
      return;
    }

    const top = this.melhor();
    if (!top) {
      this.toastr.warning('Nenhum item calculado.', 'SmartCalc');
      return;
    }

    const payload = this.montarPayload();
    if (!payload) return;
    this.carregandoAdd = true;
    this.dataSvc
      .criarRascunhoSmartCalc(payload)
      .pipe(finalize(() => (this.carregandoAdd = false)))
      .subscribe({
        next: (rascunho) => {
          const num = rascunho?.referencia ? ` #${rascunho.referencia}` : '';
          this.toastr.success(`Rascunho criado${num}.`, 'SmartCalc');
          this.router.navigate(rascunho?.id ? ['/page/grafica/comercial-beta/rascunhos', rascunho.id] : ['/page/grafica/comercial-beta/rascunhos']);
        },
        error: (err) =>
          this.toastr.error(err?.error?.message ?? err?.message ?? 'Falha ao criar rascunho.', 'SmartCalc'),
      });
  }

  limpar(): void {
  this.calculoRequestId++;
  this.carregandoCalculo = false;
  this.focoInicialAplicado = false;
  this.resultadoMobileAberto.set(false);
  this.form.reset({
    largura: null,
    altura: null,
    quantidade: null,
    produtoId: null,
    materialId: null,
    acabamentosIds: [],
    permiteRotacao: true,
  });

  this.resetProdutoDependencias();
}

  enviarParaPedido(): void {
    this.adicionarAoPedido();
  }

  fechar(): void {
    this.router.navigate(['/dashboards/dashboard1']);
  }

  getMaterialDescricao(id: number): string {
    const m = this.materiais.find((x) => x.id === id);
    return m?.descricao ?? '—';
  }

  // ==========================================================
  // REGRA METRO/LINEAR
  // ==========================================================
  // ⚠️ Seu INIT ainda não tem "preco". Então por enquanto essa regra não trava a largura.
  // Quando você mandar no init: { preco: { tipo, modoCobranca, larguraMaxima } }, a gente ajusta aqui.
  private getSelectedPreco(): any | undefined {
    return undefined;
  }

  isMetroLinear(): boolean {
    const preco: any = this.getSelectedPreco();
    const tipo = (preco?.tipo ?? '').toString().toUpperCase();
    const modo = (preco?.modoCobranca ?? '').toString().toUpperCase();
    return tipo === 'METRO' && modo === 'LINEAR';
  }

  getLinearLarguraMaxima(): number | null {
    const preco: any = this.getSelectedPreco();
    const raw = Number(preco?.larguraMaxima);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  private aplicarModoCobrancaRegraLargura(): void {
    const larguraCtrl = this.form.controls.largura;

    if (this.isMetroLinear()) {
      const larguraMax = this.getLinearLarguraMaxima();
      if (larguraMax != null) {
        larguraCtrl.setValue(larguraMax, { emitEvent: false });
      }
      larguraCtrl.disable({ emitEvent: false });
    } else {
      if (larguraCtrl.disabled) larguraCtrl.enable({ emitEvent: false });
    }
  }

  private temParametrosMinimosParaCalcular(): boolean {
    return this.configAtiva && this.form.valid && !this.carregandoProdutos;
  }

  private dispararAnimacaoResultado(): void {
    this.animandoResultado.set(true);
    setTimeout(() => this.animandoResultado.set(false), 260);
  }

  private agendarFocoInicial(): void {
    if (this.focoInicialAplicado) return;

    setTimeout(() => {
      const trigger = this.obterTriggerSelect('.smartcalc-page app-input-options');

      if (!trigger) return;
      trigger.focus();
      this.focoInicialAplicado = true;
    }, 0);
  }

  focarMaterialSelector(): void {
    const trigger = this.obterTriggerSelect('.smartcalc-page app-input-options:nth-of-type(2)');
    trigger?.focus();
    trigger?.click();
  }

  private obterTriggerSelect(seletorBase: string): HTMLElement | null {
    return this.host.nativeElement.querySelector(
      `${seletorBase} .mat-mdc-select-trigger`
    ) as HTMLElement | null;
  }

  abrirResultadoMobile(): void {
    this.resultadoMobileAberto.set(true);
    document.body.style.overflow = 'hidden';
  }

  alternarResultadoMobile(): void {
    if (this.resultadoMobileAberto()) {
      this.fecharResultadoMobile();
      return;
    }

    this.abrirResultadoMobile();
  }

  fecharResultadoMobile(): void {
    this.resultadoMobileAberto.set(false);
    document.body.style.overflow = '';
  }

  iniciarGestoSheet(event: TouchEvent): void {
    this.gestoSheetStartY = event.changedTouches[0]?.clientY ?? null;
  }

  finalizarGestoSheet(event: TouchEvent): void {
    if (this.gestoSheetStartY == null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? this.gestoSheetStartY;
    const deltaY = endY - this.gestoSheetStartY;
    this.gestoSheetStartY = null;

    if (deltaY > 24) {
      this.fecharResultadoMobile();
    }
  }

  multiSelectCardMinHeight(): number {
    return this.mobileViewport() ? 168 : 220;
  }

  multiSelectListHeight(): number {
    return this.mobileViewport() ? 124 : 220;
  }

  private atualizarViewport(): void {
    const mobile = typeof window !== 'undefined' ? window.innerWidth <= 900 : false;
    this.mobileViewport.set(mobile);

    if (!mobile) {
      this.resultadoMobileAberto.set(false);
      document.body.style.overflow = '';
    }
  }
}
