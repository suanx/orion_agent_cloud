/**
 * 边缘函数环境变量绑定。
 * EdgeOne Pages 控制台或 .env 中配置, 见 .env.example。
 *
 * 注：NODE_ENV / TURSO_ALLOW_FILE_DB 仅供本地开发（dev-server、vitest）
 * 使用，生产环境不应配置——src/db/client.ts 用它们确保 file: 本地库分支
 * 在生产是死代码，避免 @libsql/client 的原生绑定被打进部署产物。
 */
export interface Bindings {
  /** 仅本地开发：允许 file: SQLite。生产留空。 */
  TURSO_ALLOW_FILE_DB?: string;
  /** 仅本地开发：dev-server / vitest 会注入。生产留空。 */
  NODE_ENV?: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  JWT_SECRET: string;
  ADMIN_TOKEN: string;

  SEARCH_PROVIDER?: string; // duckduckgo | serper | bocha
  SERPER_API_KEY?: string;
  BOCHA_API_KEY?: string;

  CLOUD_LLM_BASE_URL?: string;
  CLOUD_LLM_API_KEY?: string;
  CLOUD_LLM_MODEL?: string;

  /** 站点对外地址(如 https://orion.suen.us.ci)。App 端拼云端模型 chatUrl 时用。 */
  PUBLIC_BASE_URL?: string;

  UPDATE_LATEST_VERSION?: string;
  UPDATE_MIN_VERSION?: string;
  UPDATE_FORCE_UPDATE?: string; // 'true' 时本次更新为强制更新(默认普通更新)
  DEBUG_ERRORS?: string; // 'true' 时 500 响应附带原始错误(诊断用)
  UPDATE_NOTES?: string;
  UPDATE_APK_URL?: string;

  PLAN_LIMITS_OVERRIDE?: string;

  /**
   * 注册邮箱域名白名单（逗号分隔，可带 @）。
   * 留空用默认：qq.com,189.cn,139.com,163.com,126.com。
   * 见 src/utils/register-policy.ts。
   */
  REGISTER_EMAIL_DOMAINS?: string;
}

export type Env = { Bindings: Bindings };
