import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { LINKS_APARENCIA_PADRAO, LinksPreviewModel, TipoItemLinks } from '../../models/links.models';

@Component({
  selector: 'app-links-public-preview',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './links-public-preview.component.html',
  styleUrls: ['./links-public-preview.component.scss'],
})
export class LinksPublicPreviewComponent {
  @Input({ required: true }) model!: LinksPreviewModel;
  @Input() interactive = false;

  readonly fallbackLogo = './assets/images/logos/LogoPadrao.png';

  estilosPagina(): Record<string, string> {
    const model = this.model;
    const background = this.hexSeguro(model?.corFundo, LINKS_APARENCIA_PADRAO.corFundo);
    const primary = this.hexSeguro(model?.corPrincipal, LINKS_APARENCIA_PADRAO.corPrincipal);
    return {
      '--clicklink-bg': background,
      '--clicklink-primary': primary,
      '--clicklink-text': model?.tema === 'ESCURO' ? '#F8FAFC' : this.textoPara(background),
      '--clicklink-muted': model?.tema === 'ESCURO' ? 'rgba(248, 250, 252, 0.78)' : '#667085',
      '--clicklink-button-text': this.textoPara(primary),
      '--clicklink-radius': this.raioBotao(),
    };
  }

  itensAtivos() {
    return [...(this.model?.itens || [])]
      .filter((item) => item.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  }

  icon(tipo: TipoItemLinks): string {
    const icons: Record<TipoItemLinks, string> = {
      LINK: 'link',
      WHATSAPP: 'chat',
      INSTAGRAM: 'photo_camera',
      FACEBOOK: 'public',
      TIKTOK: 'music_note',
      YOUTUBE: 'play_circle',
      LINKEDIN: 'business_center',
      EMAIL: 'mail',
      TELEFONE: 'call',
      LOCALIZACAO: 'location_on',
      GOOGLE_AVALIACOES: 'star',
    };
    return icons[tipo] || 'link';
  }

  onLinkClick(event: Event): void {
    if (!this.interactive) {
      event.preventDefault();
    }
  }

  private raioBotao(): string {
    switch (this.model?.formatoBotao) {
      case 'QUADRADO':
        return '6px';
      case 'SUAVE':
        return '14px';
      default:
        return '999px';
    }
  }

  private hexSeguro(value: string | null | undefined, fallback: string): string {
    const text = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
  }

  private textoPara(hex: string): string {
    const value = hex.replace('#', '');
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? '#101828' : '#FFFFFF';
  }
}
