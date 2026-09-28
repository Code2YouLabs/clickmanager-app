import { SimpleChange } from '@angular/core';
import { SiteBannerImageUploadComponent } from './site-banner-image-upload.component';

describe('SiteBannerImageUploadComponent', () => {
  it('restaura a imagem atual e descarta arquivo temporario', () => {
    const component = new SiteBannerImageUploadComponent();
    const files: Array<File | null> = [];
    const previews: Array<string | null> = [];
    component.fileChange.subscribe(value => files.push(value));
    component.previewChange.subscribe(value => previews.push(value));

    const file = new File(['banner'], 'banner.webp', { type: 'image/webp' });
    (component as any).arquivoSelecionado = file;
    component.previewUrl = 'blob:novo';
    component.arquivoNome = file.name;
    component.arquivoTamanho = '1 KB';

    component.restaurarSelecao('/storage/banner-original.webp');

    expect((component as any).arquivoSelecionado).toBeNull();
    expect(component.previewUrl).toBe('/storage/banner-original.webp');
    expect(component.arquivoNome).toBe('');
    expect(files).toEqual([null]);
    expect(previews).toEqual(['/storage/banner-original.webp']);
  });

  it('sincroniza imagemAtual apenas quando nao ha arquivo selecionado', () => {
    const component = new SiteBannerImageUploadComponent();
    component.imagemAtual = '/storage/a.webp';
    component.ngOnChanges({ imagemAtual: new SimpleChange('', '/storage/a.webp', false) });
    expect(component.previewUrl).toBe('/storage/a.webp');

    (component as any).arquivoSelecionado = new File(['banner'], 'banner.png', { type: 'image/png' });
    component.imagemAtual = '/storage/b.webp';
    component.ngOnChanges({ imagemAtual: new SimpleChange('/storage/a.webp', '/storage/b.webp', false) });

    expect(component.previewUrl).toBe('/storage/a.webp');
  });
});
