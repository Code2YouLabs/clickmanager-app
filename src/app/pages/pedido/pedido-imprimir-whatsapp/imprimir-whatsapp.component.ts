import { Subscription } from 'rxjs';
import { CompartilhamentoClickWhatsAppComponent } from 'src/app/components/compartilhamento-clickwhatsapp/compartilhamento-clickwhatsapp.component';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { PedidoService } from '../pedido.service';
import { PedidoResponse } from 'src/app/models/pedido/pedido-response.model';
import { ToastrService } from 'ngx-toastr';
import { UsuarioService } from 'src/app/services/usuario.service';
import {
    buildPedidoWhatsAppPreviewMessage,
    buildPedidoWhatsAppSendMessage,
    displayPedidoNumero,
    toE164BR
} from '../pedido-whatsapp.utils';

@Component({
    selector: 'app-imprimir-whatsapp',
    standalone: true,
    imports: [CompartilhamentoClickWhatsAppComponent, ReactiveFormsModule, CommonModule, RouterModule, MatButtonModule, MatIconModule, MatCardModule],
    templateUrl: './imprimir-whatsapp.component.html',
    styleUrl: './imprimir-whatsapp.component.scss',
})
export class ImprimirWhatsAppComponent implements OnInit, OnDestroy {
    private rotaSub?: Subscription;
    private carregamento = new Subscription();
    private versao = 0;

    integradoAtivo = false;
    editorBloqueado = false;
    mensagemControl = new FormControl('', { nonNullable: true });
    readonly telefoneCompartilhamento = toE164BR;
    pedido!: PedidoResponse;
    get mensagem() { return this.mensagemControl.value; }
    set mensagem(valor: string) { this.mensagemControl.setValue(valor); }
    empresaNome = '';

    constructor(
        private route: ActivatedRoute,
        private pedidoService: PedidoService,
        private cdr: ChangeDetectorRef,
        private toastr: ToastrService,
        private usuarioService: UsuarioService
    ) { }

    ngOnDestroy() { this.versao++; this.rotaSub?.unsubscribe(); this.carregamento.unsubscribe(); }

    ngOnInit(): void {
        this.rotaSub = this.route.paramMap.subscribe(params => this.carregarPedido(Number(params.get('id'))));
    }

    private carregarPedido(id: number) {
        const versao = ++this.versao;
        this.pedido = undefined!;
        this.carregamento.unsubscribe();
        this.carregamento = new Subscription();
        this.carregamento.add(this.pedidoService.buscarPorId(id).subscribe(p => {
            if (versao !== this.versao) return;
            this.pedido = p;

            const respId = p?.responsavel?.id;
            if (respId) {
                this.usuarioService.buscarPorId(respId).subscribe({
                    next: (u: any) => {
                        if (versao !== this.versao) return;
                        this.empresaNome = u?.empresa?.nome || '';
                        this.mensagem = buildPedidoWhatsAppPreviewMessage(this.pedido, this.empresaNome);
                        this.cdr.detectChanges();
                    },
                    error: () => {
                        if (versao !== this.versao) return;
                        this.empresaNome = '';
                        this.mensagem = buildPedidoWhatsAppPreviewMessage(this.pedido, this.empresaNome);
                        this.cdr.detectChanges();
                    }
                });
            } else {
                this.mensagem = buildPedidoWhatsAppPreviewMessage(this.pedido, this.empresaNome);
                this.cdr.detectChanges();
            }
        }));
    }

    displayNumero(p: PedidoResponse): string {
        return displayPedidoNumero(p);
    }

    abrirWhatsApp(revisado?: { numero: string; texto: string }): void {
        const mensagemSemIcones = revisado?.texto ?? buildPedidoWhatsAppSendMessage(this.pedido, this.empresaNome);

        const telRaw = this.pedido?.cliente?.telefone ?? '';
        const phone = revisado?.numero ?? toE164BR(telRaw);

        if (!phone) {
            this.toastr.error('Telefone do cliente não encontrado ou inválido.');
            return;
        }
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensagemSemIcones)}`;
        window.open(url, '_blank');
    }


    copiar(): void {
        if (!this.mensagem) return;
        navigator.clipboard.writeText(this.mensagem)
            .then(() => this.toastr.success('Mensagem copiada!'))
            .catch(() => this.toastr.error('Não foi possível copiar.'));
    }

    fmtDate(iso?: string): string {
        if (!iso) return '-';
        // aceita LocalDate (YYYY-MM-DD) ou ISO completo
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso; // fallback
        return d.toLocaleDateString('pt-BR');
    }
}
