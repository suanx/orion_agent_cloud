/**
 * 边缘函数环境变量绑定。
 * EdgeOne Pages 控制台或 .env 中配置, 见 .env.example。
 */
export interface Bindings {
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

  UPDATE_LATEST_VERSION?: string;
  UPDATE_MIN_VERSION?: string;
  UPDATE_NOTES?: string;
  UPDATE_APK_URL?: string;

  PLAN_LIMITS_OVERRIDE?: string;
}

export type Env = { Bindings: Bindings };
