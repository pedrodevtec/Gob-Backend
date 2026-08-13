import { env } from "../../config/env";

interface BcbPtaxResponse {
  value?: Array<{
    cotacaoVenda?: number;
    dataHoraCotacao?: string;
  }>;
}

export interface UsdBrlRate {
  rate: number;
  date: string;
  source: string;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export class AiExchangeRateService {
  private static fetcher: typeof fetch = fetch;
  private static cached?: { expiresAt: number; value: UsdBrlRate | null };

  static setFetchForTests(fetcher: typeof fetch): void {
    this.fetcher = fetcher;
    this.cached = undefined;
  }

  static resetForTests(): void {
    this.fetcher = fetch;
    this.cached = undefined;
  }

  static async getUsdBrlRate(now = new Date()): Promise<UsdBrlRate | null> {
    if (env.AI_USD_BRL_RATE && Number.isFinite(env.AI_USD_BRL_RATE) && env.AI_USD_BRL_RATE > 0) {
      return {
        rate: env.AI_USD_BRL_RATE,
        date: env.AI_USD_BRL_RATE_DATE ?? now.toISOString().slice(0, 10),
        source: "Configuracao operacional",
      };
    }

    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.value;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_500);
    try {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 7);
      const params = new URLSearchParams({
        "@dataInicial": `'${this.bcbDate(start)}'`,
        "@dataFinalCotacao": `'${this.bcbDate(now)}'`,
        "$top": "1",
        "$orderby": "dataHoraCotacao desc",
        "$format": "json",
        "$select": "cotacaoVenda,dataHoraCotacao",
      });
      const response = await this.fetcher(
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?${params.toString()}`,
        { signal: controller.signal }
      );
      if (!response.ok) throw new Error(`PTAX ${response.status}`);
      const payload = await response.json() as BcbPtaxResponse;
      const latest = payload.value?.[0];
      const rate = Number(latest?.cotacaoVenda);
      const value = Number.isFinite(rate) && rate > 0
        ? {
            rate,
            date: latest?.dataHoraCotacao?.slice(0, 10) ?? now.toISOString().slice(0, 10),
            source: "Banco Central do Brasil - PTAX venda",
          }
        : null;
      this.cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    } catch {
      this.cached = { value: null, expiresAt: Date.now() + CACHE_TTL_MS };
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private static bcbDate(value: Date): string {
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${month}-${day}-${value.getUTCFullYear()}`;
  }
}
