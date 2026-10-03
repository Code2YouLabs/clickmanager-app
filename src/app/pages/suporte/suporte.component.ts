import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { distinctUntilChanged, map } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputPesquisaComponent } from 'src/app/components/inputs/input-pesquisa/input-pesquisa.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { MaterialModule } from 'src/app/material.module';
import {
  ChamadoSuporteCategoria,
  ChamadoSuporteDetalhe,
  ChamadoSuporteListaItem,
  ChamadoSuportePrioridade,
  ChamadoSuporteStatus,
  MensagemChamadoSuporte
} from './models/chamado-suporte.model';
import { ChamadoSuporteDialogComponent } from './components/chamado-suporte-dialog.component';
import { SuporteService } from './services/suporte.service';

type StatusFiltro = ChamadoSuporteStatus | 'TODOS';
type ListaEstado = 'loading' | 'error' | 'content' | 'empty';
type DetalheEstado = 'idle' | 'loading' | 'error' | 'not-found' | 'content';

const trimRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value || '').trim();
  return value ? null : { trimRequired: true };
};

@Component({
  selector: 'app-suporte',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    DatePipe,
    MaterialModule,
    PageCardComponent,
    StatusBadgeComponent,
    InputPesquisaComponent,
    InputOptionsComponent,
    InputTextareaComponent
  ],
  templateUrl: './suporte.component.html',
  styleUrl: './suporte.component.scss'
})
export class SuporteComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly tamanhoPagina = 50;
  private detalheRequestSeq = 0;
  private routeChamadoId: number | null = null;
  private listaInicialCarregada = false;

  carregandoLista = false;
  carregandoMais = false;
  carregandoDetalhe = false;
  salvandoResposta = false;
  fechandoChamado = false;
  erroLista: string | null = null;
  erroDetalhe: string | null = null;
  detalheNaoEncontrado = false;
  chamados: ChamadoSuporteListaItem[] = [];
  chamadosFiltrados: ChamadoSuporteListaItem[] = [];
  chamadoSelecionado: ChamadoSuporteDetalhe | null = null;
  paginaAtual = 0;
  totalItens = 0;
  totalPaginas = 0;

  readonly buscaControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl<StatusFiltro>('TODOS', { nonNullable: true });
  readonly respostaForm = this.fb.group({
    mensagem: ['', [Validators.required, Validators.maxLength(3000), trimRequired]]
  });

  readonly statusOptions: Array<{ value: StatusFiltro; label: string }> = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'ABERTO', label: 'Aberto' },
    { value: 'EM_ANALISE', label: 'Em análise' },
    { value: 'AGUARDANDO_CLIENTE', label: 'Aguardando cliente' },
    { value: 'RESPONDIDO', label: 'Respondido' },
    { value: 'RESOLVIDO', label: 'Resolvido' },
    { value: 'FECHADO', label: 'Fechado' }
  ];

  constructor(
    private readonly service: SuporteService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarFiltros());

    this.route.paramMap
      .pipe(
        map((params) => {
          const id = Number(params.get('id'));
          return Number.isFinite(id) && id > 0 ? id : null;
        }),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((id) => {
        this.routeChamadoId = id;
        if (!this.listaInicialCarregada && !this.carregandoLista) {
          this.carregarListaInicial(id);
          return;
        }
        this.resolverSelecaoDaRota(id);
      });
  }

  abrirNovoChamado(): void {
    const dialogRef = this.dialog.open(ChamadoSuporteDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((chamado?: ChamadoSuporteDetalhe | null) => {
      if (!chamado?.id) return;
      this.chamadoSelecionado = chamado;
      this.atualizarItemNaLista(chamado);
      this.router.navigate(['/page/suporte', chamado.id], { replaceUrl: true });
    });
  }

  aplicarFiltroBusca(valor: string): void {
    this.buscaControl.setValue(valor || '', { emitEvent: false });
    this.aplicarFiltros();
  }

  selecionarChamado(item: ChamadoSuporteListaItem): void {
    if (!item?.id || item.id === this.routeChamadoId) return;
    this.router.navigate(['/page/suporte', item.id], { replaceUrl: true });
  }

  retryLista(): void {
    this.carregarListaInicial(this.routeChamadoId);
  }

  retryDetalhe(): void {
    if (this.routeChamadoId) {
      this.carregarDetalhe(this.routeChamadoId);
    }
  }

  carregarMais(): void {
    if (!this.temMaisPaginas || this.carregandoMais || this.carregandoLista) return;
    const proximaPagina = this.paginaAtual + 1;
    this.carregandoMais = true;
    this.service.listar$(proximaPagina, this.tamanhoPagina).subscribe({
      next: (res) => {
        this.carregandoMais = false;
        this.paginaAtual = res.pagina;
        this.totalItens = res.totalItens;
        this.totalPaginas = res.totalPaginas;
        this.chamados = this.ordenarChamados(this.mergeChamados(this.chamados, res.itens || []));
        this.aplicarFiltros();
      },
      error: (err) => {
        this.carregandoMais = false;
        this.toastr.error(err?.userMessage || 'Não foi possível carregar mais chamados.');
      }
    });
  }

  responderChamado(): void {
    if (!this.chamadoSelecionado?.id || this.naoPodeResponder || this.salvandoResposta) return;
    if (this.respostaForm.invalid) {
      this.respostaForm.markAllAsTouched();
      return;
    }

    const mensagem = String(this.respostaForm.value.mensagem || '').trim();
    this.salvandoResposta = true;
    this.service.responder$(this.chamadoSelecionado.id, { mensagem }).subscribe({
      next: (detalhe) => {
        this.salvandoResposta = false;
        this.chamadoSelecionado = detalhe;
        this.respostaForm.reset();
        this.atualizarItemNaLista(detalhe);
        this.toastr.success('Mensagem enviada com sucesso.');
      },
      error: (err) => {
        this.salvandoResposta = false;
        this.toastr.error(err?.userMessage || 'Não foi possível enviar a mensagem.');
      }
    });
  }

  fecharChamado(): void {
    if (!this.chamadoSelecionado?.id || this.chamadoSelecionado.status === 'FECHADO' || this.fechandoChamado) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: 'Fechar chamado',
        message: 'Deseja encerrar este chamado? Depois disso não será possível enviar novas mensagens.',
        confirmText: 'Fechar chamado',
        confirmColor: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe((ok) => {
      if (!ok || !this.chamadoSelecionado?.id || this.fechandoChamado) return;
      this.fechandoChamado = true;
      this.service.fechar$(this.chamadoSelecionado.id).subscribe({
        next: (detalhe) => {
          this.fechandoChamado = false;
          this.chamadoSelecionado = detalhe;
          this.atualizarItemNaLista(detalhe);
          this.toastr.success('Chamado fechado com sucesso.');
        },
        error: (err) => {
          this.fechandoChamado = false;
          this.toastr.error(err?.userMessage || 'Não foi possível fechar o chamado.');
        }
      });
    });
  }

  prioridadeLabel(prioridade: ChamadoSuportePrioridade): string {
    return {
      BAIXA: 'Baixa',
      MEDIA: 'Média',
      ALTA: 'Alta',
      URGENTE: 'Urgente'
    }[prioridade] || prioridade;
  }

  categoriaLabel(categoria: string): string {
    return {
      DUVIDA: 'Dúvida',
      ERRO: 'Erro',
      FINANCEIRO: 'Financeiro',
      SUGESTAO: 'Sugestão',
      ACESSO: 'Acesso',
      OUTRO: 'Outro'
    }[String(categoria || '').toUpperCase()] || categoria;
  }

  prioridadeClass(prioridade: ChamadoSuportePrioridade): string {
    return `priority-${String(prioridade || 'MEDIA').toLowerCase()}`;
  }

  dataRelativa(iso?: string | null): string {
    if (!iso) return 'Agora';
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'Agora';
    if (min < 60) return `${min} min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h atrás`;
    const d = Math.floor(h / 24);
    if (d < 7) return d === 1 ? '1 dia atrás' : `${d} dias atrás`;
    return new DatePipe('pt-BR').transform(date, 'dd/MM/yyyy HH:mm') || '';
  }

  autorMensagemClass(tipo: string): string {
    return String(tipo || 'CLIENTE').toUpperCase() === 'CLIENTE' ? 'msg-cliente' : 'msg-suporte';
  }

  get mensagemControl(): FormControl<string | null> {
    return this.respostaForm.controls.mensagem;
  }

  get mensagensVisiveis(): MensagemChamadoSuporte[] {
    return [...(this.chamadoSelecionado?.mensagens || [])]
      .filter((mensagem) => mensagem.interna !== true)
      .sort((a, b) => new Date(a.criadaEm || '').getTime() - new Date(b.criadaEm || '').getTime());
  }

  get naoPodeResponder(): boolean {
    return !this.chamadoSelecionado || this.chamadoSelecionado.status === 'FECHADO';
  }

  get totalAbertosNestaLista(): number {
    return this.chamados.filter((item) => item.status !== 'FECHADO').length;
  }

  get temMaisPaginas(): boolean {
    return this.totalPaginas > 0 && this.paginaAtual + 1 < this.totalPaginas;
  }

  get listaEstado(): ListaEstado {
    if (this.carregandoLista && this.chamados.length === 0) return 'loading';
    if (this.erroLista && this.chamados.length === 0) return 'error';
    if (this.chamados.length === 0) return 'empty';
    return 'content';
  }

  get detalheEstado(): DetalheEstado {
    if (this.carregandoDetalhe) return 'loading';
    if (this.detalheNaoEncontrado) return 'not-found';
    if (this.erroDetalhe) return this.routeChamadoId ? 'error' : 'idle';
    if (this.routeChamadoId && !this.chamadoSelecionado) return 'not-found';
    if (this.chamadoSelecionado) return 'content';
    return 'idle';
  }

  get temFiltroAtivo(): boolean {
    return !!this.buscaControl.value.trim() || this.statusControl.value !== 'TODOS';
  }

  private carregarListaInicial(chamadoId: number | null): void {
    this.carregandoLista = true;
    this.erroLista = null;
    this.paginaAtual = 0;
    this.service.listar$(0, this.tamanhoPagina).subscribe({
      next: (res) => {
        this.carregandoLista = false;
        this.listaInicialCarregada = true;
        this.paginaAtual = res.pagina;
        this.totalItens = res.totalItens;
        this.totalPaginas = res.totalPaginas;
        this.chamados = this.ordenarChamados(res.itens || []);
        this.aplicarFiltros();
        this.resolverSelecaoDaRota(chamadoId);
      },
      error: (err) => {
        this.carregandoLista = false;
        this.listaInicialCarregada = false;
        this.erroLista = err?.userMessage || 'Não foi possível carregar os chamados.';
        this.toastr.error(this.erroLista || 'Não foi possível carregar os chamados.');
      }
    });
  }

  private resolverSelecaoDaRota(chamadoId: number | null): void {
    if (chamadoId) {
      if (this.chamadoSelecionado?.id === chamadoId && !this.erroDetalhe) return;
      this.carregarDetalhe(chamadoId);
      return;
    }

    const primeiro = this.chamados[0];
    if (primeiro) {
      this.router.navigate(['/page/suporte', primeiro.id], { replaceUrl: true });
      return;
    }

    this.chamadoSelecionado = null;
    this.erroDetalhe = null;
    this.detalheNaoEncontrado = false;
  }

  private carregarDetalhe(id: number): void {
    const requestSeq = ++this.detalheRequestSeq;
    this.carregandoDetalhe = true;
    this.erroDetalhe = null;
    this.detalheNaoEncontrado = false;
    this.service.buscarPorId$(id).subscribe({
      next: (detalhe) => {
        if (requestSeq !== this.detalheRequestSeq) return;
        this.chamadoSelecionado = detalhe;
        this.carregandoDetalhe = false;
        this.respostaForm.reset();
        this.atualizarItemNaLista(detalhe);
      },
      error: (err) => {
        if (requestSeq !== this.detalheRequestSeq) return;
        this.carregandoDetalhe = false;
        this.chamadoSelecionado = null;
        this.detalheNaoEncontrado = err?.status === 404;
        this.erroDetalhe = this.detalheNaoEncontrado ? null : err?.userMessage || 'Não foi possível carregar o chamado.';
        if (err?.status !== 404) {
          this.toastr.error(this.erroDetalhe || 'Não foi possível carregar o chamado.');
        }
      }
    });
  }

  private aplicarFiltros(): void {
    const termo = this.buscaControl.value.trim().toLowerCase();
    const status = this.statusControl.value;
    this.chamadosFiltrados = this.chamados.filter((item) => {
      const atendeStatus = status === 'TODOS' ? true : item.status === status;
      const atendeBusca = !termo
        ? true
        : `${item.assunto} ${item.categoria} ${item.prioridade}`.toLowerCase().includes(termo);
      return atendeStatus && atendeBusca;
    });
  }

  private atualizarItemNaLista(detalhe: ChamadoSuporteDetalhe): void {
    const atualizado: ChamadoSuporteListaItem = {
      id: detalhe.id,
      assunto: detalhe.assunto,
      categoria: detalhe.categoria,
      prioridade: detalhe.prioridade,
      status: detalhe.status,
      criadoEm: detalhe.criadoEm,
      atualizadoEm: detalhe.atualizadoEm,
      fechadoEm: detalhe.fechadoEm
    };

    this.chamados = this.ordenarChamados(this.mergeChamados(this.chamados, [atualizado]));
    this.totalItens = Math.max(this.totalItens, this.chamados.length);
    this.aplicarFiltros();
  }

  private mergeChamados(base: ChamadoSuporteListaItem[], novos: ChamadoSuporteListaItem[]): ChamadoSuporteListaItem[] {
    const porId = new Map<number, ChamadoSuporteListaItem>();
    [...base, ...novos].forEach((item) => porId.set(item.id, item));
    return [...porId.values()];
  }

  private ordenarChamados(chamados: ChamadoSuporteListaItem[]): ChamadoSuporteListaItem[] {
    return [...chamados].sort(
      (a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime()
    );
  }
}
