export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const errors = {
  badRequest: (msg: string, code = "bad_request") => new ApiError(400, code, msg),
  unauthorized: (msg = "未登录或令牌无效", code = "unauthorized") => new ApiError(401, code, msg),
  forbidden: (msg = "无权限", code = "forbidden") => new ApiError(403, code, msg),
  notFound: (msg = "资源不存在", code = "not_found") => new ApiError(404, code, msg),
  conflict: (msg: string, code = "conflict") => new ApiError(409, code, msg),
  quota: (msg: string, code = "quota_exceeded") => new ApiError(429, code, msg),
  internal: (msg = "服务器内部错误") => new ApiError(500, "internal", msg),
};
