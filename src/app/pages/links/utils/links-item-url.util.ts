export interface WhatsAppParts {
  numero: string;
  mensagem: string;
}

export function normalizarTelefoneParaUrl(value: string | null | undefined): string {
  return String(value || '').replace(/[\s()+-]/g, '').replace(/[^\d]/g, '');
}

export function buildWhatsappUrl(numero: string, mensagem?: string | null): string {
  const telefone = normalizarTelefoneParaUrl(numero);
  const texto = String(mensagem || '').trim();
  return texto ? `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}` : `https://wa.me/${telefone}`;
}

export function parseWhatsappUrl(url: string | null | undefined): WhatsAppParts | null {
  try {
    const parsed = new URL(String(url || ''));
    if (parsed.hostname !== 'wa.me') {
      return null;
    }
    const numero = parsed.pathname.replace(/^\/+/, '');
    if (!numero) {
      return null;
    }
    return {
      numero,
      mensagem: parsed.searchParams.get('text') || '',
    };
  } catch {
    return null;
  }
}

export function buildMailtoUrl(email: string, assunto?: string | null, mensagem?: string | null): string {
  const params = new URLSearchParams();
  if (assunto?.trim()) {
    params.set('subject', assunto.trim());
  }
  if (mensagem?.trim()) {
    params.set('body', mensagem.trim());
  }
  const query = params.toString();
  return `mailto:${String(email || '').trim()}${query ? `?${query}` : ''}`;
}

export function buildTelefoneUrl(numero: string): string {
  return `tel:${normalizarTelefoneParaUrl(numero)}`;
}

export function protocoloUrlValido(url: string | null | undefined): boolean {
  const value = String(url || '').trim();
  if (!value) {
    return false;
  }
  if (value.startsWith('mailto:') || value.startsWith('tel:')) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
