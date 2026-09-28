import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { filter, take } from 'rxjs';
import { DataTableAction, DataTableActionEvent, DataTableColumn, DataTableEmptyState } from 'src/app/components/data-table/data-table.models';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { Empresa } from 'src/app/models/empresa/empresa.model';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import { PresencaPublicaResponse } from 'src/app/pages/config/presenca-publica/presenca-publica.models';
import { PresencaPublicaService } from 'src/app/pages/config/presenca-publica/presenca-publica.service';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
import { EmpresaFormService } from '../../../empresa/empresa-form.service';
import { LinksItemDialogComponent } from '../../components/item-dialog/links-item-dialog.component';
import { LinksPreviewDialogComponent } from '../../components/preview-dialog/links-preview-dialog.component';
import { LinksPublicPreviewComponent } from '../../components/public-preview/links-public-preview.component';
import { LinksSharePanelComponent } from '../../components/share-panel/links-share-panel.component';
import {
  FormatoBotaoLinks,
  LINKS_APARENCIA_PADRAO,
  LINKS_PERMISSOES,
  LinksIdentidadePublica,
  LinksPreviewModel,
  PaginaLinksDetalhe,
  PaginaLinksItem,
  PaginaLinksItemRequest,
  PaginaLinksRequest,
  TIPOS_ITEM_LINKS,
  TemaPaginaLinks,
  TipoItemLinks,
} from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { buildMailtoUrl, buildTelefoneUrl, buildWhatsappUrl, normalizarTelefoneParaUrl } from '../../utils/links-item-url.util';
import { buildClickLinkPublicUrl } from '../../utils/links-url.util';

interface LinkEmpresaSugestao extends PaginaLinksItemRequest {
  origem: string;
}

@Component({
  selector: 'app-links-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    DataTableComponent,
    DataTableCellDirective,
    DataTableItemDirective,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    TemPermissaoDirective,
    LinksPublicPreviewComponent,
    LinksSharePanelComponent,
  ],
  templateUrl: './links-editor.component.html',
  styleUrls: ['../../links.scss', './links-editor.component.scss'],
})
export class LinksEditorComponent implements OnInit {
  pagina: PaginaLinksDetalhe | null = null;
  identidade: LinksIdentidadePublica | null = null;
  presenca: PresencaPublicaResponse | null = null;
  empresaId: number | null = null;
  empresa: Empresa | null = null;
  carregando = true;
  erro: string | null = null;
  semPermissao = false;
  salvandoPagina = false;
  salvandoItem = false;
  publicando = false;
  excluindo = false;
  abaSelecionada = 0;

