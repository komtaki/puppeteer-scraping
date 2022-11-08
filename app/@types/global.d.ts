declare namespace NodeJS {
  // 環境変数名の定義
  interface ProcessEnv {
    readonly DOCKER_WALLET_ID?: string;
    readonly DOCKER_WALLET_PASSWORD?: string;
  }
}
