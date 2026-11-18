import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageStatusComponent } from './message-status.component';
import { Mensagem } from 'src/app/pages/clickwhatsapp/clickwhatsapp.models';
describe('Confirmação visual da mensagem',()=>{
  beforeEach(()=>TestBed.configureTestingModule({imports:[MessageStatusComponent],providers:[provideNoopAnimations()]}));
  const casos: [Mensagem['fase'],Mensagem['confirmacao'],string,boolean][] = [
    ['PENDENTE','NAO_CONFIRMADA','schedule',false], ['RESERVADA','NAO_CONFIRMADA','schedule',false],
    ['CHAMADA_INICIADA','NAO_CONFIRMADA','schedule',false], ['ACEITA','ACEITA_PROVEDOR','schedule',false],
    ['ACEITA','CONFIRMADA_SERVIDOR','done',false], ['ACEITA','ENTREGUE','done_all',false], ['ACEITA','LIDA','done_all',true],
    ['INCERTA','NAO_CONFIRMADA','help_outline',false], ['FALHA','NAO_CONFIRMADA','error_outline',false],
    ['CANCELADA','NAO_CONFIRMADA','block',false], ['EXPIRADA','NAO_CONFIRMADA','timer_off',false],
  ];
  for(const [fase,confirmacao,icone,lida] of casos) it(`${fase}/${confirmacao} exibe ${icone} sem texto visível de status`,()=>{
    const f=TestBed.createComponent(MessageStatusComponent);f.componentRef.setInput('mensagem',{fase,confirmacao});f.detectChanges();
    const span=f.nativeElement.querySelector('span');expect(f.nativeElement.querySelector('mat-icon').textContent).toBe(icone);
    expect(span.classList.contains('lida')).toBe(lida);expect(span.getAttribute('aria-label')).toBeTruthy();
    expect(span.getAttribute('tabindex')).toBe('0');expect(span.textContent.trim()).toBe(icone);f.destroy();
  });
  it('não apresenta um único aceite do provedor como confirmação do servidor',()=>{
    const c=new MessageStatusComponent();c.mensagem={fase:'ACEITA',confirmacao:'ACEITA_PROVEDOR'};
    expect(c.icone).toBe('schedule');expect(c.descricao).toContain('aguardando confirmação');
  });
});
