import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { LinksPreviewModel, TipoItemLinks } from '../../models/links.models';
import { buildLinksThemeTokens } from '../../utils/links-theme.util';

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

  estilosPagina(): Record<string, string> {
    const tokens = buildLinksThemeTokens(this.model);
    return {
      '--clicklink-bg': tokens.background,
      '--clicklink-primary': tokens.primary,
      '--clicklink-text': tokens.text,
      '--clicklink-muted': tokens.muted,
      '--clicklink-button-text': tokens.buttonText,
      '--clicklink-radius': this.raioBotao(),
    };
  }

  itensAtivos() {
    return [...(this.model?.itens || [])]
      .filter((item) => item.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  }

  icon(tipo: TipoItemLinks): string {
    const labels: Record<TipoItemLinks, string> = {
      LINK: 'LN',
      WHATSAPP: 'WA',
      INSTAGRAM: 'IG',
      FACEBOOK: 'FB',
      TIKTOK: 'TT',
      YOUTUBE: 'YT',
      LINKEDIN: 'IN',
      EMAIL: '@',
      TELEFONE: 'TEL',
      LOCALIZACAO: 'MAP',
      GOOGLE_AVALIACOES: '5',
    };
    return labels[tipo] || 'LN';
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

}
