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
      '--clicklink-surface': tokens.surface,
      '--clicklink-surface-text': tokens.surfaceText,
      '--clicklink-surface-muted': tokens.surfaceMuted,
      '--clicklink-surface-border': tokens.surfaceBorder,
      '--clicklink-icon-bg': tokens.iconBackground,
      '--clicklink-shadow': tokens.shadow,
      '--clicklink-radius': this.raioBotao(),
    };
  }

  itensAtivos() {
    return [...(this.model?.itens || [])]
      .filter((item) => item.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  }

  tituloPrincipal(): string {
    return this.model?.titulo || this.model?.identidade?.nome || 'ClickLink';
  }

  deveExibirEmpresa(): boolean {
    const empresa = this.normalizarTexto(this.model?.identidade?.nome);
    const titulo = this.normalizarTexto(this.tituloPrincipal());
    return Boolean(empresa && empresa !== titulo);
  }

  icon(tipo: TipoItemLinks): string {
    const labels: Record<TipoItemLinks, string> = {
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
    return labels[tipo] || 'link';
  }

  onLinkClick(event: Event): void {
    if (!this.interactive) {
      event.preventDefault();
    }
  }

  private raioBotao(): string {
    switch (this.model?.formatoBotao) {
      case 'QUADRADO':
        return '8px';
      case 'SUAVE':
        return '16px';
      default:
        return '28px';
    }
  }

  private normalizarTexto(value: string | null | undefined): string {
    return String(value || '').trim().toLocaleLowerCase();
  }

}
