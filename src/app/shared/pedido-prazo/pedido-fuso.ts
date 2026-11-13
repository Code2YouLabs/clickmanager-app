// Calendário civil de São Paulo; Date do datepicker nunca é serializado como instante.
export const FUSO_PEDIDO = 'America/Sao_Paulo';
export function partesSP(instante: string | number | Date): {data: string; hora: string} {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone: FUSO_PEDIDO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(instante));
  const get = (k: string) => p.find(x => x.type === k)?.value || '';
  return {data: `${get('year')}-${get('month')}-${get('day')}`, hora: `${get('hour')}:${get('minute')}`};
}
export function dataCivil(d: Date): string { return `${d.getFullYear().toString().padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function dataCalendario(data: string): Date { const [a,m,d] = data.split('-').map(Number); return new Date(a,m-1,d); }
export function horarioSP(data: string, hora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return null;
  const [a,m,d] = data.split('-').map(Number), [h,min] = hora.split(':').map(Number);
  if (a < 1900 || a > 9999) return null;
  const alvo = Date.UTC(a,m-1,d,h,min); let instante = alvo;
  for (let i=0; i<4; i++) {
    const p = partesSP(instante), [ya,mo,di] = p.data.split('-').map(Number), [ho,mi] = p.hora.split(':').map(Number);
    instante += alvo - Date.UTC(ya,mo-1,di,ho,mi);
  }
  const p = partesSP(instante);
  if (p.data !== data || p.hora !== hora) return null; // horário civil inexistente
  const offset = Math.round((alvo-instante)/60000), sinal = offset < 0 ? '-' : '+';
  return `${data}T${hora}:00${sinal}${String(Math.floor(Math.abs(offset)/60)).padStart(2,'0')}:${String(Math.abs(offset)%60).padStart(2,'0')}`;
}
export function previaSP(p: {prazo: number; unidade: string}, agora = Date.now()): {data: string; hora: string} {
  if (p.unidade === 'HORAS') return partesSP(agora + p.prazo*3600000);
  const atual = partesSP(agora), [a,m,d] = atual.data.split('-').map(Number);
  const dia = new Date(Date.UTC(a,m-1,d+p.prazo)).toISOString().slice(0,10);
  return {data: dia, hora: atual.hora};
}
export function dataExataSP(iso: string): string { return new Intl.DateTimeFormat('pt-BR', {timeZone: FUSO_PEDIDO, dateStyle:'short', timeStyle:'short'}).format(new Date(iso)); }
