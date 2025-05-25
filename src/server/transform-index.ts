import { ServerResponse } from "http";
import { Http2ServerResponse } from "http2";
import { Readable, Transform } from "stream";

export async function transformIndexHtml(
  source: Response,
  destination: ServerResponse | Http2ServerResponse,
  replacements: Record<string, string>
): Promise<void> {
  const { status, headers, body } = source;
  destination.statusCode = status;

  let cookieHeaderSet = false;
  for (const [name, value] of headers.entries()) {
    if (name === 'set-cookie') {
      if (cookieHeaderSet) continue;
      destination.setHeader(name, headers.getSetCookie());
      cookieHeaderSet = true;
    } else {
      destination.setHeader(name, value);
    }
  }

  if ('flushHeaders' in destination) {
    destination.flushHeaders();
  }

  if (!body) {
    destination.end();
    return;
  }

  console.log("start reading")
  const reader = body.getReader();
  destination.on('close', () => {
    reader.cancel().catch((error) => {
      console.error(`Error canceling stream for ${destination.req?.url}`, error);
    });
  });

  // Convert web stream to Node readable stream
  const nodeReadable = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          return this.push(null);
        }
        this.push(Buffer.from(value));
      } catch (err) {
        this.destroy(err as Error);
      }
      return;
    }
  });

  // Create transform stream for replacements
  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      console.log("transform:")
      let content = chunk.toString();
      for (const [key, val] of Object.entries(replacements)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(regex, val);
      }
      callback(null, content);
      console.log(content)
    }
  });

  return new Promise((resolve, reject) => {

    nodeReadable
      .pipe(transform)
      .pipe(destination)
      .on('finish', resolve)
      .on('error', reject)

    destination.on('drain', () => console.log("drained"));
  });
}
