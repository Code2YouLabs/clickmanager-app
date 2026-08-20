import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import QRCode from 'qrcode';
import { LinksSharePanelComponent } from './links-share-panel.component';

describe('LinksSharePanelComponent', () => {
  let fixture: ComponentFixture<LinksSharePanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LinksSharePanelComponent, NoopAnimationsModule],
      providers: [
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error']) },
      ],
    });

    fixture = TestBed.createComponent(LinksSharePanelComponent);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('gera e exibe QR Code automaticamente quando existe URL publica', fakeAsync(() => {
    const toDataUrlSpy = spyOn(QRCode, 'toDataURL' as never).and.returnValue(Promise.resolve('data:image/png;base64,qr') as never);
    fixture.componentRef.setInput('url', 'https://clickmanager.com.br/l/empresa');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(toDataUrlSpy).toHaveBeenCalled();
    expect((toDataUrlSpy.calls.mostRecent().args as unknown[])[0]).toBe('https://clickmanager.com.br/l/empresa');
    expect(fixture.nativeElement.querySelector('.links-share-panel__qr')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,qr');
    expect(fixture.nativeElement.textContent).toContain('Baixar QR Code');
  }));

  it('nao gera QR Code quando nao existe URL publica', () => {
    fixture.componentRef.setInput('url', '');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.links-share-panel__qr')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Configure os dados da empresa antes de compartilhar.');
  });
});
