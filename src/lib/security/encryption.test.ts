import { describe, expect, it } from "vitest";

import {
  DecryptionError,
  EncryptionError,
  EncryptionService,
} from "./encryption";

const TEST_KEY = Buffer.alloc(32, 1); // Deterministic 32-byte key

describe("EncryptionService", () => {
  it("encrypts and decrypts a string symmetrically", () => {
    const service = new EncryptionService({ key: TEST_KEY });
    const plaintext = "BurnWatch encryption test";

    const ciphertext = service.encrypt(plaintext);
    const decrypted = service.decrypt(ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const service = new EncryptionService({ key: TEST_KEY });
    const plaintext = "Same plaintext";

    const firstCiphertext = service.encrypt(plaintext);
    const secondCiphertext = service.encrypt(plaintext);

    expect(firstCiphertext).not.toBe(secondCiphertext);
  });

  it("throws when using an invalid key length", () => {
    const shortKey = Buffer.alloc(16, 1);

    expect(
      () =>
        new EncryptionService({
          key: shortKey,
        }),
    ).toThrow(EncryptionError);
  });

  it("throws DecryptionError for malformed ciphertext", () => {
    const service = new EncryptionService({ key: TEST_KEY });

    expect(() => service.decrypt("invalid-format")).toThrow(DecryptionError);
  });

  it("throws DecryptionError when decrypting with a different key", () => {
    const service = new EncryptionService({ key: TEST_KEY });
    const otherService = new EncryptionService({
      key: Buffer.alloc(32, 2),
    });

    const plaintext = "Sensitive API key";
    const ciphertext = service.encrypt(plaintext);

    expect(() => otherService.decrypt(ciphertext)).toThrow(DecryptionError);
  });
});

