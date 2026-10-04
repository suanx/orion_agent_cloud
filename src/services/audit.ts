import type { Client } from "@libsql/client";

export async function audit(
  db: Client,
  userId: string | null,
  action: string,
  detail: string,
  ip: string
): Promise<void> {
  await db.execute({
    sql: "INSERT INTO audit_log (user_id, action, detail, ip, at) VALUES (?, ?, ?, ?, ?)",
    args: [userId, action, detail, ip, Date.now()],
  });
}
