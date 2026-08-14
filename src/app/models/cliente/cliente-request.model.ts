import { Endereco } from "../endereco/endereco.model";

export interface ClienteRequest {
    nome: string;
    email?: string | null;
    telefone: string;
    documento?: string | null;
    endereco?: Endereco | null;
  }
