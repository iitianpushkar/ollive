export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CompletionResult {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(messages: ChatMessage[], model: string, signal?: AbortSignal): Promise<CompletionResult>;
  stream?(
    messages: ChatMessage[],
    model: string,
    signal: AbortSignal,
    onChunk: (text: string) => void
  ): Promise<CompletionResult>;
}
