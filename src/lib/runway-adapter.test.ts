import { describe, expect, it, vi } from 'vitest';
import type { NormalizedGenerationRequest } from './generation-provider';
import {
  RUNWAY_API_VERSION,
  RunwayGenerationProvider,
} from '../../supabase/functions/_shared/runway';

const baseRequest: NormalizedGenerationRequest = {
  generationId: 'generation-1',
  clientRequestId: 'request-1',
  mediaKind: 'image',
  promptVersionId: 'prompt-1',
  prompt: 'A fictional character opens a refrigerator.',
  references: [{ assetId: 'asset-1', role: 'reference_image' }],
  settings: { aspectRatio: '9:16', qualityTier: 'draft', outputCount: 1 },
  model: 'gen4_image_turbo',
};

function adapter(fetcher: typeof fetch) {
  return new RunwayGenerationProvider(
    'server-secret',
    {
      allowedHost: 'private-media.example.com',
      resolve: async () => 'https://private-media.example.com/signed-reference?token=secret',
    },
    fetcher,
    () => '2026-09-02T12:00:00.000Z'
  );
}

describe('mocked Runway adapter', () => {
  it('maps a normalized image request to the versioned API without returning signed references', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'task-1',
            status: 'PENDING',
            createdAt: '2026-09-02T12:00:00.000Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    ) as unknown as typeof fetch;

    const job = await adapter(fetcher).create(baseRequest);
    expect(job).toEqual({
      providerJobId: 'task-1',
      status: 'queued',
      createdAt: '2026-09-02T12:00:00.000Z',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://api.dev.runwayml.com/v1/text_to_image');
    expect(init.redirect).toBe('manual');
    expect(new Headers(init.headers).get('x-runway-version')).toBe(RUNWAY_API_VERSION);
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer server-secret');
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'gen4_image_turbo',
      promptText: baseRequest.prompt,
      ratio: '720:1280',
      referenceImages: [
        {
          uri: 'https://private-media.example.com/signed-reference?token=secret',
          tag: 'Reference1',
        },
      ],
    });
    expect(JSON.stringify(job)).not.toContain('signed-reference');
  });

  it('uses the explicitly assigned starting image for video', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: 'task-video', status: 'PENDING' }), { status: 200 })
    ) as unknown as typeof fetch;
    const provider = new RunwayGenerationProvider(
      'server-secret',
      {
        allowedHost: 'private-media.example.com',
        resolve: async (assetId) => `https://private-media.example.com/${assetId}?signature=hidden`,
      },
      fetcher
    );
    await provider.create({
      ...baseRequest,
      mediaKind: 'video',
      model: 'gen4_turbo',
      references: [
        { assetId: 'style', role: 'reference_image' },
        { assetId: 'start', role: 'start_image' },
      ],
      settings: { aspectRatio: '16:9', qualityTier: 'draft', durationSeconds: 5, outputCount: 1 },
    });
    const [, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'gen4_turbo',
      promptImage: 'https://private-media.example.com/start?signature=hidden',
      duration: 5,
      ratio: '1280:720',
    });
  });

  it('keeps provider output URLs inside the server-only retrieval method', async () => {
    const payload = {
      id: 'task-1',
      status: 'SUCCEEDED',
      output: ['https://approved-output.example.com/temporary-secret-result'],
    };
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify(payload), { status: 200 })
    ) as unknown as typeof fetch;
    const provider = adapter(fetcher);
    const publicState = await provider.retrieve('task-1');
    expect(publicState.output).toBeUndefined();
    expect(JSON.stringify(publicState)).not.toContain('temporary-secret-result');
    const internalState = await provider.retrieveOutput('task-1');
    expect(internalState.temporaryUrl).toBe(payload.output[0]);
  });

  it('uses the task cancellation endpoint and never follows redirects', async () => {
    const fetcher = vi.fn(
      async () => new Response(null, { status: 204 })
    ) as unknown as typeof fetch;
    await adapter(fetcher).cancel('task/unsafe id');
    const [url, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://api.dev.runwayml.com/v1/tasks/task%2Funsafe%20id');
    expect(init).toMatchObject({ method: 'DELETE', redirect: 'manual' });
  });

  it('rejects an unapproved signed-reference origin before provider HTTP', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const provider = new RunwayGenerationProvider(
      'server-secret',
      {
        allowedHost: 'private-media.example.com',
        resolve: async () => 'https://attacker.example.org/reference.png',
      },
      fetcher
    );
    await expect(provider.create(baseRequest)).rejects.toThrow('host is not approved');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
