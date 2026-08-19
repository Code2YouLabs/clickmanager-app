import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
import { LinksItemDialogComponent } from '../../components/item-dialog/links-item-dialog.component';
import {
  LINKS_PERMISSOES,
  LinksIdentidadePublica,
  PaginaLinksDetalhe,
  PaginaLinksItem,
  PaginaLinksItemRequest,
  TIPOS_ITEM_LINKS,
  TipoItemLinks,
} from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { buildClickLinkPublicUrl, normalizeSlugInput } from '../../utils/links-url.util';

type SlugStatus = 'nao-verificado' | 'verificando' | 'disponivel' | 'indisponivel' | 'invalido' | 'erro';

@Component({
  selector: 'app-links-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, TemPermissaoDirective],
  templateUrl: './links-editor.component.html',
  styleUrls: ['../../links.scss', './links-editor.component.scss'],
})
export class LinksEditorComponent implements OnInit, OnDestroy {
  @ViewChild('logoInput') logoInput?: ElementRef<HTMLInputElement>;

  pagina: PaginaLinksDetalhe | null = null;
  identidade: LinksIdentidadePublica | null = null;
  carregando = true;
  salvandoPagina = false;
  salvandoItem = false;
  publicando = false;
  salvandoLogo = false;
  salvandoSlug = false;
  slugStatus: SlugStatus = 'nao-verificado';
  slugNormalizado = '';
  slugDisponivel = false;
  logoPreview: string | ArrayBuffer | null = null;

