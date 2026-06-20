import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { AppError } from "../../errors/AppError";
import {
  cleanupExpiredRateLimitBuckets,
  createRateLimiter,
  getRateLimitBucketCount,
} from "../rateLimit";
import { requestDuration } from "../requestDuration";

const test = async (name: string, run: () => Promise<void> | void): Promise<void> => {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

class MockResponse extends EventEmitter {
  statusCode = 200;
  headers = new Map<string, string>();

  setHeader(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }
}

void (async () => {
  await test("rate limiter bloqueia acima do limite e envia headers", () => {
    const limiter = createRateLimiter(2, 60_000, {
      scope: `test-${Date.now()}`,
      keyGenerator: () => "actor",
    });
    const req = {
      user: { id: "user-1" },
      ip: "127.0.0.1",
      baseUrl: "/api/v1/tables",
      path: "/dashboard",
      route: { path: "/dashboard" },
    } as any;

    const call = () => {
      const res = new MockResponse();
      let error: unknown;
      limiter(req, res as any, (nextError?: unknown) => {
        error = nextError;
      });
      return { res, error };
    };

    assert.equal(call().error, undefined);
    assert.equal(call().error, undefined);
    const blocked = call();
    assert.ok(blocked.error instanceof AppError);
    assert.equal((blocked.error as AppError).code, "RATE_LIMIT_EXCEEDED");
    assert.equal(blocked.res.headers.get("retry-after"), "60");
  });

  await test("cleanup remove buckets expirados", () => {
    assert.ok(getRateLimitBucketCount() > 0);
    assert.ok(cleanupExpiredRateLimitBuckets(Date.now() + 120_000) > 0);
  });

  await test("request duration gera log estruturado sem payload", () => {
    const req = {
      requestId: "request-1",
      method: "GET",
      originalUrl: "/api/v1/tables/table-1/missions?limit=20",
      params: { tableId: "table-1" },
      user: { id: "user-1" },
      body: { password: "never-log-this" },
    } as any;
    const res = new MockResponse();
    const originalInfo = console.info;
    let output = "";
    console.info = (message?: unknown) => {
      output = String(message);
    };

    try {
      requestDuration(req, res as any, () => undefined);
      res.emit("finish");
    } finally {
      console.info = originalInfo;
    }

    const log = JSON.parse(output);
    assert.equal(log.event, "http_request");
    assert.equal(log.method, "GET");
    assert.equal(log.path, "/api/v1/tables/table-1/missions");
    assert.equal(log.userId, "user-1");
    assert.equal(log.tableId, "table-1");
    assert.equal(typeof log.durationMs, "number");
    assert.equal(output.includes("never-log-this"), false);
  });

  console.log("Middleware tests completed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
