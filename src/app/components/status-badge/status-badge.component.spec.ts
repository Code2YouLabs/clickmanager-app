import { StatusBadgeComponent } from './status-badge.component';
describe('StatusBadge — compatibilidade', () => {
  for (const [status, label, className] of [
    ['ATIVO', 'Ativo', 'chip-pronto'], ['INATIVO', 'Inativo', 'chip-cancelado'],
    ['CANCELADO', 'Cancelado', 'chip-cancelado'], ['EM_PRODUCAO', 'Produção', 'chip-producao'],
    ['RESOLVIDO', 'Resolvido', 'chip-pronto'], ['PAGO', 'Pago', 'chip-pronto'],
  ]) it(`preserva representação de ${status}`, () => {
    const component = new StatusBadgeComponent(); component.status = status;
    expect(component.config.label).toBe(label); expect(component.config.className).toBe(className);
  });
  it('preserva fallback para estado desconhecido e ausente', () => {
    const component = new StatusBadgeComponent(); component.status = 'Personalizado'; expect(component.config.label).toBe('Personalizado');
    component.status = null; expect(component.config.label).toBe('—');
  });
});