  readonly isNova = this.route.snapshot.routeConfig?.path === 'nova';
  readonly paginaId = Number(this.route.snapshot.paramMap.get('id'));
  readonly permissoes = LINKS_PERMISSOES;
  readonly tipos = TIPOS_ITEM_LINKS;
  readonly IMAGEM_PADRAO = './assets/images/logos/LogoPadrao.png';

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(120)]],
    descricao: ['', [Validators.maxLength(500)]],
  });

  readonly slugControl = new FormControl('', [Validators.maxLength(80)]);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly linksService: LinksService,
    private readonly identidadeService: EmpresaIdentidadePublicaService,
    public readonly authService: AuthService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.configurarDebounceSlug();
    this.carregarIdentidade(() => {
      if (this.isNova) {
        this.prepararNovaPagina();
      } else {
        this.carregarPagina();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
        this.atualizarPagina(pagina);
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

  alterarPublicacao(publicada: boolean): void {
    if (!this.pagina) return;
    if (publicada && !this.identidade?.slug) {
      this.toastr.warning('Para publicar sua página, defina primeiro um endereço público.');
      return;
    }
    this.publicando = true;
    this.linksService.alterarPublicacao(this.pagina.id, publicada).subscribe({
      next: (pagina) => {
        this.publicando = false;
        this.atualizarPagina(pagina);
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
        this.atualizarPagina(pagina);
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
          this.carregarPagina();
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
        this.atualizarPagina(pagina);
        this.toastr.success('Ordem atualizada.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível ordenar os links.'),
    });
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    ImagemUtil.processarImagemSelecionada(file, 216, 340, 0.8, 'contain')
      .then(({ preview, blob }) => {
        this.logoPreview = preview;
        const processed = new File([blob], file.name, { type: blob.type });
        this.salvandoLogo = true;
        this.identidadeService.alterarLogo(processed).subscribe({
          next: (identidade) => {
            this.salvandoLogo = false;
            this.atualizarIdentidade(identidade);
            this.toastr.success('Logo atualizada.');
          },
          error: (error) => this.tratarErro(error, 'Não foi possível alterar a logo.'),
        });
      })
      .catch((error) => this.toastr.warning(error));
  }

  removerLogo(): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Remover logo',
        message: 'Remover a logo da Empresa usada no ClickLink?',
        confirmText: 'Remover',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.salvandoLogo = true;
      this.identidadeService.removerLogo().subscribe({
        next: (identidade) => {
          this.salvandoLogo = false;
          this.logoPreview = null;
          this.atualizarIdentidade(identidade);
          this.toastr.success('Logo removida.');
        },
        error: (error) => this.tratarErro(error, 'Não foi possível remover a logo.'),
      });
    });
  }

  salvarSlug(): void {
    const slug = normalizeSlugInput(this.slugControl.value);
    if (!slug) {
      this.slugStatus = 'invalido';
      return;
    }
    if (this.identidade?.slug && slug !== this.identidade.slug) {
      this.confirmarAlteracaoSlug(slug);
      return;
    }
    this.enviarSlug(slug);
  }

  urlPublica(): string {
    return buildClickLinkPublicUrl(this.identidade?.slug);
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

  podeEditarEmpresa(): boolean {
    return this.authService.temPermissao(this.permissoes.dadosEmpresa);
  }

  private configurarDebounceSlug(): void {
    this.slugControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe((value) => {
      const slug = normalizeSlugInput(value);
      if (!slug) {
        this.slugStatus = 'nao-verificado';
        this.slugNormalizado = '';
        this.slugDisponivel = false;
        return;
      }
      this.verificarSlug(slug);
    });
  }

  private verificarSlug(slug: string): void {
    this.slugStatus = 'verificando';
    this.identidadeService.verificarSlug(slug).subscribe({
      next: (response) => {
        this.slugNormalizado = response.slug;
        this.slugDisponivel = response.disponivel;
        this.slugStatus = response.disponivel ? 'disponivel' : 'indisponivel';
      },
      error: () => {
        this.slugDisponivel = false;
        this.slugStatus = 'erro';
      },
    });
  }

  private confirmarAlteracaoSlug(slug: string): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'Alterar endereço público',
        message: 'Ao alterar o endereço, links e QR Codes que usam o endereço anterior podem deixar de funcionar.',
        confirmText: 'Alterar',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (ok) this.enviarSlug(slug);
    });
  }

  private enviarSlug(slug: string): void {
    this.salvandoSlug = true;
    this.identidadeService.alterarSlug(slug).subscribe({
      next: (identidade) => {
        this.salvandoSlug = false;
        this.atualizarIdentidade(identidade);
        this.slugStatus = 'disponivel';
        this.toastr.success('Endereço público atualizado.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível alterar o endereço público.'),
    });
  }

  private adicionarItem(payload: PaginaLinksItemRequest): void {
    if (!this.pagina) return;
    this.salvandoItem = true;
    this.linksService.adicionarItem(this.pagina.id, payload).subscribe({
      next: (pagina) => {
        this.salvandoItem = false;
        this.atualizarPagina(pagina);
        this.toastr.success('Link adicionado.');
      },
      error: (error) => this.tratarErro(error, 'Não foi possível adicionar o link.'),
    });
  }

  private editarItem(item: PaginaLinksItem, payload: PaginaLinksItemRequest): void {
    if (!this.pagina) return;
    this.salvandoItem = true;
    this.linksService.editarItem(this.pagina.id, item.id, payload).subscribe({
      next: (pagina) => {
        this.salvandoItem = false;
        this.atualizarPagina(pagina);
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
    this.form.patchValue({
      titulo: this.identidade?.nome || '',
      descricao: '',
    });
  }

  private carregarPagina(): void {
    this.carregando = true;
    this.linksService.buscarPagina(this.paginaId).subscribe({
      next: (pagina) => {
        this.carregando = false;
        this.atualizarPagina(pagina);
      },
      error: (error) => this.tratarErro(error, 'Não foi possível carregar a página.'),
    });
  }

  private atualizarPagina(pagina: PaginaLinksDetalhe): void {
    this.pagina = pagina;
    this.form.patchValue({
      titulo: pagina.titulo,
      descricao: pagina.descricao || '',
    });
    if (pagina.identidade) {
      this.atualizarIdentidade(pagina.identidade);
    }
  }

  private atualizarIdentidade(identidade: LinksIdentidadePublica): void {
    this.identidade = identidade;
    this.logoPreview = identidade.logoUrl || null;
    this.slugControl.setValue(identidade.slug || '', { emitEvent: false });
    this.slugNormalizado = identidade.slug || '';
    this.slugStatus = identidade.slug ? 'disponivel' : 'nao-verificado';
    this.slugDisponivel = !!identidade.slug;
  }

  private payloadPagina() {
    return {
      titulo: this.tituloControl.value?.trim() || '',
      descricao: this.descricaoControl.value?.trim() || null,
      principal: this.pagina?.principal ?? null,
    };
  }

  private tratarErro(error: HttpErrorResponse, fallback: string): void {
    this.carregando = false;
    this.salvandoPagina = false;
    this.salvandoItem = false;
    this.publicando = false;
    this.salvandoLogo = false;
    this.salvandoSlug = false;

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
      this.toastr.warning('Defina o endereço público da empresa antes de publicar.');
      return;
    }
    this.toastr.error(message || fallback);
  }

  get tituloControl(): FormControl<string | null> {
    return this.form.get('titulo') as FormControl<string | null>;
  }

  get descricaoControl(): FormControl<string | null> {
    return this.form.get('descricao') as FormControl<string | null>;
  }
}
