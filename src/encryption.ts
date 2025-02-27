import * as vscode from "vscode";
import {
  AESGCMEncryption,
  IAESGCMEncryptionConfig,
  ChaCha20Poly1305Encryption,
  IChaCha20Poly1305EncryptionConfig,
  IEncryptionAlgorithm,
  EncryptionConfigType,
  EncryptionService,
  deriveStringToUint8Array,
  deriveStringToBuffer,
} from "easy-cipher-mate";
import * as fs from "fs";

enum AlgorithmEnum {
  AESGCM = "aes-gcm",
  ChaCha20Poly1305 = "chacha20-poly1305",
}

interface UserPassInVscodeConfig {
  algorithm: AlgorithmEnum;
  use_env: boolean;
  json_path: string;
}

function getAndWarnIfEmpty<T>(
  value: T | undefined,
  defaultValue: T,
  valueName: string
): T {
  if (value === undefined) {
    console.warn(
      `The value of ${valueName} is empty, using default value ${defaultValue}`
    );
    return defaultValue;
  }
  value = value ?? defaultValue;
  return value;
}

function readJsonConfig<T>(jsonPath: string): T {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as T;
  } catch (e) {
    console.warn(
      `Failed to read json config from ${jsonPath}, using default value`
    );
  } finally {
    return {} as T;
  }
}

class CustomAESGCMEncryptionConfig implements IAESGCMEncryptionConfig {
  password: string;
  salt: Uint8Array;
  iv: Uint8Array;

  constructor(password: string, salt: Uint8Array, iv: Uint8Array) {
    this.password = password;
    this.salt = salt;
    this.iv = iv;
  }

  static constructFromEnv(): CustomAESGCMEncryptionConfig {
    return new CustomAESGCMEncryptionConfig(
      getAndWarnIfEmpty(
        process.env.VSCODE_EXT_ECC_AESGCM_PASSWORD,
        "easy-cipher-content-password",
        "ENV::VSCODE_EXT_ECC_AESGCM_PASSWORD"
      ),
      deriveStringToUint8Array(
        getAndWarnIfEmpty(
          process.env.VSCODE_EXT_ECC_AESGCM_SALT,
          "easy-cipher-content-salt",
          "ENV::VSCODE_EXT_ECC_AESGCM_SALT"
        ),
        16
      ),
      deriveStringToUint8Array(
        getAndWarnIfEmpty(
          process.env.VSCODE_EXT_ECC_AESGCM_IV,
          "easy-cipher-content-iv",
          "ENV::VSCODE_EXT_ECC_AESGCM_IV"
        ),
        12
      )
    );
  }

  static constructFromJson(jsonPath: string): CustomAESGCMEncryptionConfig {
    const jsonConfig = readJsonConfig<{
      password?: string;
      salt?: string;
      iv?: string;
    }>(jsonPath);
    return new CustomAESGCMEncryptionConfig(
      getAndWarnIfEmpty(
        jsonConfig.password,
        "easy-cipher-content-password",
        "JSON::password"
      ),
      deriveStringToUint8Array(
        getAndWarnIfEmpty(
          jsonConfig.salt,
          "easy-cipher-content-salt",
          "JSON::salt"
        ),
        16
      ),
      deriveStringToUint8Array(
        getAndWarnIfEmpty(jsonConfig.iv, "easy-cipher-content-iv", "JSON::iv"),
        12
      )
    );
  }
}

function AESGCMServiceFactory(
  userPassInVscodeConfig: UserPassInVscodeConfig
): EncryptionService<AESGCMEncryption, IAESGCMEncryptionConfig> {
  if (userPassInVscodeConfig.use_env) {
    return new EncryptionService(
      new AESGCMEncryption(),
      CustomAESGCMEncryptionConfig.constructFromEnv()
    );
  }
  return new EncryptionService(
    new AESGCMEncryption(),
    CustomAESGCMEncryptionConfig.constructFromJson(
      userPassInVscodeConfig.json_path
    )
  );
}

