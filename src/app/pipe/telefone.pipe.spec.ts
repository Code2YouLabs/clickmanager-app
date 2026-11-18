import { TelefonePipe } from './telefone.pipe';
describe('TelefonePipe',()=>{
  const pipe=new TelefonePipe();
  it('remove apenas o DDI brasileiro quando solicitado para exibição',()=>{
    expect(pipe.transform('5531987531233',true)).toBe('(31) 98753-1233');
    expect(pipe.transform('+55 (31) 3333-4444',true)).toBe('(31) 3333-4444');
  });
  it('preserva o comportamento padrão e o DDD 55',()=>{
    expect(pipe.transform('5531987531233')).toBe('5531987531233');
    expect(pipe.transform('55987654321',true)).toBe('(55) 98765-4321');
    expect(pipe.transform('5555987654321',true)).toBe('(55) 98765-4321');
  });
  it('não retira DDI de outro país nem inventa telefone ausente',()=>{
    expect(pipe.transform('+351912345678',true)).toBe('+351912345678');
    expect(pipe.transform(null,true)).toBe('');
  });
});
