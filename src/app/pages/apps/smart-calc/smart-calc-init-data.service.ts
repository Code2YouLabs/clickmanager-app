import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

import {
  SmartCalcInitResponse,
  ProdutoSmartCalcInitResponse,
  ProdutoVariacaoSmartCalcInitResponse,
  IdNomeResponse,
} from 'src/app/models/smart-calc/init/smartcalc-init.model'

export type MaterialBasico = { id: number; nome: string };

@Injectable({ providedIn: 'root' })
export class SmartCalcInitDataService {
  private readonly initEndpoint = 'api/grafica/smartcalc/init';

  constructor(private api: ApiService) {}

  carregarInit$(): Observable<SmartCalcInitResponse> {
    return this.api.get<SmartCalcInitResponse>(this.initEndpoint);
  }

  // -------- helpers para a tela (tudo baseado no INIT) --------

  listarProdutos(init: SmartCalcInitResponse | null | undefined): ProdutoSmartCalcInitResponse[] {
    return init?.produtos ?? [];
  }

  mapVariacoesPorMaterial(prod: ProdutoSmartCalcInitResponse | null | undefined) {
    const mapId = new Map<number, ProdutoVariacaoSmartCalcInitResponse[]>();
    (prod?.variacoes ?? []).forEach(v => {
      const mid = v?.material?.id;
      if (typeof mid !== 'number') return;
      const arr = mapId.get(mid) ?? [];
      arr.push(v);
      mapId.set(mid, arr);
    });
    return mapId;
  }

  extrairMateriaisBasicos(mapVariacoesPorMaterial: Map<number, ProdutoVariacaoSmartCalcInitResponse[]>): MaterialBasico[] {
    return Array.from(mapVariacoesPorMaterial.entries()).map(([id, arr]) => ({
      id,
      nome: arr[0]?.material?.nome ?? `Material ${id}`,
    }));
  }

  extrairAcabamentosPorMaterial(
    variacoesPorMaterial: Map<number, ProdutoVariacaoSmartCalcInitResponse[]>,
    materialId?: number
  ): IdNomeResponse[] {
    const variacoes = materialId ? (variacoesPorMaterial.get(materialId) ?? []) : [];
    const all = variacoes.flatMap(v => v.acabamentos ?? []).filter(a => a?.id != null);
    return this.dedupeById(all);
  }

  obterVariacaoIdSelecionada(
    variacoesPorMaterial: Map<number, ProdutoVariacaoSmartCalcInitResponse[]>,
    materialId?: number
  ): number | null {
    if (!materialId) return null;
    return variacoesPorMaterial.get(materialId)?.[0]?.id ?? null;
  }

  private dedupeById<T extends { id: number | string }>(arr: T[]): T[] {
    const map = new Map<number | string, T>();
    for (const item of arr) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values());
  }
}
