import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';

export interface NavItem {
    displayName?: string;
    disabled?: boolean;
    external?: boolean;
    twoLines?: boolean;
    chip?: boolean;
    iconName?: string;
    navCap?: string;
    chipContent?: string;
    chipClass?: string;
    subtext?: string;
    route?: string;
    children?: NavItem[];
    ddType?: string;
    bgcolor?:string;
    requiredPermission?: string[];
    featureKey?: string;
    allowedEmpresaTipos?: TipoEmpresa[];
    catalogoModo?: 'LEGADO_DEPOSITO' | 'CATALOGO_NOVO';
    proprietarioOnly?: boolean;
    tutorialTarget?: string;
}
