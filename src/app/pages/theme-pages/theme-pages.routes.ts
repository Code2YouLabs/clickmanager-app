import { Routes } from '@angular/router';

// theme pages
import { AppAccountSettingComponent } from './account-setting/account-setting.component';
import { AppFaqComponent } from './faq/faq.component';
import { AppPricingComponent } from './pricing/pricing.component';
import { AppTreeviewComponent } from './treeview/treeview.component';
import { GRAFICA_ROUTE_DATA, SHARED_ROUTE_DATA } from '../../guards/empresa-tipo-route-data';

export const ThemePagesRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'account-setting/:id',
        component: AppAccountSettingComponent,
        data: {
          ...SHARED_ROUTE_DATA,
          title: 'Account Setting',
          mobileTitle: 'Meu perfil',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Account Setting' },
          ],
        },
      },
      {
        path: 'faq',
        component: AppFaqComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'FAQ',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'FAQ' },
          ],
        },
      },
      {
        path: 'pricing',
        component: AppPricingComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Pricing',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Pricing' },
          ],
        },
      },
      {
        path: 'treeview',
        component: AppTreeviewComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Treeview',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Treeview' },
          ],
        },
      },
    ],
  },
];
