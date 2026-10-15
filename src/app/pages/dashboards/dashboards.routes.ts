import { Routes } from '@angular/router';

// dashboards
import { AppDashboard1Component } from './dashboard1/dashboard1.component';
import { AppDashboard2Component } from './dashboard2/dashboard2.component';
import { AppDashboardChartViewComponent } from './dashboard-chart-view/dashboard-chart-view.component';

export const DashboardsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard1',
        component: AppDashboard1Component,
        data: {
          title: 'Dashboard 1',
          mobileTitle: 'Dashboard',
        },
      },
      {
        path: 'dashboard1/grafico',
        component: AppDashboardChartViewComponent,
        data: {
          title: 'Gráfico',
        },
      },
      {
        path: 'dashboard2',
        component: AppDashboard2Component,
        data: {
          title: 'Dashboard 2',
        },
      },
    ],
  },
];
