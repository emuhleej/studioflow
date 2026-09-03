const acceptedOutputTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

function isIpLiteral(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

export function validateExactHttpsUrl(value: string, allowedHosts: ReadonlySet<string>): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Provider media URL is invalid.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:") throw new Error("Provider media URL must use HTTPS.");
  if (parsed.username || parsed.password) throw new Error("Provider media URL cannot contain credentials.");
  if (isIpLiteral(hostname) || hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("Provider media URL must use an approved public hostname.");
  }
  if (!allowedHosts.has(hostname)) throw new Error("Provider media URL host is not approved.");
  return parsed;
}

export function validateSignedReferenceUrl(value: string, allowedHost: string): URL {
  if (value.length > 2_048) throw new Error("Signed reference URL is too long.");
  return validateExactHttpsUrl(value, new Set([allowedHost.toLowerCase()]));
}

export interface BoundedGeneratedOutput {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number;
}

export async function openBoundedGeneratedOutput(
  value: string,
  options: {
    allowedHosts: ReadonlySet<string>;
    maximumBytes: number;
    fetcher?: typeof fetch;
  },
): Promise<BoundedGeneratedOutput> {
  const url = validateExactHttpsUrl(value, options.allowedHosts);
  const response = await (options.fetcher ?? fetch)(url, { method: "GET", redirect: "manual" });
  if (response.status !== 200) throw new Error("Provider output must return a direct HTTP 200 response.");
  const contentType = (response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  if (!acceptedOutputTypes.has(contentType)) throw new Error("Provider output type is not supported.");
  const lengthHeader = response.headers.get("content-length");
  const contentLength = Number(lengthHeader);
  if (!lengthHeader || !Number.isSafeInteger(contentLength) || contentLength <= 0) {
    throw new Error("Provider output must include a valid Content-Length header.");
  }
  if (contentLength > options.maximumBytes) throw new Error("Provider output exceeds the generated-media limit.");
  if (!response.body) throw new Error("Provider output body is missing.");

  let transferred = 0;
  const limiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      transferred += chunk.byteLength;
      if (transferred > options.maximumBytes || transferred > contentLength) {
        controller.error(new Error("Provider output exceeded its declared or permitted size while streaming."));
        return;
      }
      controller.enqueue(chunk);
    },
    flush() {
      if (transferred !== contentLength) throw new Error("Provider output length did not match Content-Length.");
    },
  });
  return { body: response.body.pipeThrough(limiter), contentType, contentLength };
}
