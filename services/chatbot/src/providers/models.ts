import { config, FALLBACK_MODELS, vendorFromModel } from "../config.js";

export interface OpenRouterModel {
  id: string;
  name: string;
  vendor: string;
}

let cachedModels: OpenRouterModel[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

interface OpenRouterModelsResponse {
  data?: Array<{
    id: string;
    name?: string;
  }>;
}

export async function listOpenRouterModels(): Promise<OpenRouterModel[]> {
  if (cachedModels && Date.now() < cacheExpiry) {
    return cachedModels;
  }

  if (!config.openRouterApiKey) {
    return FALLBACK_MODELS;
  }

  try {
    const res = await fetch(`${config.openRouterBaseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.openRouterApiKey}` },
    });
    if (!res.ok) throw new Error(`OpenRouter models API: ${res.status}`);

    const body = (await res.json()) as OpenRouterModelsResponse;
    const models = (body.data ?? [])
      .filter((m) => m.id.includes("/"))
      .map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        vendor: vendorFromModel(m.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cachedModels = models.length > 0 ? models : FALLBACK_MODELS;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cachedModels;
  } catch (err) {
    console.warn("OpenRouter models fetch failed, using fallbacks:", err);
    return FALLBACK_MODELS;
  }
}
