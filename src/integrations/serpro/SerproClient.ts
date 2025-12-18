import { env } from '../../config/env';

export interface SerproError extends Error {
  status?: number;
  responseBody?: unknown;
}

export class SerproClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(options?: { timeoutMs?: number }) {
    this.baseUrl = env.serproBaseUrl;
    this.token = env.serproBearerToken;
    this.timeoutMs = options?.timeoutMs ?? 5000;
  }

  async consultarNfe(chave: string): Promise<unknown> {
    if (!this.baseUrl || !this.token) {
      const error: SerproError = new Error('Configuração SERPRO ausente (SERPRO_BASE_URL ou SERPRO_BEARER_TOKEN).');
      error.status = 500;
      throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const url = `${this.baseUrl}/api/v1/nfe/${encodeURIComponent(chave)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          accept: 'application/json',
        },
        signal: controller.signal,
      });

      const text = await response.text();
      let data: unknown;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!response.ok) {
        const error: SerproError = new Error('Erro ao consultar NFe no SERPRO.');
        error.status = response.status;
        error.responseBody = data;
        throw error;
      }

      return data;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        const error: SerproError = new Error('Timeout ao chamar SERPRO.');
        error.status = 502;
        throw error;
      }

      const error: SerproError = new Error(`Erro de rede ao chamar SERPRO: ${err?.message || err}`);
      error.status = 502;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}


