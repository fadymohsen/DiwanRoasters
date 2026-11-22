import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// bigint columns hold epoch milliseconds, which fit a JS number
types.setTypeParser(20, (v) => Number(v));

declare global {
  var __diwanPool: Pool | undefined;
}

/** One pooled connection set per server instance. DATABASE_URL points at the pooled Neon endpoint. */
function pool() {
  if (!globalThis.__diwanPool) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // pg 8 warns about sslmode aliases; say what we mean
    const conn = url.replace(/sslmode=(require|prefer|verify-ca)/, "sslmode=verify-full");
    globalThis.__diwanPool = new Pool({ connectionString: conn, max: 5, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 10_000 });
  }
  return globalThis.__diwanPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return (await pool().query<T>(text, params)).rows;
}

/** Run several statements as one unit: all of them happen or none do. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
