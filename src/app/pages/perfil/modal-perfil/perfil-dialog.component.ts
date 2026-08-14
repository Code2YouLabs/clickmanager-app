import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ToastrService } from 'ngx-toastr';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { TablerIconsModule } from 'angular-tabler-icons';
import { PermissaoCatalogo } from 'src/app/models/permissao.model';

interface RecursoPermissaoView {
  codigo: string;
  titulo: string;
  permissoes: PermissaoCatalogo[];
  total: number;
}

interface ModuloPermissaoView {
  codigo: string;
  titulo: string;
  ordem: number;
  recursos: RecursoPermissaoView[];
  total: number;
}

@Component({
  selector: 'app-perfil-dialog',
  standalone: true,
  templateUrl: './perfil-dialog.component.html',
  styleUrls: ['./perfil-dialog.component.scss'],
  imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatCheckboxModule,
        InputTextoRestritoComponent,
        TablerIconsModule
      ]
})
export class PerfilDialogComponent implements OnInit {
    form!: FormGroup;
    modulos: ModuloPermissaoView[] = [];
    modulosFiltrados: ModuloPermissaoView[] = [];
    permissoesCatalogo: PermissaoCatalogo[] = [];
    avisoProprietario = false;
    termoBusca = '';
    somenteSelecionadas = false;
    private modulosExpandidos = new Set<string>();
    private recursosExpandidos = new Set<string>();
  
    constructor(
      private fb: NonNullableFormBuilder,
      private dialogRef: MatDialogRef<PerfilDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any,
      private toastr: ToastrService
    ) {}
  
    ngOnInit(): void {
      this.permissoesCatalogo = this.normalizarCatalogo(this.data?.permissoesCatalogo || []);
      this.modulos = this.agruparPermissoes(this.permissoesCatalogo);
      this.inicializarExpansao();
      this.avisoProprietario = !!this.data?.perfilProprietario;
      const permissoesObj = Object.fromEntries(
        this.permissoesCatalogo.map(permissao => [this.controlName(permissao), !!permissao.selecionada])
      );
    
      this.form = this.fb.group({
        nome: ['', Validators.required],
        descricao: [''],
        permissoes: this.fb.group(permissoesObj)
      });
    
      if (this.data?.perfil) {
        this.form.patchValue({
          nome: this.data.perfil.nome,
          descricao: this.data.perfil.descricao
        });
      }
      this.atualizarFiltroVisual();
    } 
  
    salvar(): void {
      if (this.form.invalid) {
        this.toastr.warning('Preencha todos os campos obrigatórios corretamente.', 'Formulário inválido');
        return;
      }
  
      this.dialogRef.close({
        event: 'Save',
        data: this.form.getRawValue()
      });
    }
  
    cancelar(): void {
      this.dialogRef.close();
    }
  
    getPermissaoControl(chave: string): FormControl<boolean> {
      return this.form.get('permissoes.' + chave) as FormControl<boolean>;
    }

    get permissoesGroup(): FormGroup {
      return this.form.get('permissoes') as FormGroup;
    }

    get nomeControl(): FormControl {
      return this.form.get('nome') as FormControl;
    }

    get descricaoControl(): FormControl {
      return this.form.get('descricao') as FormControl;
    }

    get todasSelecionadas(): boolean {
      const permissoes = this.permissoesVisiveis();
      return permissoes.length > 0 && permissoes.every(permissao => this.isSelecionada(permissao));
    }

    get algumasSelecionadas(): boolean {
      const permissoes = this.permissoesVisiveis();
      return !this.todasSelecionadas && permissoes.some(permissao => this.isSelecionada(permissao));
    }

    get totalPermissoes(): number {
      return this.permissoesCatalogo.length;
    }

    get totalSelecionadas(): number {
      return this.permissoesCatalogo.filter(permissao => this.isSelecionada(permissao)).length;
    }

