import * as vscode from "vscode";
import {
  AESGCMEncryption,
  AESGCMEncryptionConfig,
  IAESGCMEncryptionConfig,
  ChaCha20Poly1305Encryption,
  ChaCha20Poly1305EncryptionConfig,
  IChaCha20Poly1305EncryptionConfig,
  IEncryptionAlgorithm,
  EncryptionConfigType,
  EncryptionService,
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
      `Failed to read json config from ${jsonPath}, using default value. Error: ${e}`
    );
    return {} as T;
  }
}

function createAESGCMConfigFromEnv(): AESGCMEncryptionConfig {
  const password = getAndWarnIfEmpty(
    process.env.VSCODE_EXT_ECC_AESGCM_PASSWORD,
    "easy-cipher-content-password",
    "ENV::VSCODE_EXT_ECC_AESGCM_PASSWORD"
  );
  
  return new AESGCMEncryptionConfig(password, 'utf-8');
}

function createAESGCMConfigFromJson(jsonPath: string): AESGCMEncryptionConfig {
  const jsonConfig = readJsonConfig<{
    password?: string;
    textEncoding?: string;
  }>(jsonPath);
  
  const password = getAndWarnIfEmpty(
    jsonConfig.password,
    "easy-cipher-content-password",
    "JSON::password"
  );
  
  const textEncoding = jsonConfig.textEncoding || 'utf-8';
  
  return new AESGCMEncryptionConfig(password, textEncoding as any);
}

function AESGCMServiceFactory(
  userPassInVscodeConfig: UserPassInVscodeConfig
): EncryptionService<AESGCMEncryption, IAESGCMEncryptionConfig> {
  if (userPassInVscodeConfig.use_env) {
    return new EncryptionService(
      new AESGCMEncryption(),
      createAESGCMConfigFromEnv()
    );
  }
  return new EncryptionService(
    new AESGCMEncryption(),
    createAESGCMConfigFromJson(userPassInVscodeConfig.json_path)
  );
}

function createChaCha20Poly1305ConfigFromEnv(): ChaCha20Poly1305EncryptionConfig {
  const password = getAndWarnIfEmpty(
    process.env.VSCODE_EXT_ECC_CHACHA20POLY1305_PASSWORD,
    "easy-cipher-content-password",
    "ENV::VSCODE_EXT_ECC_CHACHA20POLY1305_PASSWORD"
  );
  
  return new ChaCha20Poly1305EncryptionConfig(password, 'utf-8');
}

function createChaCha20Poly1305ConfigFromJson(jsonPath: string): ChaCha20Poly1305EncryptionConfig {
  const jsonConfig = readJsonConfig<{
    password?: string;
    textEncoding?: string;
  }>(jsonPath);
  
  const password = getAndWarnIfEmpty(
    jsonConfig.password,
    "easy-cipher-content-password",
    "JSON::password"
  );
  
  const textEncoding = jsonConfig.textEncoding || 'utf-8';
  
  return new ChaCha20Poly1305EncryptionConfig(password, textEncoding as any);
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
      createChaCha20Poly1305ConfigFromEnv()
    );
  }
  return new EncryptionService(
    new ChaCha20Poly1305Encryption(),
    createChaCha20Poly1305ConfigFromJson(userPassInVscodeConfig.json_path)
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
