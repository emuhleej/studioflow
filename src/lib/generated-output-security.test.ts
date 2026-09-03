import { describe, expect, it, vi } from 'vitest';
import {
  openBoundedGeneratedOutput,
  validateExactHttpsUrl,
  validateSignedReferenceUrl,
} from '../../supabase/functions/_shared/generated-output';

const allowedHosts = new Set(['approved-output.example.com']);

describe('generated-output transport security', () => {
  it('accepts only exact approved HTTPS hostnames without credentials or IP literals', () => {
    expect(
      validateExactHttpsUrl('https://approved-output.example.com/result.mp4', allowedHosts).hostname
    ).toBe('approved-output.example.com');
    expect(() =>
      validateExactHttpsUrl('http://approved-output.example.com/result.mp4', allowedHosts)
    ).toThrow('HTTPS');
    expect(() =>
      validateExactHttpsUrl(
        'https://user:pass@approved-output.example.com/result.mp4',
        allowedHosts
      )
    ).toThrow('credentials');
    expect(() => validateExactHttpsUrl('https://127.0.0.1/result.mp4', allowedHosts)).toThrow(
      'public hostname'
    );
    expect(() => validateExactHttpsUrl('https://localhost/result.mp4', allowedHosts)).toThrow(
      'public hostname'
    );
    expect(() =>
      validateExactHttpsUrl('https://sub.approved-output.example.com/result.mp4', allowedHosts)
    ).toThrow('not approved');
  });

  it('caps signed private references at the provider URL length limit', () => {
    expect(
      validateSignedReferenceUrl(
        'https://private-media.example.com/ref',
        'private-media.example.com'
      ).hostname
    ).toBe('private-media.example.com');
    expect(() =>
      validateSignedReferenceUrl(
        `https://private-media.example.com/${'x'.repeat(2_100)}`,
        'private-media.example.com'
      )
    ).toThrow('too long');
  });

  it('streams an allowed direct response without buffering it into the contract', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const fetcher = vi.fn(
      async () =>
        new Response(bytes, {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': String(bytes.byteLength) },
        })
    ) as unknown as typeof fetch;
    const output = await openBoundedGeneratedOutput(
      'https://approved-output.example.com/result.png',
      {
        allowedHosts,
        maximumBytes: 10,
        fetcher,
      }
    );
    expect(output).toMatchObject({ contentType: 'image/png', contentLength: 4 });
    expect(new Uint8Array(await new Response(output.body).arrayBuffer())).toEqual(bytes);
    expect((fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({
      redirect: 'manual',
    });
  });

  it('rejects redirects, unsupported types, missing lengths, and oversized declarations', async () => {
    const redirect = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'https://approved-output.example.com/next' },
        })
    ) as unknown as typeof fetch;
    await expect(
      openBoundedGeneratedOutput('https://approved-output.example.com/result', {
        allowedHosts,
        maximumBytes: 10,
        fetcher: redirect,
      })
    ).rejects.toThrow('direct HTTP 200');

    const wrongType = vi.fn(
      async () =>
        new Response('text', {
          status: 200,
          headers: { 'content-type': 'text/html', 'content-length': '4' },
        })
    ) as unknown as typeof fetch;
    await expect(
      openBoundedGeneratedOutput('https://approved-output.example.com/result', {
        allowedHosts,
        maximumBytes: 10,
        fetcher: wrongType,
      })
    ).rejects.toThrow('not supported');

    const noLength = vi.fn(
      async () =>
        new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'image/png' } })
    ) as unknown as typeof fetch;
    await expect(
      openBoundedGeneratedOutput('https://approved-output.example.com/result', {
        allowedHosts,
        maximumBytes: 10,
        fetcher: noLength,
      })
    ).rejects.toThrow('Content-Length');

    const oversized = vi.fn(
      async () =>
        new Response(new Uint8Array([1]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '11' },
        })
    ) as unknown as typeof fetch;
    await expect(
      openBoundedGeneratedOutput('https://approved-output.example.com/result', {
        allowedHosts,
        maximumBytes: 10,
        fetcher: oversized,
      })
    ).rejects.toThrow('exceeds');
  });

  it('fails when streamed bytes exceed or fall short of the declared length', async () => {
    const tooMany = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '2' },
        })
    ) as unknown as typeof fetch;
    const overflowing = await openBoundedGeneratedOutput(
      'https://approved-output.example.com/result',
      { allowedHosts, maximumBytes: 10, fetcher: tooMany }
    );
    await expect(new Response(overflowing.body).arrayBuffer()).rejects.toThrow('exceeded');

    const tooFew = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2]), {
          status: 200,
          headers: { 'content-type': 'image/png', 'content-length': '3' },
        })
    ) as unknown as typeof fetch;
    const truncated = await openBoundedGeneratedOutput(
      'https://approved-output.example.com/result',
      { allowedHosts, maximumBytes: 10, fetcher: tooFew }
    );
    await expect(new Response(truncated.body).arrayBuffer()).rejects.toThrow('did not match');
  });
});