    get semResultado(): boolean {
      return this.totalPermissoes > 0 && this.modulosFiltrados.length === 0;
    }

    onBuscaChange(valor: string): void {
      this.termoBusca = valor;
      this.atualizarFiltroVisual();
    }

    alternarSomenteSelecionadas(checked: boolean): void {
      this.somenteSelecionadas = checked;
      this.atualizarFiltroVisual();
    }

    selecionarTodos(checked: boolean): void {
      this.setPermissoes(this.permissoesVisiveis(), checked);
    }

    controlName(permissao: PermissaoCatalogo): string {
      return String(permissao.id);
    }

    labelAcao(permissao: PermissaoCatalogo): string {
      const titulo = (permissao.titulo || '').trim();
      const acao = (permissao.acao || '').trim();
      const recursoTitulo = (permissao.recursoTitulo || '').trim();

      if (titulo && acao && recursoTitulo && !titulo.toUpperCase().includes(acao.toUpperCase())) {
        return titulo;
      }

      return this.formatarAcao(acao || permissao.chave);
    }

    descricaoAcao(permissao: PermissaoCatalogo): string | null {
      return permissao.descricao || permissao.titulo || null;
    }

    moduloSelecionado(modulo: ModuloPermissaoView): boolean {
      const permissoes = this.permissoesDoModulo(modulo);
      return permissoes.length > 0 && permissoes.every(permissao => this.isSelecionada(permissao));
    }

    moduloParcial(modulo: ModuloPermissaoView): boolean {
      const permissoes = this.permissoesDoModulo(modulo);
      return permissoes.some(permissao => this.isSelecionada(permissao)) && !this.moduloSelecionado(modulo);
    }

    selecionarModulo(modulo: ModuloPermissaoView, checked: boolean): void {
      this.setPermissoes(this.permissoesDoModulo(modulo), checked);
    }

    recursoSelecionado(recurso: RecursoPermissaoView): boolean {
      return recurso.permissoes.length > 0 && recurso.permissoes.every(permissao => this.isSelecionada(permissao));
    }

    recursoParcial(recurso: RecursoPermissaoView): boolean {
      return recurso.permissoes.some(permissao => this.isSelecionada(permissao)) && !this.recursoSelecionado(recurso);
    }

    selecionarRecurso(recurso: RecursoPermissaoView, checked: boolean): void {
      this.setPermissoes(recurso.permissoes, checked);
    }

    alternarModulo(modulo: ModuloPermissaoView): void {
      this.setModuloExpandido(modulo.codigo, !this.moduloExpandido(modulo));
    }

    moduloExpandido(modulo: ModuloPermissaoView): boolean {
      return this.modulosExpandidos.has(modulo.codigo);
    }

    alternarRecurso(modulo: ModuloPermissaoView, recurso: RecursoPermissaoView): void {
      const chave = this.chaveRecurso(modulo.codigo, recurso.codigo);
      this.setRecursoExpandido(chave, !this.recursosExpandidos.has(chave));
    }

    recursoExpandido(modulo: ModuloPermissaoView, recurso: RecursoPermissaoView): boolean {
      return this.recursosExpandidos.has(this.chaveRecurso(modulo.codigo, recurso.codigo));
    }

    contadorModulo(modulo: ModuloPermissaoView): string {
      return `${this.contarSelecionadas(this.permissoesDoModulo(modulo))}/${modulo.total}`;
    }

    contadorRecurso(recurso: RecursoPermissaoView): string {
      return `${this.contarSelecionadas(recurso.permissoes)}/${recurso.total}`;
    }

    textoDisponiveis(): string {
      return this.totalPermissoes === 1 ? '1 disponivel' : `${this.totalPermissoes} disponiveis`;
    }

    trackModulo(_: number, modulo: ModuloPermissaoView): string {
      return modulo.codigo;
    }

    trackRecurso(_: number, recurso: RecursoPermissaoView): string {
      return recurso.codigo;
    }

