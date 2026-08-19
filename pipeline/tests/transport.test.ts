import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpTransport } from '../src/summarize/transport';

const request = {
  model: 'test-model',
  maxOutputTokens: 100,
  messages: [{ role: 'system' as const, content: 'sys' }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// The transport must never throw: a failing model degrades the run to
// source-verbatim summaries rather than ending it.
describe('createHttpTransport', () => {
  it('returns the assistant message on success', async () => {
    vi.stubGlobal('fetch', async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'hello' } }] }), {
        status: 200,
      }),
    );
    const transport = createHttpTransport({ baseUrl: 'https://api.test/v1', apiKey: 'k' });
    expect(await transport(request)).toEqual({ content: 'hello', error: null });
  });

  it('sends the bearer token and the chat-completions path', async () => {
    const spy = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'x' } }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', spy);
    // A trailing slash on the base URL must not produce a double slash.
    const transport = createHttpTransport({ baseUrl: 'https://api.test/v1/', apiKey: 'secret' });
    await transport(request);

    const call = spy.mock.calls[0];
    expect(call).toBeDefined();
    expect(call?.[0]).toBe('https://api.test/v1/chat/completions');
    const headers = call?.[1].headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer secret');
  });

  it('reports a non-2xx status as an error, not an exception', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 503 }));
    const transport = createHttpTransport({ baseUrl: 'https://api.test/v1', apiKey: 'k' });
    const result = await transport(request);
    expect(result.content).toBeNull();
    expect(result.error).toMatch(/503/);
  });

  it('reports a reply with no message content', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    const transport = createHttpTransport({ baseUrl: 'https://api.test/v1', apiKey: 'k' });
    expect((await transport(request)).error).toMatch(/no message content/);
  });

  it('reports a malformed JSON body', async () => {
    vi.stubGlobal('fetch', async () => new Response('not json', { status: 200 }));
    const transport = createHttpTransport({ baseUrl: 'https://api.test/v1', apiKey: 'k' });
    expect((await transport(request)).error).toMatch(/failed/);
  });

  it('reports a socket failure', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNRESET');
    });
    const transport = createHttpTransport({ baseUrl: 'https://api.test/v1', apiKey: 'k' });
    expect((await transport(request)).error).toMatch(/ECONNRESET/);
  });

  it('reports a timeout distinctly from a socket failure', async () => {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      }),
    );
    const transport = createHttpTransport({
      baseUrl: 'https://api.test/v1',
      apiKey: 'k',
      timeoutMs: 10,
    });
    expect((await transport(request)).error).toMatch(/timed out/);
  });
});
