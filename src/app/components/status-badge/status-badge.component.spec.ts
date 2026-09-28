import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  it('representa INATIVO como status generico', () => {
    const component = new StatusBadgeComponent();
    component.status = 'INATIVO';

    expect(component.config.label).toBe('Inativo');
    expect(component.config.className).toBe('chip-cancelado');
  });
});
