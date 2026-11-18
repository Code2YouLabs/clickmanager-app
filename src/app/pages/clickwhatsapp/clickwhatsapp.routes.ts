import { Routes } from '@angular/router';
import type { ClickWhatsAppPage } from './clickwhatsapp.page';

const loadComponent = () => import('./clickwhatsapp.page').then(m => m.ClickWhatsAppPage);
const sair = (page: ClickWhatsAppPage) => page.podeSair();

export const CLICKWHATSAPP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', loadComponent, data: { title: 'ClickWhatsApp', area: 'visao' } },
  { path: 'mensagens', loadComponent, data: { title: 'Mensagens', area: 'mensagens' } },
  { path: 'automacoes', loadComponent, canDeactivate: [sair], data: { title: 'Automações de Pedidos', area: 'automacoes' } },
  { path: 'configuracoes', loadComponent, data: { title: 'Configurações do ClickWhatsApp', area: 'configuracoes' } },
];
