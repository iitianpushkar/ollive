import { config, PROVIDER_ID } from "../config.js";
import { createOpenRouterProvider } from "./openrouter.js";
import type { LLMProvider } from "./types.js";

let provider: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (!provider) {
    provider = createOpenRouterProvider();
  }
  return provider;
}

export function isConfigured(): boolean {
  return Boolean(config.openRouterApiKey);
}

export { PROVIDER_ID };
