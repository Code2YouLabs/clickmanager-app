import { horarioSP, partesSP, previaSP, dataCivil, dataCalendario } from './pedido-fuso';
describe('Calendário do Pedido em São Paulo', () => {
 it('preserva dia e hora civil com offset independente do Date do navegador', () => {
  expect(horarioSP('2026-11-20','16:30')).toBe('2026-11-20T16:30:00-03:00');
  expect(partesSP('2026-11-21T01:30:00Z')).toEqual({data:'2026-11-20',hora:'22:30'});
  expect(dataCivil(dataCalendario('2026-11-20'))).toBe('2026-11-20');
 });
 it('calcula prévia sem transformar intenção automática em data explícita', () => {
  expect(previaSP({prazo:7,unidade:'DIAS'},Date.parse('2026-11-12T15:00:00Z'))).toEqual({data:'2026-11-19',hora:'12:00'});
  expect(previaSP({prazo:2,unidade:'HORAS'},Date.parse('2026-11-12T03:00:00Z'))).toEqual({data:'2026-11-12',hora:'02:00'});
 });
 it('rejeita data inválida e horário inexistente no fuso de negócio', () => {
  expect(horarioSP('2026-02-30','12:00')).toBeNull();
  expect(horarioSP('2026-11-20','25:00')).toBeNull();
  expect(horarioSP('2018-11-04','00:30')).toBeNull();
 });
});