    trackPermissao(_: number, permissao: PermissaoCatalogo): number {
      return permissao.id;
    }

    private normalizarCatalogo(permissoes: PermissaoCatalogo[]): PermissaoCatalogo[] {
      const perfilChaves = new Set<string>((this.data?.perfil?.permissoes || []).map((p: any) => p?.chave).filter(Boolean));
      const perfilIds = new Set<number>((this.data?.perfil?.permissoes || []).map((p: any) => p?.id).filter((id: any) => typeof id === 'number'));

      return permissoes
        .filter(permissao => typeof permissao?.id === 'number' && !!permissao.chave)
        .map(permissao => ({
          ...permissao,
          selecionada: !!permissao.selecionada || perfilIds.has(permissao.id) || perfilChaves.has(permissao.chave)
        }));
    }

    private agruparPermissoes(permissoes: PermissaoCatalogo[]): ModuloPermissaoView[] {
      const modulos = new Map<string, ModuloPermissaoView>();

      for (const permissao of permissoes) {
        const moduloCodigo = permissao.modulo?.codigo || 'GERAL';
        const moduloTitulo = permissao.modulo?.titulo || 'Geral';
        const moduloOrdem = permissao.modulo?.ordem ?? 9999;
        const recursoCodigo = permissao.recurso || 'GERAL';
        const recursoTitulo = permissao.recursoTitulo || this.formatarAcao(recursoCodigo);

        if (!modulos.has(moduloCodigo)) {
          modulos.set(moduloCodigo, {
            codigo: moduloCodigo,
            titulo: moduloTitulo,
            ordem: moduloOrdem,
            recursos: [],
            total: 0
          });
        }

        const modulo = modulos.get(moduloCodigo)!;
        let recurso = modulo.recursos.find(item => item.codigo === recursoCodigo);
        if (!recurso) {
          recurso = { codigo: recursoCodigo, titulo: recursoTitulo, permissoes: [], total: 0 };
          modulo.recursos.push(recurso);
        }
        recurso.permissoes.push(permissao);
      }

      return Array.from(modulos.values())
        .map(modulo => ({
          ...modulo,
          recursos: modulo.recursos
            .map(recurso => ({
              ...recurso,
              total: recurso.permissoes.length,
              permissoes: recurso.permissoes.sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999) || a.titulo.localeCompare(b.titulo))
            }))
            .sort((a, b) => a.titulo.localeCompare(b.titulo)),
          total: this.permissoesDoModulo(modulo).length
        }))
        .sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo));
    }

    private formatarAcao(valor: string): string {
      const conhecidas: Record<string, string> = {
        VER: 'Visualizar',
        CADASTRAR: 'Cadastrar',
        CRIAR: 'Criar',
        EDITAR: 'Editar',
        EXCLUIR: 'Excluir',
        EXECUTAR: 'Executar',
        CONFIGURAR: 'Configurar',
        GERENCIAR: 'Gerenciar',
        AFASTAR: 'Afastar',
        DESLIGAR: 'Desligar',
        ENVIAR: 'Enviar',
        ENVIAR_GLOBAL: 'Enviar global'
      };

      const chave = (valor || '').toUpperCase();
      if (conhecidas[chave]) {
        return conhecidas[chave];
      }

      return chave
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(' ');
    }

    private permissoesDoModulo(modulo: ModuloPermissaoView): PermissaoCatalogo[] {
      return modulo.recursos.flatMap(recurso => recurso.permissoes);
    }

    private isSelecionada(permissao: PermissaoCatalogo): boolean {
      return !!this.permissoesGroup?.get(this.controlName(permissao))?.value;
    }

    private setPermissoes(permissoes: PermissaoCatalogo[], checked: boolean): void {
      permissoes.forEach(permissao => {
        this.permissoesGroup.get(this.controlName(permissao))?.setValue(checked);
      });
      this.atualizarFiltroVisual();
    }

    private inicializarExpansao(): void {
      this.modulosExpandidos.clear();
      this.recursosExpandidos.clear();

      for (const modulo of this.modulos) {
        const moduloPossuiSelecionada = this.permissoesDoModulo(modulo).some(permissao => !!permissao.selecionada);
        if (moduloPossuiSelecionada) {
          this.setModuloExpandido(modulo.codigo, true);
        }

        for (const recurso of modulo.recursos) {
          const recursoPossuiSelecionada = recurso.permissoes.some(permissao => !!permissao.selecionada);
          if (moduloPossuiSelecionada && recursoPossuiSelecionada) {
            this.setRecursoExpandido(this.chaveRecurso(modulo.codigo, recurso.codigo), true);
          }
        }
      }
    }

    atualizarFiltroVisual(): void {
      const termo = this.normalizarTexto(this.termoBusca);
      const filtrando = !!termo || this.somenteSelecionadas;

      this.modulosFiltrados = this.modulos
        .map(modulo => {
          const moduloCombina = this.combinaModulo(modulo, termo);
          const recursos = modulo.recursos
            .map(recurso => {
              const recursoCombina = moduloCombina || this.combinaRecurso(recurso, termo);
              const permissoes = recurso.permissoes.filter(permissao => {
                const combinaBusca = !termo || recursoCombina || this.combinaPermissao(permissao, termo);
                const combinaSelecao = !this.somenteSelecionadas || this.isSelecionada(permissao);
                return combinaBusca && combinaSelecao;
              });

              return permissoes.length ? { ...recurso, permissoes } : null;
            })
            .filter((recurso): recurso is RecursoPermissaoView => !!recurso);

          return recursos.length ? { ...modulo, recursos } : null;
        })
        .filter((modulo): modulo is ModuloPermissaoView => !!modulo);

      if (filtrando) {
        this.modulosFiltrados.forEach(modulo => {
          this.setModuloExpandido(modulo.codigo, true);
          modulo.recursos.forEach(recurso => this.setRecursoExpandido(this.chaveRecurso(modulo.codigo, recurso.codigo), true));
        });
      }
    }

    private permissoesVisiveis(): PermissaoCatalogo[] {
      return this.modulosFiltrados.flatMap(modulo => this.permissoesDoModulo(modulo));
    }

    private contarSelecionadas(permissoes: PermissaoCatalogo[]): number {
      return permissoes.filter(permissao => this.isSelecionada(permissao)).length;
    }

    private combinaModulo(modulo: ModuloPermissaoView, termo: string): boolean {
      return !!termo && [modulo.codigo, modulo.titulo].some(valor => this.normalizarTexto(valor).includes(termo));
    }

    private combinaRecurso(recurso: RecursoPermissaoView, termo: string): boolean {
      return !!termo && [recurso.codigo, recurso.titulo].some(valor => this.normalizarTexto(valor).includes(termo));
    }

    private combinaPermissao(permissao: PermissaoCatalogo, termo: string): boolean {
      return [
        permissao.chave,
        permissao.titulo,
        permissao.descricao,
        permissao.acao,
        permissao.recurso,
        permissao.recursoTitulo,
        permissao.modulo?.codigo,
        permissao.modulo?.titulo
      ].some(valor => this.normalizarTexto(valor).includes(termo));
    }

    private normalizarTexto(valor: string | null | undefined): string {
      return (valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    }

    private chaveRecurso(moduloCodigo: string, recursoCodigo: string): string {
      return `${moduloCodigo}::${recursoCodigo}`;
    }

    private setModuloExpandido(codigo: string, expandido: boolean): void {
      if (expandido) {
        this.modulosExpandidos.add(codigo);
      } else {
        this.modulosExpandidos.delete(codigo);
      }
    }

    private setRecursoExpandido(chave: string, expandido: boolean): void {
      if (expandido) {
        this.recursosExpandidos.add(chave);
      } else {
        this.recursosExpandidos.delete(chave);
      }
    }
  }
