import { Endereco } from "../endereco/endereco.model";

export interface ClienteResponse {
    id: number;
    nome: string;
    email: string;
    telefone: string;
    documento?: string | null;
    endereco?: Endereco | null;
    ativo?: boolean | null;
  }
