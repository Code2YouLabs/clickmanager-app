import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { filter, take } from 'rxjs';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { Empresa } from 'src/app/models/empresa/empresa.model';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
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
    CardHeaderComponent,
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
  empresa: Empresa | null = null;
  carregando = true;
  salvandoPagina = false;
  salvandoItem = false;
  publicando = false;
  arquivando = false;
  abaSelecionada = 0;

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
  readonly colunasItens = ['tipo', 'titulo', 'subtitulo', 'status', 'ordem', 'acoes'];

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(120)]],
    descricao: ['', [Validators.maxLength(500)]],
    tema: [LINKS_APARENCIA_PADRAO.tema as TemaPaginaLinks, [Validators.required]],
    corPrincipal: [LINKS_APARENCIA_PADRAO.corPrincipal as string, [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    corFundo: [LINKS_APARENCIA_PADRAO.corFundo as string, [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
    formatoBotao: [LINKS_APARENCIA_PADRAO.formatoBotao as FormatoBotaoLinks, [Validators.required]],
  });

  private estadoPersistido: PaginaLinksRequest | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly linksService: LinksService,
    private readonly identidadeService: EmpresaIdentidadePublicaService,
    private readonly empresaService: EmpresaFormService,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.carregarDadosEmpresa();
    this.carregarIdentidade(() => {
      if (this.isNova) {
        this.prepararNovaPagina();
      } else {
        this.carregarPagina();
      }
    });
  }

  salvarOuCriar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Informe um título válido para a página.');
      return;
    }
    this.isNova ? this.criarPagina() : this.salvarPagina();
  }

  salvarPagina(): void {
    if (!this.pagina) return;
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

  cancelarAlteracoes(): void {
    if (!this.estadoPersistido) return;
    this.aplicarEstadoFormulario(this.estadoPersistido);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.toastr.info('Alterações do formulário descartadas.');
  }

  alterarPublicacao(publicada: boolean): void {
    if (!this.pagina) return;
    if (publicada && !this.identidade?.slug) {
      this.toastr.warning('Configure os dados da empresa antes de publicar.');
      return;
    }
    if (publicada && this.temAlteracoesFormulario()) {
      this.toastr.warning('Salve as alterações antes de publicar.');
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

  abrirItem(item?: PaginaLinksItem): void {
    if (!this.pagina) return;
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
    if (!this.pagina) return;
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
    if (!this.pagina) return;
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
    if (!this.pagina) return;
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

  arquivarPagina(): void {
    if (!this.pagina) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Arquivar página',
        message: `Arquivar "${this.pagina.titulo}"? Ela deixará de aparecer no ClickLink público.`,
        confirmText: 'Arquivar',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok || !this.pagina) return;
      this.arquivando = true;
      this.linksService.arquivarPagina(this.pagina.id).subscribe({
        next: () => {
          this.arquivando = false;
          this.toastr.success('Página arquivada.');
          this.router.navigate(['/page/links/paginas']);
        },
        error: (error) => this.tratarErro(error, 'Não foi possível arquivar a página.'),
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
    if (!this.pagina) return;
    this.adicionarItem({
      tipo: sugestao.tipo,
      titulo: sugestao.titulo,
      subtitulo: sugestao.subtitulo,
      url: sugestao.url,
      ordem: this.itensOrdenados().length,
    });
  }

  urlPublica(): string {
    return buildClickLinkPublicUrl(this.identidade?.slug);
  }

  previewModel(): LinksPreviewModel {
    return {
      titulo: this.tituloControl.value?.trim() || this.identidade?.nome || 'ClickLink',
      descricao: this.descricaoControl.value?.trim() || null,
      identidade: {
        nome: this.identidade?.nome || null,
        slug: this.identidade?.slug || null,
        logoUrl: this.identidade?.logoUrl || null,
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

  tipoLabel(tipo: TipoItemLinks): string {
    return this.tipos.find((item) => item.tipo === tipo)?.label || tipo;
  }

  tipoIcon(tipo: TipoItemLinks): string {
    return this.tipos.find((item) => item.tipo === tipo)?.icon || 'link';
  }

  temAlteracoesFormulario(): boolean {
    if (!this.estadoPersistido) return false;
    return JSON.stringify(this.payloadPagina()) !== JSON.stringify(this.estadoPersistido);
  }

  private adicionarItem(payload: PaginaLinksItemRequest): void {
    if (!this.pagina) return;
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

  private carregarDadosEmpresa(): void {
    this.authService.usuario$
      .pipe(filter((usuario) => !!usuario?.empresa?.id), take(1))
      .subscribe((usuario) => {
        const empresaId = usuario?.empresa?.id;
        if (!empresaId) return;
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

  private prepararNovaPagina(): void {
    this.carregando = false;
    this.aplicarEstadoFormulario({
      titulo: this.identidade?.nome || '',
      descricao: '',
      principal: null,
      tema: LINKS_APARENCIA_PADRAO.tema,
      corPrincipal: LINKS_APARENCIA_PADRAO.corPrincipal,
      corFundo: LINKS_APARENCIA_PADRAO.corFundo,
      formatoBotao: LINKS_APARENCIA_PADRAO.formatoBotao,
    });
    this.estadoPersistido = this.payloadPagina();
    this.form.markAsPristine();
  }

  private carregarPagina(atualizarSnapshot = true): void {
    this.carregando = true;
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
      this.estadoPersistido = { ...estado };
      this.form.markAsPristine();
    }
    if (pagina.identidade) {
      this.atualizarIdentidade(pagina.identidade);
    }
  }

  private estadoFormularioDaPagina(pagina: PaginaLinksDetalhe): PaginaLinksRequest {
    return {
      titulo: pagina.titulo,
      descricao: pagina.descricao || '',
      principal: pagina.principal ?? null,
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
      principal: this.pagina?.principal ?? null,
      tema: this.temaControl.value || LINKS_APARENCIA_PADRAO.tema,
      corPrincipal: (this.corPrincipalControl.value || LINKS_APARENCIA_PADRAO.corPrincipal).toUpperCase(),
      corFundo: (this.corFundoControl.value || LINKS_APARENCIA_PADRAO.corFundo).toUpperCase(),
      formatoBotao: this.formatoBotaoControl.value || LINKS_APARENCIA_PADRAO.formatoBotao,
    };
  }

  private tratarErro(error: HttpErrorResponse, fallback: string): void {
    this.carregando = false;
    this.salvandoPagina = false;
    this.salvandoItem = false;
    this.publicando = false;
    this.arquivando = false;

    if (error.status === 403) {
      this.toastr.warning('Você não possui permissão para esta ação.');
      return;
    }
    if (error.status === 404) {
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
    this.toastr.error(message || fallback);
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
