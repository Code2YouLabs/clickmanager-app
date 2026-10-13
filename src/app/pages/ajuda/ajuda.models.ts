import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { JornadaDefinicao } from 'src/app/shared/jornadas/jornada.models';

export type AjudaItem = {
  titulo: string;
  detalhes: string[];
};

export type AjudaGrupo = 'Comecando' | 'Comercial' | 'Catalogo' | 'Clientes' | 'Pessoas' | 'Administracao' | 'Conta';

export type AjudaTutorial = {
  id: string;
  jornada: JornadaDefinicao;
};

export type AjudaSecao = {
  id: string;
  titulo: string;
  descricao: string;
  grupo: AjudaGrupo;
  icon?: string;
  passos?: string[];
  itens?: AjudaItem[];
  allowedEmpresaTipos?: TipoEmpresa[];
  featureKey?: string;
  requiredPermissions?: string[];
  destaque?: boolean;
  atalhoRapido?: boolean;
  ordemAtalho?: number;
  palavrasChave?: string[];
  aliases?: string[];
  tutorial?: AjudaTutorial;
};
