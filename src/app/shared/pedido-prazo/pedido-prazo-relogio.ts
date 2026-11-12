// Um timer por tela. Prazos vêm do servidor, incluindo registros fora da página.
export class PedidoPrazoRelogio {
 private timer?: ReturnType<typeof setTimeout>; private destino = Infinity;
 private visibilidade = () => {if (document.visibilityState === 'visible') {this.limpar(); this.atualizar();}};
 constructor(private atualizar: () => void) {document.addEventListener('visibilitychange', this.visibilidade);}
 agendar(p: {referenciaEm?: string; proximaMudancaEm?: string | null}) {
   if (!p.referenciaEm || !p.proximaMudancaEm) return;
   const prazo = Date.now() + Math.max(20, new Date(p.proximaMudancaEm).getTime() - new Date(p.referenciaEm).getTime() + 20);
   if (prazo >= this.destino) return;
   this.limpar(); this.destino = prazo; this.armar();
 }
 private armar() {this.timer = setTimeout(() => {
   if (this.destino > Date.now()+50) this.armar();
   else {this.limpar(); if (document.visibilityState !== 'hidden') this.atualizar();}
 }, Math.min(2147483647, Math.max(20, this.destino-Date.now())));}
 limpar() {if (this.timer) clearTimeout(this.timer); this.timer = undefined; this.destino = Infinity;}
 destruir() {this.limpar(); document.removeEventListener('visibilitychange',this.visibilidade);}
}
