import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject, takeUntil, tap, timeout } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { MessageWorkspaceComponent } from 'src/app/components/message-workspace/message-workspace.component';
import { InputTelefoneComponent } from 'src/app/components/inputs/input-telefone/input-telefone.component';
import { TelefonePipe } from 'src/app/pipe/telefone.pipe';
import { ClienteService } from 'src/app/pages/cliente/cliente.service';
import { ClienteResponse } from 'src/app/models/cliente/cliente-response.model';
import { abrirCadastroRapido } from 'src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from 'src/app/services/auth.service';
import { ClickWhatsAppService } from '../clickwhatsapp.service';
import { ClickWhatsAppEnvioStore } from '../clickwhatsapp-envio.store';
import { Configuracao, Conversa, DestinatarioConversa, Detalhe, Filtro, falha, FASES, CONFIRMACOES } from '../clickwhatsapp.models';

@Component({
  selector: 'app-clickwhatsapp-conversas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule, MessageWorkspaceComponent,
    InputTelefoneComponent, TelefonePipe],
  templateUrl: './conversas.component.html',
  styleUrl: './conversas.component.scss',
})
export class ConversasComponent implements OnChanges {
  private readonly api = inject(ClickWhatsAppService);
  private readonly clientes = inject(ClienteService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  private readonly envios = inject(ClickWhatsAppEnvioStore);
  private readonly cancelarLista = new Subject<void>();
  private readonly cancelarMensagens = new Subject<void>();
  private readonly cancelarClientes = new Subject<void>();
  @ViewChild('areaLista') areaLista?: ElementRef<HTMLElement>;
  @ViewChild('conversa') areaConversa?: ElementRef<HTMLElement>;
  @ViewChild('rolagem') rolagem?: ElementRef<HTMLElement>;
  @Input({ required: true }) config!: Configuracao;
  @Input({ required: true }) filtro!: Filtro;
  @Input() mobile = false;
  @Input() enviando = false;
  @Input() erroEnvio = '';
  @Input() podeRepetir = false;
  @Output() ocupado = new EventEmitter<boolean>(true);
  @Output() filtros = new EventEmitter<void>();
  @Output() registrar = new EventEmitter<{ destino: DestinatarioConversa; texto: string }>();
  @Output() repetir = new EventEmitter<void>();
  @Output() descartar = new EventEmitter<void>();
  @Output() detalhe = new EventEmitter<Detalhe>();
  readonly pesquisa = new FormControl('', { nonNullable: true });
  readonly pesquisaCliente = new FormControl('', { nonNullable: true });
  readonly telefone = new FormControl('', { nonNullable: true });
  readonly origens = {
    AVULSA: { rotulo: 'Mensagem avulsa', icone: 'chat_bubble_outline', estilo: 'avulsa' },
    PEDIDO_MANUAL: { rotulo: 'Pedido manual', icone: 'receipt_long', estilo: 'manual' },
    ORCAMENTO_MANUAL: { rotulo: 'Orçamento manual', icone: 'request_quote', estilo: 'manual' },
    PEDIDO_AUTOMATICO: { rotulo: 'Automação de pedido', icone: 'bolt', estilo: 'automatica' },
    NAO_IDENTIFICADA: { rotulo: 'Origem indisponível', icone: 'mail_outline', estilo: '' },
  };
  readonly fases = FASES;
  readonly confirmacoes = CONFIRMACOES;
  conversas: Conversa[] = [];
  mensagens: Detalhe[] = [];
  clientesEncontrados: ClienteResponse[] = [];
  selecionada: Conversa | null = null;
  destino: DestinatarioConversa | null = null;
  escolhendo = false;
  clienteEscolhido: ClienteResponse | null = null;
  telefoneManual = false;
  salvandoTelefone = false;
  texto = '';
  pagina = 0;
  paginaMensagens = 0;
  temMais = false;
  temAnteriores = false;
  lendo = false;
  lendoMensagens = false;
  lendoClientes = false;
  erro = '';
  erroMensagens = '';
  erroClientes = '';
  private encerrado = false;
  private versao = 0;
  private versaoMensagens = 0;
  private versaoClientes = 0;
  private termo = '';
  private contexto = '';
  private cadastro?: ReturnType<typeof abrirCadastroRapido>;

  constructor() {
    this.pesquisa.valueChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroy))
      .subscribe(valor => {
        this.conversas = [];
        this.temMais = false;
        this.termo = valor.trim();
        if (!this.termo || this.termo.length >= 3) void this.carregar();
        else { this.cancelarLista.next(); this.versao++; this.lendo = false; this.ocupado.emit(false); this.erro = 'Digite pelo menos 3 caracteres.'; }
      });
    this.pesquisaCliente.valueChanges.pipe(
      tap(() => { this.clienteEscolhido = null; this.telefoneManual = false; }),
      debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroy),
    )
      .subscribe(() => void this.buscarClientes());
    this.destroy.onDestroy(() => {
      this.encerrado = true;
      this.versao++; this.versaoMensagens++; this.versaoClientes++;
      this.cancelarLista.next();
      this.cancelarMensagens.next();
      this.cancelarClientes.next();
      this.cadastro?.close();
    });
  }

  ngOnChanges(alteracoes: SimpleChanges) {
    if (!alteracoes['config'] && !alteracoes['filtro']) return;
    if (alteracoes['filtro'] && !alteracoes['filtro'].firstChange) {
      this.conversas = [];
      this.temMais = false;
      if (this.selecionada) void this.carregarMensagens();
    }
    const conexao = this.config?.conexao ?? '';
    if (conexao !== this.contexto) {
      this.contexto = conexao;
      this.voltar();
      this.conversas = [];
    }
    if (this.pendente && !this.destino) this.retomar();
    if (this.config?.acoesPermitidas.consultarHistorico
      && (alteracoes['filtro'] || alteracoes['config']?.firstChange
        || alteracoes['config']?.previousValue?.conexao !== conexao)) void this.carregar();
  }

  get pendente() { return this.envios.pendente; }
  get podeEnviar() { return !!this.config?.acoesPermitidas.enviarMensagem; }
  get podeCriarCliente() { return this.auth.temPermissao('CLIENTE_CADASTRAR'); }
  get podeEditarCliente() { return this.auth.temPermissao('CLIENTE_EDITAR'); }
  get numeroCliente() { return this.clienteEscolhido ? this.normalizar(this.clienteEscolhido.telefone || '') : null; }
  get podeContinuar() {
    if (this.salvandoTelefone || !this.podeEnviar) return false;
    if (this.telefoneManual) return this.numeroValido;
    return !!this.clienteEscolhido && (!!this.numeroCliente || (this.podeEditarCliente && this.numeroValido));
  }
  get filtrosAtivos() { return !!this.filtro.fase; }
  get numeroValido() { return this.telefone.valid && /^[1-9]\d{9,10}$/.test(this.telefone.value); }

  async carregar(mais = false) {
    if (mais && (this.lendo || !this.temMais)) return;
    if (!this.config.acoesPermitidas.consultarHistorico || (this.termo.length > 0 && this.termo.length < 3)) return;
    this.cancelarLista.next();
    const versao = ++this.versao;
    const pagina = mais ? this.pagina + 1 : 0;
    this.lendo = true;
    this.ocupado.emit(true);
    this.erro = '';
    try {
      const resposta = await firstValueFrom(this.api.conversas(this.filtro, this.termo, pagina)
        .pipe(takeUntil(this.cancelarLista), takeUntilDestroyed(this.destroy), timeout(15000)));
      if (versao !== this.versao) return;
      const anteriores = mais ? this.conversas : [];
      this.conversas = [...new Map([...anteriores, ...resposta.itens].map(c => [c.id, c])).values()];
      this.pagina = pagina;
      this.temMais = resposta.temMais;
      if (this.selecionada) {
        const atualizada = this.conversas.find(c => c.id === this.selecionada?.id);
        if (atualizada) this.selecionada = atualizada;
      } else if (this.destino) {
        const nova = this.conversas.find(c => this.mesmoDestinatario(c, this.destino!));
        if (nova) { this.selecionada = nova; void this.carregarMensagens(); }
      }
    } catch (erro) {
      if (versao === this.versao) this.erro = falha(erro).mensagem;
    } finally { if (versao === this.versao) { this.lendo = false; this.ocupado.emit(false); } }
  }

  atualizar() {
    if (this.lendo) return;
    void this.carregar();
    if (this.selecionada) void this.carregarMensagens();
  }

  selecionar(conversa: Conversa) {
    if (this.pendente) { this.retomar(); return; }
    this.selecionada = conversa;
    this.escolhendo = false;
    const numero = conversa.ultima.destinatario;
    this.destino = numero ? { numero, nome: conversa.ultima.nomeCliente || numero, clienteId: conversa.ultima.clienteId ?? undefined } : null;
    this.texto = '';
    this.paginaMensagens = 0;
    this.temAnteriores = false;
    this.mensagens = [];
    this.focarConversa();
    void this.carregarMensagens();
  }

  async carregarMensagens(anteriores = false) {
    if (!this.selecionada || (anteriores && (this.lendoMensagens || !this.temAnteriores))) return;
    this.cancelarMensagens.next();
    const versao = ++this.versaoMensagens;
    const pagina = anteriores ? this.paginaMensagens + 1 : 0;
    const el = this.rolagem?.nativeElement;
    const altura = el?.scrollHeight ?? 0;
    const topo = el?.scrollTop ?? 0;
    const noFim = this.mensagens.length === 0 || !el || el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    this.lendoMensagens = true;
    this.erroMensagens = '';
    try {
      const resposta = await firstValueFrom(this.api.mensagensDaConversa(this.selecionada.id, this.filtro, pagina)
        .pipe(takeUntil(this.cancelarMensagens), takeUntilDestroyed(this.destroy), timeout(15000)));
      if (versao !== this.versaoMensagens) return;
      const novas = [...resposta.itens].reverse();
      const preservarAnteriores = !anteriores && this.paginaMensagens > 0;
      const itens = anteriores ? [...novas, ...this.mensagens]
        : preservarAnteriores ? [...this.mensagens, ...novas] : novas;
      this.mensagens = [...new Map(itens.map(item => [item.mensagem.id, item])).values()]
        .sort((a, b) => a.mensagem.criadaEm.localeCompare(b.mensagem.criadaEm) || a.mensagem.id.localeCompare(b.mensagem.id));
      if (!preservarAnteriores) {
        this.paginaMensagens = pagina;
        this.temAnteriores = resposta.temMais;
      }
      setTimeout(() => {
        if (versao !== this.versaoMensagens || !this.rolagem) return;
        const scroll = this.rolagem.nativeElement;
        if (anteriores) scroll.scrollTop = topo + scroll.scrollHeight - altura;
        else if (noFim) scroll.scrollTop = scroll.scrollHeight;
      });
    } catch (erro) { if (versao === this.versaoMensagens) this.erroMensagens = falha(erro).mensagem; }
    finally { if (versao === this.versaoMensagens) this.lendoMensagens = false; }
  }

  novaMensagem() {
    if (this.pendente) { this.retomar(); return; }
    if (!this.podeEnviar) return;
    this.escolhendo = true;
    this.clienteEscolhido = null;
    this.telefoneManual = false;
    this.telefone.setValue('');
    this.erroClientes = '';
    if (this.mobile) setTimeout(() => {
      if (this.escolhendo) this.areaLista?.nativeElement.scrollIntoView({ block: 'start' });
    });
    void this.buscarClientes();
  }

  async buscarClientes() {
    this.cancelarClientes.next();
    const versao = ++this.versaoClientes;
    this.lendoClientes = true;
    this.erroClientes = '';
    try {
      const resposta = await firstValueFrom(this.clientes.listar(0, 20, this.pesquisaCliente.value.trim())
        .pipe(takeUntil(this.cancelarClientes), takeUntilDestroyed(this.destroy), timeout(12000)));
      if (versao === this.versaoClientes) this.clientesEncontrados = resposta.content;
    } catch (erro) { if (versao === this.versaoClientes) this.erroClientes = falha(erro).mensagem; }
    finally { if (versao === this.versaoClientes) this.lendoClientes = false; }
  }

  private normalizar(numero: string) {
    const valor = numero.trim().replace(/[() .-]/g, '');
    const internacional = valor.startsWith('+');
    const digitos = internacional ? valor.slice(1) : valor;
    const resultado = !internacional && /^[1-9]\d{9,10}$/.test(digitos) ? '55' + digitos : digitos;
    return /^[1-9]\d{7,14}$/.test(resultado) ? resultado : null;
  }

  escolherCliente(cliente: ClienteResponse) {
    if (this.salvandoTelefone) return;
    this.clienteEscolhido = cliente;
    this.telefoneManual = false;
    this.telefone.setValue('');
    this.erroClientes = '';
  }

  informarNumero() {
    if (this.salvandoTelefone) return;
    this.clienteEscolhido = null;
    this.telefoneManual = !this.telefoneManual;
    this.erroClientes = '';
  }

  async continuar() {
    if (!this.podeContinuar) return;
    if (this.telefoneManual) {
      await this.abrirDestino({ numero: '55' + this.telefone.value, nome: this.telefone.value });
      return;
    }
    const cliente = this.clienteEscolhido;
    if (!cliente) return;
    if (this.numeroCliente) {
      await this.abrirDestino({ numero: this.numeroCliente, nome: cliente.nome, clienteId: cliente.id });
      return;
    }
    this.salvandoTelefone = true;
    this.erroClientes = '';
    try {
      const atual = await firstValueFrom(this.clientes.buscarPorId(cliente.id)
        .pipe(takeUntilDestroyed(this.destroy), timeout(12000)));
      const salvo = await firstValueFrom(this.clientes.atualizar(cliente.id, {
        nome: atual.nome, email: atual.email, telefone: this.telefone.value,
        documento: atual.documento, endereco: atual.endereco,
      }).pipe(takeUntilDestroyed(this.destroy), timeout(12000)));
      const numero = this.normalizar(salvo.telefone || '');
      if (!numero) throw new Error('TELEFONE_INVALIDO');
      await this.abrirDestino({ numero, nome: salvo.nome, clienteId: salvo.id });
    } catch (erro) {
      if (!this.encerrado) this.erroClientes = 'Não foi possível atualizar o telefone do cliente. Confira o cadastro e tente novamente.';
    } finally { this.salvandoTelefone = false; }
  }

  private mesmoDestinatario(conversa: Conversa, destino: DestinatarioConversa) {
    const cliente = conversa.ultima.clienteId;
    return destino.clienteId != null
      ? cliente === destino.clienteId
      : cliente == null && conversa.ultima.destinatario === destino.numero;
  }

  private async abrirDestino(destino: DestinatarioConversa) {
    this.voltar();
    this.destino = destino;
    this.escolhendo = false;
    this.focarConversa();
    const existente = this.conversas.find(c => this.mesmoDestinatario(c, destino));
    if (existente) { this.selecionada = existente; void this.carregarMensagens(); return; }
    if (!this.config.acoesPermitidas.consultarHistorico) return;
    const versao = this.versaoMensagens;
    try {
      const resultado = await firstValueFrom(this.api.conversas(this.filtro, destino.clienteId ? '' : destino.numero, 0, destino.clienteId, !destino.clienteId)
        .pipe(takeUntil(this.cancelarMensagens), takeUntilDestroyed(this.destroy), timeout(15000)));
      if (versao !== this.versaoMensagens || this.destino !== destino) return;
      const conversa = resultado.itens.find(c => this.mesmoDestinatario(c, destino));
      if (conversa) { this.selecionada = conversa; void this.carregarMensagens(); }
    } catch (erro) {
      if (versao === this.versaoMensagens) this.erroMensagens = falha(erro).mensagem;
    }
  }

  cadastrar() {
    if (!this.podeCriarCliente || this.cadastro) return;
    this.cadastro = abrirCadastroRapido(this.dialog, { nome: this.pesquisaCliente.value, mobileMode: 'quick' });
    this.cadastro.afterClosed().pipe(takeUntilDestroyed(this.destroy)).subscribe(cliente => {
      this.cadastro = undefined;
      if (cliente) {
        this.clientesEncontrados = [cliente, ...this.clientesEncontrados.filter(item => item.id !== cliente.id)];
        this.escolherCliente(cliente);
      }
    });
  }

  voltar() {
    this.cancelarMensagens.next();
    this.versaoMensagens++;
    this.mensagens = [];
    this.paginaMensagens = 0;
    this.temAnteriores = false;
    this.selecionada = null;
    this.destino = null;
    this.escolhendo = false;
    this.clienteEscolhido = null;
    this.telefoneManual = false;
    this.telefone.setValue('');
    this.texto = '';
    this.erroMensagens = '';
    this.lendoMensagens = false;
  }

  private focarConversa() {
    if (!this.mobile) return;
    setTimeout(() => {
      if (this.destino || this.selecionada) this.areaConversa?.nativeElement.scrollIntoView({ block: 'start' });
    });
  }

  retomar() {
    if (!this.pendente) return;
    this.voltar();
    const corpo = this.pendente.operacao.corpo;
    this.destino = { numero: corpo.numero, nome: corpo.numero, clienteId: corpo.clienteId };
    this.texto = corpo.texto;
    this.focarConversa();
  }

  enviar() {
    if (this.enviando || !this.podeEnviar || !this.destino || !this.texto.trim()) return;
    if (this.pendente) this.repetir.emit();
    else this.registrar.emit({ destino: this.destino, texto: this.texto });
  }

  registrado() {
    if (Date.now() - Date.parse(this.filtro.fim) < 60000) {
      this.filtro = { ...this.filtro, fim: new Date().toISOString() };
    }
    this.texto = '';
    this.atualizar();
  }
}
