import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ClickTvMidia } from '../../models/clicktv.models';
import {
  ClickTvMidiaPreviewDialogComponent,
  ClickTvNameDialogComponent,
  ClickTvPlaylistDialogComponent,
  ClickTvUploadDialogComponent,
} from './clicktv-dialogs.component';

describe('ClickTV media dialogs', () => {
  const midiaImagem: ClickTvMidia = {
    id: 1,
    nome: 'Banner',
    tipo: 'IMAGEM',
    status: 'DISPONIVEL',
    orientacao: 'HORIZONTAL',
    nomeArquivoOriginal: 'banner.png',
    mimeType: 'image/png',
    tamanhoBytes: 1000,
    largura: 1920,
    altura: 1080,
    criadoEm: '',
    atualizadoEm: '',
    visualizacao: { url: 'https://cdn.local/banner.png', expiraEm: '' },
  };

  function uploadFixture(): { fixture: ComponentFixture<ClickTvUploadDialogComponent>; ref: jasmine.SpyObj<MatDialogRef<ClickTvUploadDialogComponent>> } {
    const ref = jasmine.createSpyObj<MatDialogRef<ClickTvUploadDialogComponent>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [ClickTvUploadDialogComponent],
      providers: [provideNoopAnimations(), { provide: MatDialogRef, useValue: ref }],
    });
    const fixture = TestBed.createComponent(ClickTvUploadDialogComponent);
    fixture.detectChanges();
    return { fixture, ref };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('exige arquivo, preserva formatos aceitos e preenche nome sem extensão', () => {
    const { fixture } = uploadFixture();
    const component = fixture.componentInstance;

    expect(fixture.nativeElement.querySelector('input[type=file]').getAttribute('accept')).toBe('.jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4');
    expect(fixture.nativeElement.textContent).toContain('Nenhum arquivo selecionado');
    expect(fixture.nativeElement.querySelector('button[color=primary]')?.disabled).toBeTrue();

    const arquivo = new File(['img'], 'promocao-setembro.mp4', { type: 'video/mp4' });
    component.selecionar({ target: { files: [arquivo] } } as unknown as Event);
    fixture.detectChanges();

    expect(component.arquivo).toBe(arquivo);
    expect(component.form.value.nome).toBe('promocao-setembro');
    expect(fixture.nativeElement.textContent).not.toContain('Duração da imagem');
  });

  it('não sobrescreve nome digitado e envia vídeo sem duração', () => {
    const { fixture, ref } = uploadFixture();
    const component = fixture.componentInstance;
    component.form.patchValue({ nome: 'Nome manual', duracaoImagem: 15 });

    component.selecionar({ target: { files: [new File(['video'], 'original.mp4', { type: 'video/mp4' })] } } as unknown as Event);
    component.confirmar();

    expect(component.form.value.nome).toBe('Nome manual');
    expect(ref.close).toHaveBeenCalledWith(jasmine.objectContaining({
      nome: 'Nome manual',
      duracaoImagem: undefined,
    }));
  });

  it('mostra duração apenas para imagem com default 10 e mínimo 1', () => {
    const { fixture, ref } = uploadFixture();
    const component = fixture.componentInstance;

    component.selecionar({ target: { files: [new File(['img'], 'foto.webp', { type: 'image/webp' })] } } as unknown as Event);
    fixture.detectChanges();

    expect(component.form.value.duracaoImagem).toBe(10);
    expect(fixture.nativeElement.textContent).toContain('Duração da imagem');
    component.form.patchValue({ duracaoImagem: 0 });
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ duracaoImagem: 8 });
    component.confirmar();

    expect(ref.close).toHaveBeenCalledWith(jasmine.objectContaining({
      nome: 'foto',
      duracaoImagem: 8,
    }));
  });

  it('valida nome obrigatório e maxlength no dialog de renomear', () => {
    const ref = jasmine.createSpyObj<MatDialogRef<ClickTvNameDialogComponent>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [ClickTvNameDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: { titulo: 'Renomear mídia', nome: 'Atual' } },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvNameDialogComponent);
    const component = fixture.componentInstance;

    expect(component.form.value.nome).toBe('Atual');
    component.form.patchValue({ nome: '' });
    expect(component.form.invalid).toBeTrue();
    component.confirmar();
    expect(ref.close).not.toHaveBeenCalled();

    component.form.patchValue({ nome: 'A'.repeat(161) });
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ nome: 'Novo' });
    component.confirmar();
    expect(ref.close).toHaveBeenCalledWith('Novo');
  });

  it('renderiza preview de imagem mantendo utilizações', () => {
    TestBed.configureTestingModule({
      imports: [ClickTvMidiaPreviewDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { midia: midiaImagem, utilizacoes: [{ playlistId: 1, nome: 'Recepção', ativa: true, quantidadeItens: 2, versao: 1 }] } },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvMidiaPreviewDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('alt')).toBe('Banner');
    expect(fixture.nativeElement.textContent).toContain('Recepção');
  });

  it('renderiza preview de vídeo com controls', () => {
    TestBed.configureTestingModule({
      imports: [ClickTvMidiaPreviewDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { midia: { ...midiaImagem, tipo: 'VIDEO', visualizacao: { url: 'https://cdn.local/video.mp4', expiraEm: '' } }, utilizacoes: [] } },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvMidiaPreviewDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('video')).toBeTruthy();
  });

  it('renderiza mensagem quando a mídia não possui URL', () => {
    TestBed.configureTestingModule({
      imports: [ClickTvMidiaPreviewDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { midia: { ...midiaImagem, visualizacao: null }, utilizacoes: [] } },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvMidiaPreviewDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Esta mídia não possui uma URL de visualização disponível.');
  });

  it('valida criação de playlist com nome, descrição, orientação e ativa', () => {
    const ref = jasmine.createSpyObj<MatDialogRef<ClickTvPlaylistDialogComponent>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [ClickTvPlaylistDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: null },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvPlaylistDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.value.orientacao).toBe('HORIZONTAL');
    expect(component.form.value.ativa).toBeTrue();
    component.form.patchValue({ nome: '' });
    expect(component.form.invalid).toBeTrue();
    component.confirmar();
    expect(ref.close).not.toHaveBeenCalled();

    component.form.patchValue({ nome: 'A'.repeat(161) });
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ nome: 'Vitrine', descricao: 'D'.repeat(1001) });
    expect(component.form.invalid).toBeTrue();

    component.form.patchValue({ descricao: 'Recepção', orientacao: null as any });
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ orientacao: 'VERTICAL', ativa: false });
    component.confirmar();

    expect(ref.close).toHaveBeenCalledWith({
      nome: 'Vitrine',
      descricao: 'Recepção',
      orientacao: 'VERTICAL',
      ativa: false,
    });
  });

  it('preenche edição de playlist e cancela sem fechar com payload', () => {
    const ref = jasmine.createSpyObj<MatDialogRef<ClickTvPlaylistDialogComponent>>('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [ClickTvPlaylistDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: ref },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            id: 1,
            nome: 'Atual',
            descricao: 'Descrição atual',
            orientacao: 'QUADRADA',
            ativa: false,
            versao: 2,
            quantidadeItens: 1,
            quantidadeItensAtivos: 0,
            criadoEm: '',
            atualizadoEm: '',
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ClickTvPlaylistDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.getRawValue()).toEqual({
      nome: 'Atual',
      descricao: 'Descrição atual',
      orientacao: 'QUADRADA',
      ativa: false,
    });
    expect(fixture.nativeElement.textContent).toContain('Editar playlist');
    expect(ref.close).not.toHaveBeenCalled();
  });
});