class CustomChaCha20Poly1305EncryptionConfig
  implements IChaCha20Poly1305EncryptionConfig {
  password: string;
  salt: Buffer;
  nonce: Buffer;

  constructor(password: string, salt: Buffer, nonce: Buffer) {
    this.password = password;
    this.salt = salt;
    this.nonce = nonce;
  }

  static constructFromEnv(): CustomChaCha20Poly1305EncryptionConfig {
    return new CustomChaCha20Poly1305EncryptionConfig(
      getAndWarnIfEmpty(
        process.env.VSCODE_EXT_ECC_CHACHA20POLY1305_PASSWORD,
        "easy-cipher-content-password",
        "ENV::VSCODE_EXT_ECC_CHACHA20POLY1305_PASSWORD"
      ),
      deriveStringToBuffer(
        getAndWarnIfEmpty(
          process.env.VSCODE_EXT_ECC_CHACHA20POLY1305_SALT,
          "easy-cipher-content-salt",
          "ENV::VSCODE_EXT_ECC_CHACHA20POLY1305_SALT"
        ),
        16
      ),
      deriveStringToBuffer(
        getAndWarnIfEmpty(
          process.env.VSCODE_EXT_ECC_CHACHA20POLY1305_NONCE,
          "easy-cipher-content-nonce",
          "ENV::VSCODE_EXT_ECC_CHACHA20POLY1305_NONCE"
        ),
        ChaCha20Poly1305Encryption.NONCE_LENGTH
      )
    );
  }

  static constructFromJson(
    jsonPath: string
  ): CustomChaCha20Poly1305EncryptionConfig {
    const jsonConfig = readJsonConfig<{
      password?: string;
      salt?: string;
      nonce?: string;
    }>(jsonPath);
    return new CustomChaCha20Poly1305EncryptionConfig(
      getAndWarnIfEmpty(
        jsonConfig.password,
        "easy-cipher-content-password",
        "JSON::password"
      ),
      deriveStringToBuffer(
        getAndWarnIfEmpty(
          jsonConfig.salt,
          "easy-cipher-content-salt",
          "JSON::salt"
        ),
        16
      ),
      deriveStringToBuffer(
        getAndWarnIfEmpty(
          jsonConfig.nonce,
          "easy-cipher-content-nonce",
          "JSON::nonce"
        ),
        ChaCha20Poly1305Encryption.NONCE_LENGTH
      )
    );
  }
}

function ChaCha20Poly1305ServiceFactory(
  userPassInVscodeConfig: UserPassInVscodeConfig
): EncryptionService<
  ChaCha20Poly1305Encryption,
  IChaCha20Poly1305EncryptionConfig
> {
  if (userPassInVscodeConfig.use_env) {
    return new EncryptionService(
      new ChaCha20Poly1305Encryption(),
      CustomChaCha20Poly1305EncryptionConfig.constructFromEnv()
    );
  }
  return new EncryptionService(
    new ChaCha20Poly1305Encryption(),
    CustomChaCha20Poly1305EncryptionConfig.constructFromJson(
      userPassInVscodeConfig.json_path
    )
  );
}

export function encryptionServiceFactory<
  TAlgorithm extends IEncryptionAlgorithm<any>,
  TConfig extends EncryptionConfigType<TAlgorithm>
>(
  config: vscode.WorkspaceConfiguration
): EncryptionService<TAlgorithm, TConfig> {
  const userPassInVscodeConfig = {
    algorithm: config.get("algorithm") as AlgorithmEnum,
    use_env: config.get("use_env") as boolean,
    json_path: config.get("json_path") as string,
  } as UserPassInVscodeConfig;
  switch (userPassInVscodeConfig.algorithm) {
    case AlgorithmEnum.AESGCM:
      return AESGCMServiceFactory(userPassInVscodeConfig);
    case AlgorithmEnum.ChaCha20Poly1305:
      return ChaCha20Poly1305ServiceFactory(userPassInVscodeConfig);
    default:
      throw new Error("Algorithm not supported");
  }
}