  readonly formId = 'clicklink-page-form';
  readonly isNova = this.route.snapshot.routeConfig?.path === 'nova';
  readonly paginaId = Number(this.route.snapshot.paramMap.get('id'));
  readonly permissoes = LINKS_PERMISSOES;
  readonly tipos = TIPOS_ITEM_LINKS;
  readonly temas: Array<{ value: TemaPaginaLinks; label: string }> = [
    { value: 'CLARO', label: 'Claro' },
    { value: 'ESCURO', label: 'Escuro' },
  ];
  readonly formatosBotao: Array<{ value: FormatoBotaoLinks; label: string }> = [
    { value: 'ARREDONDADO', label: 'Arredondado' },
    { value: 'SUAVE', label: 'Suave' },
    { value: 'QUADRADO', label: 'Quadrado' },
  ];
  readonly formState = new PageFormState(() => this.form);
  readonly colunasItens: DataTableColumn<PaginaLinksItem>[] = [
    { key: 'tipo', label: 'Tipo', width: '150px' },
    { key: 'titulo', label: 'Título' },
    { key: 'subtitulo', label: 'Subtítulo' },
    { key: 'status', label: 'Status', width: '120px' },
    { key: 'ordem', label: 'Ordem', width: '116px', align: 'center' },
  ];
  readonly emptyStateItens: DataTableEmptyState = {
    title: 'Adicione o primeiro link',
    description: 'Comece por WhatsApp, Instagram, telefone ou outro canal.',
  };

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(120)]],
    descricao: ['', [Validators.maxLength(500)]],
    tema: [LINKS_APARENCIA_PADRAO.tema as TemaPaginaLinks, [Validators.required]],
    corPrincipal: [LINKS_APARENCIA_PADRAO.corPrincipal as string, [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    corFundo: [LINKS_APARENCIA_PADRAO.corFundo as string, [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    formatoBotao: [LINKS_APARENCIA_PADRAO.formatoBotao as FormatoBotaoLinks, [Validators.required]],
  });

  private payloadPersistido: PaginaLinksRequest | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly linksService: LinksService,
    private readonly identidadeService: EmpresaIdentidadePublicaService,
    private readonly presencaService: PresencaPublicaService,
    private readonly empresaService: EmpresaFormService,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (!this.podeVer()) {
      this.carregando = false;
      this.semPermissao = true;
      return;
    }

    this.carregarDadosEmpresa();
    this.carregarPresenca();
    this.carregarIdentidade(() => {
      if (this.isNova) {
        this.prepararNovaPagina();
      } else {
        this.carregarPagina();
      }
    });
  }

  get tituloPagina(): string {
    return this.isNova ? 'Nova página ClickLink' : 'Editar página ClickLink';
  }

  get subtituloPagina(): string {
    return this.isNova ? 'ClickLink • Páginas • Nova' : 'ClickLink • Páginas • Editar';
  }

  get savingText(): string {
    return this.isNova ? 'Salvando...' : 'Atualizando...';
  }

  get footerActions(): PageCardAction[] {
    if (this.carregando || this.erro || this.semPermissao) {
      return [];
    }

    return [{
      id: 'salvar',
      type: 'submit',
      form: this.formId,
      disabled: this.salvandoPagina || !this.podeEditarPagina(),
    }];
  }

  get itens(): PaginaLinksItem[] {
    return this.itensOrdenados();
  }

  get acoesItens(): DataTableAction<PaginaLinksItem>[] {
    return [
      {
        id: 'subir',
        label: 'Mover para cima',
        icon: 'arrow_upward',
        disabled: (item) => this.salvandoItem || this.isPrimeiroItem(item) || !this.podeEditarPagina(),
      },
      {
        id: 'descer',
        label: 'Mover para baixo',
        icon: 'arrow_downward',
        disabled: (item) => this.salvandoItem || this.isUltimoItem(item) || !this.podeEditarPagina(),
      },
      {
        id: 'editar',
        label: 'Editar',
        icon: 'edit',
        disabled: () => this.salvandoItem || !this.podeEditarPagina(),
      },
      {
        id: 'status',
        label: 'Ativar ou desativar',
        icon: 'toggle_on',
        disabled: () => this.salvandoItem || !this.podeEditarPagina(),
      },
      {
        id: 'excluir',
        label: 'Remover',
        icon: 'delete',
        color: 'warn',
        disabled: () => this.salvandoItem || !this.podeEditarPagina(),
      },
    ];
  }

  salvarOuCriar(): void {
    if (this.salvandoPagina || this.semPermissao || this.erro || !this.podeEditarPagina()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Informe um título válido para a página.');
      return;
    }
    this.isNova ? this.criarPagina() : this.salvarPagina();
  }

  salvarPagina(): void {
    if (!this.pagina || this.salvandoPagina) return;
    this.salvandoPagina = true;
    this.linksService.editarPagina(this.pagina.id, this.payloadPagina()).subscribe({
      next: (pagina) => {
        this.salvandoPagina = false;
        this.atualizarPagina(pagina, true);
        this.toastr.success('Página atualizada.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível salvar a página.'),
    });
  }

  criarPagina(): void {
    if (this.salvandoPagina) return;
    this.salvandoPagina = true;
    this.linksService.criarPagina(this.payloadPagina()).subscribe({
      next: (pagina) => {
        this.salvandoPagina = false;
        this.toastr.success('Página criada.');
        this.router.navigate(['/page/links', pagina.id]);
      },
      error: (error) => this.tratarErro(error, 'Não foi possível criar a página.'),
    });
  }

  alterarPublicacao(publicada: boolean): void {
    if (!this.pagina || this.publicando || !this.podePublicar()) return;
    if (publicada && !this.identidade?.slug) {
      this.toastr.warning('Configure os dados da empresa antes de publicar.');
      return;
    }
    if (publicada && this.temAlteracoesFormulario()) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.toastr.warning('Informe um título válido para publicar.');
        return;
      }
      this.salvarEAlterarPublicacao(publicada);
      return;
    }
    this.publicando = true;
    this.linksService.alterarPublicacao(this.pagina.id, publicada).subscribe({
      next: (pagina) => {
        this.publicando = false;
        this.atualizarPagina(pagina, true);
        this.toastr.success(publicada ? 'Página publicada.' : 'Página despublicada.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível alterar a publicação.'),
    });
  }

  tornarPrincipal(): void {
    if (!this.pagina || this.publicando || !this.podePublicar()) return;
    if (!this.pagina.publicada) {
      this.toastr.info('Publique a página antes de torná-la principal.');
      return;
    }
    this.publicando = true;
    this.linksService.tornarPrincipal(this.pagina.id).subscribe({
      next: (pagina) => {
        this.publicando = false;
        this.atualizarPagina(pagina, true);
        this.toastr.success('Página definida como principal.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível tornar a página principal.'),
    });
  }


  abrirItem(item?: PaginaLinksItem): void {
    if (!this.pagina || this.salvandoItem || !this.podeEditarPagina()) return;
    const dialogRef = this.dialog.open(LinksItemDialogComponent, {
      width: window.innerWidth <= 640 ? '100vw' : '620px',
      maxWidth: window.innerWidth <= 640 ? '100vw' : '90vw',
      panelClass: 'links-item-dialog-panel',
      data: { item: item || null, ordem: item ? item.ordem : this.pagina.itens.length },
    });

    dialogRef.afterClosed().subscribe((payload: PaginaLinksItemRequest | undefined) => {
      if (!payload) return;
      item ? this.editarItem(item, payload) : this.adicionarItem(payload);
    });
  }

  alterarStatusItem(item: PaginaLinksItem): void {
    if (!this.pagina || this.salvandoItem || !this.podeEditarPagina()) return;
    this.salvandoItem = true;
    this.linksService.alterarStatusItem(this.pagina.id, item.id, !item.ativo).subscribe({
      next: (pagina) => {
        this.salvandoItem = false;
        this.atualizarPagina(pagina, false);
        this.toastr.success(item.ativo ? 'Link desativado.' : 'Link ativado.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível alterar o link.'),
    });
  }

  removerItem(item: PaginaLinksItem): void {
    if (!this.pagina || this.salvandoItem || !this.podeEditarPagina()) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Remover link',
        message: `Remover "${item.titulo}"? Esta ação exclui o item da página.`,
        confirmText: 'Remover',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok || !this.pagina) return;
      this.salvandoItem = true;
      this.linksService.removerItem(this.pagina.id, item.id).subscribe({
        next: () => {
          this.salvandoItem = false;
          this.toastr.success('Link removido.');
          this.pagina = this.pagina
            ? { ...this.pagina, itens: this.pagina.itens.filter((paginaItem) => paginaItem.id !== item.id) }
            : null;
          this.abaSelecionada = 1;
        },
        error: (error) => this.tratarErro(error, 'Não foi possível remover o link.'),
      });
    });
  }

  moverItem(item: PaginaLinksItem, direcao: -1 | 1): void {
    if (!this.pagina || this.salvandoItem || !this.podeEditarPagina()) return;
    const itens = this.itensOrdenados();
    const atual = itens.findIndex((value) => value.id === item.id);
    const destino = atual + direcao;
    if (atual < 0 || destino < 0 || destino >= itens.length) return;
    [itens[atual], itens[destino]] = [itens[destino], itens[atual]];
    this.salvandoItem = true;
    this.linksService.ordenarItens(this.pagina.id, {
      itens: itens.map((value, index) => ({ itemId: value.id, ordem: index })),
    }).subscribe({
      next: (pagina) => {
        this.salvandoItem = false;
        this.atualizarPagina(pagina, false);
        this.toastr.success('Ordem atualizada.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível ordenar os links.'),
    });
  }

  excluirPagina(): void {
    if (!this.pagina || this.excluindo || !this.podeExcluir()) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir página?',
        message: 'A página, seus links e seus dados de analytics serão removidos definitivamente.',
        confirmText: 'Excluir página',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok || !this.pagina) return;
      this.excluindo = true;
      this.linksService.excluirPagina(this.pagina.id).subscribe({
        next: () => {
          this.excluindo = false;
          this.toastr.success('Página excluída.');
          this.router.navigate(['/page/links/paginas']);
        },
        error: (error) => this.tratarErro(error, 'Não foi possível excluir a página.'),
      });
    });
  }

  sugestoesEmpresa(): LinkEmpresaSugestao[] {
    if (!this.empresa) return [];
    const sugestoes: LinkEmpresaSugestao[] = [];
    const nome = this.identidade?.nome || this.empresa.nome || 'empresa';
    const telefone = normalizarTelefoneParaUrl(this.empresa.telefone);

    if (telefone) {
      sugestoes.push({
        origem: 'Telefone da empresa',
        tipo: 'WHATSAPP',
        titulo: 'Fale pelo WhatsApp',
        subtitulo: 'Atendimento comercial',
        url: buildWhatsappUrl(telefone, `Olá, vim pelo ClickLink da ${nome}.`),
      });
      sugestoes.push({
        origem: 'Telefone da empresa',
        tipo: 'TELEFONE',
        titulo: 'Ligar agora',
        subtitulo: this.empresa.telefone || null,
        url: buildTelefoneUrl(telefone),
      });
    }

    if (this.empresa.email?.trim()) {
      sugestoes.push({
        origem: 'E-mail da empresa',
        tipo: 'EMAIL',
        titulo: 'Enviar e-mail',
        subtitulo: this.empresa.email.trim(),
        url: buildMailtoUrl(this.empresa.email.trim(), 'Contato pelo ClickLink'),
      });
    }

    this.adicionarSugestaoUrl(sugestoes, 'INSTAGRAM', 'Instagram', 'Rede social', this.normalizarInstagramUrl(this.empresa.instagramUrl));
    this.adicionarSugestaoUrl(sugestoes, 'FACEBOOK', 'Facebook', 'Rede social', this.normalizarUrlPublica(this.empresa.facebookUrl));
    this.adicionarSugestaoUrl(sugestoes, 'YOUTUBE', 'YouTube', 'Canal de vídeos', this.normalizarUrlPublica(this.empresa.youtubeUrl));
    this.adicionarSugestaoUrl(sugestoes, 'LINK', 'Site', 'Site oficial', this.normalizarUrlPublica(this.empresa.siteUrl));

    const endereco = this.enderecoCompleto();
    if (endereco) {
      sugestoes.push({
        origem: 'Endereço da empresa',
        tipo: 'LOCALIZACAO',
        titulo: 'Abrir no Google Maps',
        subtitulo: endereco,
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`,
      });
      sugestoes.push({
        origem: 'Endereço da empresa',
        tipo: 'LOCALIZACAO',
        titulo: 'Abrir no Waze',
        subtitulo: endereco,
        url: `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`,
      });
    }

    const urlsAtuais = new Set(this.itensOrdenados().map((item) => item.url));
    return sugestoes.filter((sugestao) => !urlsAtuais.has(sugestao.url));
  }

  importarSugestao(sugestao: LinkEmpresaSugestao): void {
    if (!this.pagina || this.salvandoItem || !this.podeEditarPagina()) return;
    this.adicionarItem({
      tipo: sugestao.tipo,
      titulo: sugestao.titulo,
      subtitulo: sugestao.subtitulo,
      url: sugestao.url,
      ordem: this.itensOrdenados().length,
    });
  }

  urlPublica(): string {
    return buildClickLinkPublicUrl(
      this.identidade?.slug,
      this.pagina?.slug,
      this.pagina?.principal ?? true,
      this.presenca?.dominioProprio,
      this.presenca?.dominioProprioAtivo === true,
      this.empresaId
    );
  }

  previewModel(): LinksPreviewModel {
    return {
      titulo: this.tituloControl.value?.trim() || this.identidade?.nome || 'ClickLink',
      descricao: this.descricaoControl.value?.trim() || null,
      identidade: {
        nome: this.identidade?.nome || null,
        slug: this.identidade?.slug || null,
        logoUrl: this.identidade?.logoUrl || null,
        faviconUrl: this.identidade?.faviconUrl || null,
      },
      tema: this.temaControl.value || LINKS_APARENCIA_PADRAO.tema,
      corPrincipal: this.corPrincipalControl.value || LINKS_APARENCIA_PADRAO.corPrincipal,
      corFundo: this.corFundoControl.value || LINKS_APARENCIA_PADRAO.corFundo,
      formatoBotao: this.formatoBotaoControl.value || LINKS_APARENCIA_PADRAO.formatoBotao,
      itens: this.itensOrdenados(),
    };
  }

  visualizarMobile(): void {
    this.dialog.open(LinksPreviewDialogComponent, {
      width: '100vw',
      height: '100dvh',
      maxWidth: '100vw',
      maxHeight: '100dvh',
      panelClass: 'links-preview-dialog-panel',
      data: this.previewModel(),
    });
  }

  itensOrdenados(): PaginaLinksItem[] {
    return [...(this.pagina?.itens || [])].sort((a, b) => a.ordem - b.ordem);
  }

  onItemAction(event: DataTableActionEvent<PaginaLinksItem>): void {
    switch (event.action) {
      case 'subir':
        this.moverItem(event.row, -1);
        break;
      case 'descer':
        this.moverItem(event.row, 1);
        break;
      case 'editar':
        this.abrirItem(event.row);
        break;
      case 'status':
        this.alterarStatusItem(event.row);
        break;
      case 'excluir':
        this.removerItem(event.row);
        break;
    }
  }

  isPrimeiroItem(item: PaginaLinksItem): boolean {
    return this.itensOrdenados()[0]?.id === item.id;
  }

  isUltimoItem(item: PaginaLinksItem): boolean {
    const itens = this.itensOrdenados();
    return itens[itens.length - 1]?.id === item.id;
  }

  tipoLabel(tipo: TipoItemLinks): string {
    return this.tipos.find((item) => item.tipo === tipo)?.label || tipo;
  }

  tipoIcon(tipo: TipoItemLinks): string {
    return this.tipos.find((item) => item.tipo === tipo)?.icon || 'link';
  }

  temAlteracoesFormulario(): boolean {
    if (!this.payloadPersistido) return this.form.dirty;
    return JSON.stringify(this.normalizarPayload(this.payloadPagina())) !== JSON.stringify(this.normalizarPayload(this.payloadPersistido));
  }

  tentarNovamente(): void {
    this.isNova ? this.prepararNovaPagina() : this.carregarPagina();
  }

  private adicionarItem(payload: PaginaLinksItemRequest): void {
    if (!this.pagina || this.salvandoItem || !this.podeEditarPagina()) return;
    this.salvandoItem = true;
    this.linksService.adicionarItem(this.pagina.id, payload).subscribe({
      next: (pagina) => {
        this.salvandoItem = false;
        this.atualizarPagina(pagina, false);
        this.toastr.success('Link adicionado.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível adicionar o link.'),
    });
  }

  private salvarEAlterarPublicacao(publicada: boolean): void {
    if (!this.pagina || this.publicando || !this.podePublicar()) return;
    this.publicando = true;
    this.salvandoPagina = true;
    this.linksService.editarPagina(this.pagina.id, this.payloadPagina()).subscribe({
      next: (pagina) => {
        this.salvandoPagina = false;
        this.atualizarPagina(pagina, true);
        this.linksService.alterarPublicacao(pagina.id, publicada).subscribe({
          next: (paginaPublicada) => {
            this.publicando = false;
            this.atualizarPagina(paginaPublicada, true);
            this.toastr.success(publicada ? 'Alterações salvas e página publicada.' : 'Alterações salvas e página despublicada.');
          },
          error: (error) => this.tratarErro(error, 'Não foi possível alterar a publicação.'),
        });
      },
      error: (error) => this.tratarErro(error, 'Não foi possível salvar a página antes de publicar.'),
    });
  }

  private carregarDadosEmpresa(): void {
    this.authService.usuario$
      .pipe(filter((usuario) => !!usuario?.empresa?.id), take(1))
      .subscribe((usuario) => {
        const empresaId = usuario?.empresa?.id;
        if (!empresaId) return;
        this.empresaId = empresaId;
        this.empresaService.buscarEmpresa(empresaId).subscribe({
          next: (empresa) => {
            this.empresa = empresa;
          },
          error: () => {
            this.empresa = null;
          },
        });
      });
  }

  private adicionarSugestaoUrl(
    sugestoes: LinkEmpresaSugestao[],
    tipo: LinkEmpresaSugestao['tipo'],
    titulo: string,
    subtitulo: string,
    url: string | null | undefined
  ): void {
    const value = String(url || '').trim();
    if (!value) return;
    sugestoes.push({ origem: 'Dados da empresa', tipo, titulo, subtitulo, url: value });
  }

  private normalizarUrlPublica(url: string | null | undefined): string {
    const value = String(url || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (/^\/\//.test(value)) return `https:${value}`;
    if (/^[^\s]+\.[^\s]+$/.test(value)) return `https://${value}`;
    return value;
  }

  private normalizarInstagramUrl(url: string | null | undefined): string {
    const value = String(url || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;

    const perfil = value
      .replace(/^@+/, '')
      .replace(/^instagram\.com\//i, '')
      .replace(/^www\.instagram\.com\//i, '')
      .replace(/^\/+/, '')
      .split(/[/?#]/)[0];

    return perfil ? `https://instagram.com/${perfil}` : '';
  }

  private enderecoCompleto(): string {
    const endereco = this.empresa?.endereco;
    if (!endereco) return '';
    return [
      endereco.logradouro,
      endereco.numero,
      endereco.complemento,
      endereco.bairro,
      endereco.cidade,
      endereco.estado,
      endereco.cep,
    ].filter(Boolean).join(', ');
  }

  private editarItem(item: PaginaLinksItem, payload: PaginaLinksItemRequest): void {
    if (!this.pagina) return;
    this.salvandoItem = true;
    this.linksService.editarItem(this.pagina.id, item.id, payload).subscribe({
      next: (pagina) => {
        this.salvandoItem = false;
        this.atualizarPagina(pagina, false);
        this.toastr.success('Link atualizado.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível editar o link.'),
    });
  }

  private carregarIdentidade(done?: () => void): void {
    this.identidadeService.buscar().subscribe({
      next: (identidade) => {
        this.atualizarIdentidade(identidade);
        done?.();
      },
      error: () => {
        this.identidade = null;
        done?.();
      },
    });
  }

  private carregarPresenca(): void {
    this.presencaService.buscar().subscribe({
      next: (presenca) => {
        this.presenca = presenca;
      },
      error: () => {
        this.presenca = null;
      },
    });
  }

  private prepararNovaPagina(): void {
    this.carregando = false;
    this.erro = null;
    this.semPermissao = false;
    this.aplicarEstadoFormulario({
      titulo: this.identidade?.nome || '',
      descricao: '',
      tema: LINKS_APARENCIA_PADRAO.tema,
      corPrincipal: LINKS_APARENCIA_PADRAO.corPrincipal,
      corFundo: LINKS_APARENCIA_PADRAO.corFundo,
      formatoBotao: LINKS_APARENCIA_PADRAO.formatoBotao,
    });
    this.payloadPersistido = this.payloadPagina();
    this.formState.begin('create');
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private carregarPagina(atualizarSnapshot = true): void {
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;
    this.formState.begin('edit');
    this.linksService.buscarPagina(this.paginaId).subscribe({
      next: (pagina) => {
        this.carregando = false;
        this.atualizarPagina(pagina, atualizarSnapshot);
      },
      error: (error) => this.tratarErro(error, 'Não foi possível carregar a página.'),
    });
  }

  private atualizarPagina(pagina: PaginaLinksDetalhe, atualizarSnapshot = true): void {
    this.pagina = pagina;
    const estado = this.estadoFormularioDaPagina(pagina);
    if (atualizarSnapshot || !this.form.dirty) {
      this.aplicarEstadoFormulario(estado);
    }
    if (atualizarSnapshot) {
      this.payloadPersistido = { ...estado };
      this.formState.loaded();
      this.form.markAsPristine();
      this.form.markAsUntouched();
    }
    if (pagina.identidade) {
      this.atualizarIdentidade(pagina.identidade);
    }
  }

  private estadoFormularioDaPagina(pagina: PaginaLinksDetalhe): PaginaLinksRequest {
    return {
      titulo: pagina.titulo,
      descricao: pagina.descricao || '',
      tema: pagina.tema || LINKS_APARENCIA_PADRAO.tema,
      corPrincipal: pagina.corPrincipal || LINKS_APARENCIA_PADRAO.corPrincipal,
      corFundo: pagina.corFundo || LINKS_APARENCIA_PADRAO.corFundo,
      formatoBotao: pagina.formatoBotao || LINKS_APARENCIA_PADRAO.formatoBotao,
    };
  }

  private aplicarEstadoFormulario(estado: PaginaLinksRequest): void {
    this.form.patchValue({
      titulo: estado.titulo,
      descricao: estado.descricao || '',
      tema: estado.tema || LINKS_APARENCIA_PADRAO.tema,
      corPrincipal: estado.corPrincipal || LINKS_APARENCIA_PADRAO.corPrincipal,
      corFundo: estado.corFundo || LINKS_APARENCIA_PADRAO.corFundo,
      formatoBotao: estado.formatoBotao || LINKS_APARENCIA_PADRAO.formatoBotao,
    });
  }

  private atualizarIdentidade(identidade: LinksIdentidadePublica): void {
    this.identidade = identidade;
  }

  private payloadPagina(): PaginaLinksRequest {
    return {
      titulo: this.tituloControl.value?.trim() || '',
      descricao: this.descricaoControl.value?.trim() || null,
      tema: this.temaControl.value || LINKS_APARENCIA_PADRAO.tema,
      corPrincipal: (this.corPrincipalControl.value || LINKS_APARENCIA_PADRAO.corPrincipal).toUpperCase(),
      corFundo: (this.corFundoControl.value || LINKS_APARENCIA_PADRAO.corFundo).toUpperCase(),
      formatoBotao: this.formatoBotaoControl.value || LINKS_APARENCIA_PADRAO.formatoBotao,
    };
  }

  private normalizarPayload(payload: PaginaLinksRequest): PaginaLinksRequest {
    return {
      ...payload,
      titulo: String(payload.titulo || '').trim(),
      descricao: payload.descricao ? String(payload.descricao).trim() : null,
      corPrincipal: (payload.corPrincipal || LINKS_APARENCIA_PADRAO.corPrincipal).toUpperCase(),
      corFundo: (payload.corFundo || LINKS_APARENCIA_PADRAO.corFundo).toUpperCase(),
    };
  }

  podeVer(): boolean {
    return this.authService.temPermissao(LINKS_PERMISSOES.ver);
  }

  podeEditarPagina(): boolean {
    return this.authService.temPermissao(this.isNova ? LINKS_PERMISSOES.criar : LINKS_PERMISSOES.editar);
  }

  podePublicar(): boolean {
    return this.authService.temPermissao(LINKS_PERMISSOES.publicar);
  }

  podeExcluir(): boolean {
    return this.authService.temPermissao(LINKS_PERMISSOES.excluir);
  }

  private tratarErro(error: HttpErrorResponse, fallback: string): void {
    this.carregando = false;
    this.salvandoPagina = false;
    this.salvandoItem = false;
    this.publicando = false;
    this.excluindo = false;

    if (error.status === 403) {
      if (!this.pagina && !this.isNova) {
        this.semPermissao = true;
      }
      this.toastr.warning('Você não possui permissão para esta ação.');
      return;
    }
    if (error.status === 404) {
      if (!this.pagina && !this.isNova) {
        this.erro = 'A página solicitada não foi encontrada.';
      }
      this.toastr.warning('Registro não encontrado.');
      return;
    }
    if (error.status === 409) {
      this.toastr.warning(error.error?.message || 'Há um conflito nos dados enviados.');
      return;
    }

    const message = String(error.error?.message || error.error?.erro || '');
    if (message.includes('identidade') || message.includes('slug') || message.includes('SLUG')) {
      this.toastr.warning('Configure os dados da empresa antes de publicar.');
      return;
    }
    const texto = message || fallback;
    if (!this.pagina && !this.isNova) {
      this.erro = texto;
    }
    this.toastr.error(texto);
  }

  get tituloControl(): FormControl<string | null> {
    return this.form.get('titulo') as FormControl<string | null>;
  }

  get temaControl(): FormControl<TemaPaginaLinks | null> {
    return this.form.get('tema') as FormControl<TemaPaginaLinks | null>;
  }

  get corPrincipalControl(): FormControl<string | null> {
    return this.form.get('corPrincipal') as FormControl<string | null>;
  }

  get corFundoControl(): FormControl<string | null> {
    return this.form.get('corFundo') as FormControl<string | null>;
  }

  get formatoBotaoControl(): FormControl<FormatoBotaoLinks | null> {
    return this.form.get('formatoBotao') as FormControl<FormatoBotaoLinks | null>;
  }

  get descricaoControl(): FormControl<string | null> {
    return this.form.get('descricao') as FormControl<string | null>;
  }
}
