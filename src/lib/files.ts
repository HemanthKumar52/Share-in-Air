/* File transfer over a dedicated WebRTC DataChannel.

   Each file rides its own channel named `file:<id>`. The channel is
   self-describing: the FIRST message is a JSON header, every following message
   is a binary chunk. This removes any cross-channel ordering races — the
   receiver always learns name/size/mime before the bytes arrive. */

export const CHUNK_SIZE = 16 * 1024; // 16 KB — universally safe SCTP message size
export const FILE_CHANNEL_PREFIX = "file:";
export const BUFFER_HIGH = 4 * 1024 * 1024; // pause sending above 4 MB buffered
export const BUFFER_LOW = 1 * 1024 * 1024; // resume once drained below 1 MB

// Anti-DoS limits on peer-supplied claims (a hostile peer can put anything on the wire).
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB hard cap per file
export const MAX_TEXT_LENGTH = 100 * 1024; // 100 KB per text snippet

export interface FileHeader {
  id: string;
  name: string;
  size: number;
  mime: string;
}

export function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

export function channelIdFromLabel(label: string): string | null {
  return label.startsWith(FILE_CHANNEL_PREFIX) ? label.slice(FILE_CHANNEL_PREFIX.length) : null;
}

/** Wait for the channel's buffer to drain when it climbs too high.
    Rejects (rather than hanging forever) if the channel closes mid-wait. */
function drain(channel: RTCDataChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    channel.bufferedAmountLowThreshold = BUFFER_LOW;
    const cleanup = () => {
      channel.removeEventListener("bufferedamountlow", onLow);
      channel.removeEventListener("close", onClose);
      channel.removeEventListener("error", onClose);
    };
    const onLow = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error("channel closed"));
    };
    channel.addEventListener("bufferedamountlow", onLow);
    channel.addEventListener("close", onClose);
    channel.addEventListener("error", onClose);
    // Already drained (buffer fell below threshold before we registered)? Resolve now.
    if (channel.readyState !== "open") onClose();
    else if (channel.bufferedAmount <= BUFFER_LOW) onLow();
  });
}

/**
 * Stream a file over an open channel: header first, then chunks with backpressure.
 * Calls onProgress with cumulative bytes sent. Throws if isCanceled() turns true
 * or the channel closes mid-flight.
 */
export async function sendFile(
  channel: RTCDataChannel,
  file: Blob,
  header: FileHeader,
  onProgress: (sent: number) => void,
  isCanceled: () => boolean,
): Promise<void> {
  channel.binaryType = "arraybuffer";
  channel.send(JSON.stringify(header));

  let offset = 0;
  while (offset < file.size) {
    if (isCanceled()) throw new Error("canceled");
    if (channel.readyState !== "open") throw new Error("channel closed");

    if (channel.bufferedAmount > BUFFER_HIGH) {
      await drain(channel);
      continue;
    }

    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    if (channel.readyState !== "open") throw new Error("channel closed");
    channel.send(buffer);
    offset += buffer.byteLength;
    onProgress(offset);
  }
}

/** Accumulates incoming chunks for one file channel. */
export class FileAssembler {
  header: FileHeader | null = null;
  private chunks: ArrayBuffer[] = [];
  received = 0;

  /** Returns true once the file is fully received. */
  accept(data: string | ArrayBuffer): boolean {
    if (typeof data === "string") {
      this.header = JSON.parse(data) as FileHeader;
      return this.received >= (this.header?.size ?? Infinity);
    }
    this.chunks.push(data);
    this.received += data.byteLength;
    return this.header != null && this.received >= this.header.size;
  }

  toBlob(): Blob {
    return new Blob(this.chunks, { type: this.header?.mime || "application/octet-stream" });
  }
}
