import {
  buildMailtoUrl,
  buildTelefoneUrl,
  buildWhatsappUrl,
  normalizarTelefoneParaUrl,
  parseWhatsappUrl,
  protocoloUrlValido,
} from './links-item-url.util';

describe('links item url utils', () => {
  it('monta WhatsApp normalizando telefone e encodando mensagem', () => {
    expect(buildWhatsappUrl('+55 (31) 99999-9999', 'Olá, vim pelo ClickLink.'))
      .toBe('https://wa.me/5531999999999?text=Ol%C3%A1%2C%20vim%20pelo%20ClickLink.');
  });

  it('parseia WhatsApp existente quando possivel', () => {
    expect(parseWhatsappUrl('https://wa.me/5531999999999?text=Oi')).toEqual({
      numero: '5531999999999',
      mensagem: 'Oi',
    });
  });

  it('monta mailto com assunto e mensagem', () => {
    expect(buildMailtoUrl('contato@santa.com', 'Orçamento', 'Olá'))
      .toBe('mailto:contato@santa.com?subject=Or%C3%A7amento&body=Ol%C3%A1');
  });

  it('monta tel com telefone normalizado', () => {
    expect(normalizarTelefoneParaUrl('+55 (31) 3333-4444')).toBe('553133334444');
    expect(buildTelefoneUrl('+55 (31) 3333-4444')).toBe('tel:553133334444');
  });

  it('aceita somente protocolos permitidos pelo MVP', () => {
    expect(protocoloUrlValido('https://example.com')).toBeTrue();
    expect(protocoloUrlValido('http://example.com')).toBeTrue();
    expect(protocoloUrlValido('mailto:contato@example.com')).toBeTrue();
    expect(protocoloUrlValido('tel:553133334444')).toBeTrue();
    expect(protocoloUrlValido('javascript:alert(1)')).toBeFalse();
    expect(protocoloUrlValido('data:text/plain,oi')).toBeFalse();
  });
});
