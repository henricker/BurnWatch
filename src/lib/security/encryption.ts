import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // Recommended for GCM

export type SerializedCiphertext = string;

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

export interface EncryptionServiceConfig {
  /**
   * 32-byte key buffer for AES-256-GCM.
   */
  key: Buffer;
}

export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: EncryptionServiceConfig) {
    if (config.key.length !== 32) {
      throw new EncryptionError(
        `Invalid encryption key length: expected 32 bytes, received ${config.key.length} bytes.`,
      );
    }
    this.key = config.key;
  }

  /**
   * Encrypts a UTF-8 string and returns a serialized representation:
   *   iv:authTag:ciphertext
   * All parts are base64 encoded.
   */
  encrypt(plaintext: string): SerializedCiphertext {
    try {
      const iv = randomBytes(IV_LENGTH_BYTES);
      const cipher = createCipheriv(ALGORITHM, this.key, iv);

      const encryptedBuffer = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      const ivEncoded = iv.toString("base64");
      const authTagEncoded = authTag.toString("base64");
      const ciphertextEncoded = encryptedBuffer.toString("base64");

      return `${ivEncoded}:${authTagEncoded}:${ciphertextEncoded}`;
    } catch (error: unknown) {
      throw new EncryptionError(
        error instanceof Error ? error.message : "Unknown encryption error",
      );
    }
  }

  /**
   * Decrypts a serialized ciphertext produced by `encrypt`.
   */
  decrypt(serialized: SerializedCiphertext): string {
    const parts = serialized.split(":");
    if (parts.length !== 3) {
      throw new DecryptionError(
        "Invalid ciphertext format. Expected iv:authTag:ciphertext.",
      );
    }

    const [ivEncoded, authTagEncoded, ciphertextEncoded] = parts;

    try {
      const iv = Buffer.from(ivEncoded, "base64");
      const authTag = Buffer.from(authTagEncoded, "base64");
      const ciphertext = Buffer.from(ciphertextEncoded, "base64");

      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      const decryptedBuffer = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decryptedBuffer.toString("utf8");
    } catch (error: unknown) {
      throw new DecryptionError(
        error instanceof Error ? error.message : "Unknown decryption error",
      );
    }
  }

  /**
   * Factory for creating an EncryptionService based on the ENCRYPTION_KEY env var.
   * The key must be a 32-byte value, provided either as:
   * - 32 raw bytes in base64; or
   * - 64 hex characters.
   */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): EncryptionService {
    const rawKey = env.ENCRYPTION_KEY;
    if (!rawKey) {
      throw new EncryptionError(
        "ENCRYPTION_KEY env var is not set. It must contain a 32-byte key in base64 or hex.",
      );
    }

    const key = EncryptionService.parseKey(rawKey);
    return new EncryptionService({ key });
  }

  private static parseKey(rawKey: string): Buffer {
    // Try base64 first
    const base64Buffer = Buffer.from(rawKey, "base64");
    if (base64Buffer.length === 32) {
      return base64Buffer;
    }

    // Fallback to hex
    if (rawKey.length === 64) {
      const hexBuffer = Buffer.from(rawKey, "hex");
      if (hexBuffer.length === 32) {
        return hexBuffer;
      }
    }

    throw new EncryptionError(
      "ENCRYPTION_KEY must represent exactly 32 bytes in base64 or hex.",
    );
  }
}

