// The only place the pipeline talks to a language model.
//
// Injected as an interface so the summarizer and its tests never open a socket.
// The wire format is OpenAI-compatible chat completions, which is what NVIDIA's
// integrate.api, OpenAI, and most gateways all speak — swapping provider means
// changing a base URL and a model name in pipeline/config/agents.json, not code.

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  maxOutputTokens: number;
}

export interface ChatResponse {
  content: string | null;
  error: string | null;
}

export type ChatTransport = (request: ChatRequest) => Promise<ChatResponse>;

export interface TransportOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Never throws: every failure — non-2xx, malformed body, timeout, socket
 * error — comes back as `{ content: null, error }`. A failing model degrades
 * the run to source-verbatim summaries; it does not end it.
 */
export function createHttpTransport(options: TransportOptions): ChatTransport {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async (request) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxOutputTokens,
          // Summarizing is not a creative task, and a deterministic-ish
          // setting makes a re-run of the same week produce the same text.
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        return { content: null, error: `model API returned HTTP ${response.status}` };
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.length === 0) {
        return { content: null, error: 'model API returned no message content' };
      }
      return { content, error: null };
    } catch (error) {
      const aborted = controller.signal.aborted;
      return {
        content: null,
        error: aborted ? 'model API call timed out' : `model API call failed: ${(error as Error).message}`,
      };
    } finally {
      clearTimeout(timer);
    }
  };
}
