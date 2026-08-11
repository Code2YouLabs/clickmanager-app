import { Routes } from '@angular/router';

import { AppChatComponent } from './chat/chat.component';
import { AppEmailComponent } from './email/email.component';
import { DetailComponent } from './email/detail/detail.component';
import { AppCoursesComponent } from './courses/courses.component';
import { AppCourseDetailComponent } from './courses/course-detail/course-detail.component';
import { AppEmployeeComponent } from './employee/employee.component';
import { AppBlogsComponent } from './blogs/blogs.component';
import { AppBlogDetailsComponent } from './blogs/details/details.component';
import { AppContactComponent } from './contact/contact.component';
import { AppNotesComponent } from './notes/notes.component';
import { AppTodoComponent } from './todo/todo.component';
import { AppPermissionComponent } from './permission/permission.component';
import { AppKanbanComponent } from './kanban/kanban.component';
import { AppFullcalendarComponent } from './fullcalendar/fullcalendar.component';
import { AppTicketlistComponent } from './tickets/tickets.component';
import { AppInvoiceListComponent } from './invoice/invoice-list/invoice-list.component';
import { AppAddInvoiceComponent } from './invoice/add-invoice/add-invoice.component';
import { AppInvoiceViewComponent } from './invoice/invoice-view/invoice-view.component';
import { AppEditInvoiceComponent } from './invoice/edit-invoice/edit-invoice.component';
import { AppContactListComponent } from './contact-list/contact-list.component';
import { GerenciarPerfilComponent } from '../perfil/gerenciar-perfil/gerenciar-perfil.component';
import { AppNotificacoesComponent } from '../notificacoes/notificacoes.component';
import { DEPOSITO_ROUTE_DATA, GRAFICA_ROUTE_DATA, SHARED_ROUTE_DATA } from '../../guards/empresa-tipo-route-data';
import { permissionGuard } from 'src/app/guards/permission.guard';
import { featureModuleGuard } from 'src/app/guards/feature-module.guard';

export const AppsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'smart-calc',
        redirectTo: '/smartcalc',
        pathMatch: 'full',
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'SmartCalc – Calculadora Inteligente',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'SmartCalc' }
          ]
        }
      },
      {
        path: 'calculadoras',
        loadChildren: () => import('./calculadoras/calculadoras.routes').then((m) => m.CalculadorasRoutes),
        canActivate: [featureModuleGuard, permissionGuard],
        data: {
          ...DEPOSITO_ROUTE_DATA,
          featureKey: 'CALCULADORA_MATERIAIS',
          requiredPermission: ['CALCULADORA_MATERIAIS_USAR'],
          title: 'Calculadoras',
          urls: [
            { title: 'Orçamentos', url: '/page/orcamentos' },
            { title: 'Calculadoras' },
          ],
        },
      },
      {
        path: 'fiscal',
        loadChildren: () => import('./fiscal/fiscal.routes').then((m) => m.FiscalRoutes),
        canActivate: [permissionGuard],
        data: {
          ...DEPOSITO_ROUTE_DATA,
          requiredPermission: [
            'FISCAL_DOCUMENTOS_VER',
            'FISCAL_CONFIGURACAO_VER',
            'FISCAL_PRODUTOS_VER',
            'FISCAL_REGRAS_VER',
            'FISCAL_EMITIR',
            'FISCAL_INUTILIZAR'
          ],
          title: 'Fiscal',
          urls: [
            { title: 'Fiscal' },
          ],
        },
      },
      {
        path: 'perfil',
        component: GerenciarPerfilComponent,
        data: {
          ...SHARED_ROUTE_DATA,
          title: 'Gerenciamento de perfil dos usuários',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Gerenciamento de perfil dos usuários' }
          ]
        }
      },
      {
        path: 'chat',
        component: AppChatComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Chat',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Chat' },
          ],
        },
      },
      {
        path: 'calendar',
        component: AppFullcalendarComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Calendar',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Calendar' },
          ],
        },
      },
      {
        path: 'notes',
        component: AppNotesComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Notes',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Notes' },
          ],
        },
      },
      {
        path: 'notificacoes',
        component: AppNotificacoesComponent,
        data: {
          ...SHARED_ROUTE_DATA,
          title: 'Notificações',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Notificações' },
          ],
        },
      },
      {
        path: 'notificacoes/:id',
        component: AppNotificacoesComponent,
        data: {
          ...SHARED_ROUTE_DATA,
          title: 'Detalhe da Notificação',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Notificações', url: '/apps/notificacoes' },
            { title: 'Detalhe' },
          ],
        },
      },
      { path: 'email', redirectTo: 'email/inbox', pathMatch: 'full' },
      {
        path: 'email/:type',
        component: AppEmailComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Email',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Email' },
          ],
        },
        children: [
          {
            path: ':id',
            component: DetailComponent,
            data: {
              ...GRAFICA_ROUTE_DATA,
              title: 'Email Detail',
              urls: [
                { title: 'Dashboard', url: '/dashboards/dashboard1' },
                { title: 'Email Detail' },
              ],
            },
          },
        ],
      },
      {
        path: 'permission',
        component: AppPermissionComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Roll Base Access',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Roll Base Access' },
          ],
        },
      },
      {
        path: 'todo',
        component: AppTodoComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Todo App',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Todo App' },
          ],
        },
      },
      {
        path: 'kanban',
        component: AppKanbanComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Kanban',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Kanban' },
          ],
        },
      },
      {
        path: 'tickets',
        component: AppTicketlistComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Tickets',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Tickets' },
          ],
        },
      },
      {
        path: 'contacts',
        component: AppContactComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Contacts',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Contacts' },
          ],
        },
      },
      {
        path: 'courses',
        component: AppCoursesComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Courses',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Courses' },
          ],
        },
      },
      {
        path: 'contact-list',
        component: AppContactListComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Contact List',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Contact List' },
          ],
        },
      },
      {
        path: 'courses/coursesdetail/:id',
        component: AppCourseDetailComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Course Detail',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Course Detail' },
          ],
        },
      },
      {
        path: 'blog/post',
        component: AppBlogsComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Posts',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Posts' },
          ],
        },
      },
      {
        path: 'blog/detail/:id',
        component: AppBlogDetailsComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Blog Detail',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Blog Detail' },
          ],
        },
      },
      {
        path: 'employee',
        component: AppEmployeeComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Employee',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Employee' },
          ],
        },
      },
      {
        path: 'invoice',
        component: AppInvoiceListComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Invoice',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Invoice' },
          ],
        },
      },
      {
        path: 'addInvoice',
        component: AppAddInvoiceComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Add Invoice',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Add Invoice' },
          ],
        },
      },
      {
        path: 'viewInvoice/:id',
        component: AppInvoiceViewComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'View Invoice',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'View Invoice' },
          ],
        },
      },
      {
        path: 'editinvoice/:id',
        component: AppEditInvoiceComponent,
        data: {
          ...GRAFICA_ROUTE_DATA,
          title: 'Edit Invoice',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'Edit Invoice' },
          ],
        },
      },
    ],
  },
];
