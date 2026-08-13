import { AiUseCase, AiUsageStatus, Prisma } from "@prisma/client";
import prisma from "../../config/db";
import { AiExchangeRateService } from "../ai/ai.exchange-rate.service";

export interface AiUsageFilters {
  dateFrom?: Date;
  dateTo?: Date;
  useCase?: AiUseCase;
  provider?: string;
  model?: string;
  status?: AiUsageStatus;
  tableId?: string;
}

const toNumber = (value: unknown): number => Number(value ?? 0);
const toStringNumber = (value: bigint | number | null | undefined): string | null =>
  value === null || value === undefined ? null : value.toString();

export class AdminAiUsageService {
  static async summary(filters: AiUsageFilters) {
    const where = this.where(filters);
    const [aggregate, totalCalls, successfulCalls, failedCalls, pricedCalls, unpricedCalls, decisions, exchangeRate] =
      await Promise.all([
        prisma.aiUsageEvent.aggregate({
          where,
          _sum: {
            inputTokens: true,
            cachedInputTokens: true,
            outputTokens: true,
            totalTokens: true,
            costMicrosUsd: true,
          },
          _avg: {
            latencyMs: true,
          },
        }),
        prisma.aiUsageEvent.count({ where }),
        prisma.aiUsageEvent.count({ where: { ...where, status: "SUCCESS" } }),
        prisma.aiUsageEvent.count({ where: { ...where, status: "ERROR" } }),
        prisma.aiUsageEvent.count({ where: { ...where, costMicrosUsd: { not: null } } }),
        prisma.aiUsageEvent.count({ where: { ...where, costSource: "UNPRICED" } }),
        prisma.playerAiSuggestion.groupBy({
          by: ["status"],
          where: {
            ...(filters.tableId ? { tableId: filters.tableId } : {}),
            decidedAt: this.dateRange(filters),
            status: { in: ["ACCEPTED", "EDITED", "DISCARDED"] },
          },
          _count: { _all: true },
        }),
        AiExchangeRateService.getUsdBrlRate(),
      ]);

    const totalCost = aggregate._sum.costMicrosUsd ?? null;
    const totalCostUsd = totalCost === null ? null : Number(totalCost) / 1_000_000;
    return {
      period: this.period(filters),
      currency: "USD",
      brl: exchangeRate && totalCostUsd !== null
        ? {
            amount: Number((totalCostUsd * exchangeRate.rate).toFixed(6)),
            rate: exchangeRate.rate,
            date: exchangeRate.date,
            source: exchangeRate.source,
          }
        : null,
      totalCalls,
      successfulCalls,
      failedCalls,
      inputTokens: aggregate._sum.inputTokens ?? 0,
      cachedInputTokens: aggregate._sum.cachedInputTokens ?? 0,
      outputTokens: aggregate._sum.outputTokens ?? 0,
      totalTokens: aggregate._sum.totalTokens ?? 0,
      totalCostMicrosUsd: toStringNumber(totalCost),
      unpricedCalls,
      averageCostMicrosUsd:
        totalCost !== null && pricedCalls > 0 ? (totalCost / BigInt(pricedCalls)).toString() : null,
      averageLatencyMs: aggregate._avg.latencyMs ?? null,
      acceptedSuggestions: this.decisionCount(decisions, "ACCEPTED"),
      editedSuggestions: this.decisionCount(decisions, "EDITED"),
      discardedSuggestions: this.decisionCount(decisions, "DISCARDED"),
    };
  }

  static async timeseries(filters: AiUsageFilters) {
    const rows = await prisma.$queryRaw<Array<{
      day: Date;
      totalCalls: bigint;
      successfulCalls: bigint;
      failedCalls: bigint;
      inputTokens: bigint | null;
      cachedInputTokens: bigint | null;
      outputTokens: bigint | null;
      totalTokens: bigint | null;
      totalCostMicrosUsd: bigint | null;
      averageLatencyMs: number | null;
    }>>(Prisma.sql`
      SELECT
        date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS "day",
        count(*) AS "totalCalls",
        count(*) FILTER (WHERE "status" = 'SUCCESS') AS "successfulCalls",
        count(*) FILTER (WHERE "status" = 'ERROR') AS "failedCalls",
        sum("inputTokens") AS "inputTokens",
        sum("cachedInputTokens") AS "cachedInputTokens",
        sum("outputTokens") AS "outputTokens",
        sum("totalTokens") AS "totalTokens",
        sum("costMicrosUsd") AS "totalCostMicrosUsd",
        avg("latencyMs") AS "averageLatencyMs"
      FROM "AiUsageEvent"
      ${this.sqlWhere(filters)}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return {
      period: this.period(filters),
      timezone: "UTC",
      points: rows.map((row) => ({
        day: row.day.toISOString().slice(0, 10),
        totalCalls: toNumber(row.totalCalls),
        successfulCalls: toNumber(row.successfulCalls),
        failedCalls: toNumber(row.failedCalls),
        inputTokens: toNumber(row.inputTokens),
        cachedInputTokens: toNumber(row.cachedInputTokens),
        outputTokens: toNumber(row.outputTokens),
        totalTokens: toNumber(row.totalTokens),
        totalCostMicrosUsd: toStringNumber(row.totalCostMicrosUsd),
        averageLatencyMs: row.averageLatencyMs,
      })),
    };
  }

  static async breakdown(filters: AiUsageFilters) {
    const rows = await prisma.aiUsageEvent.groupBy({
      by: ["useCase", "provider", "model", "status", "tableId"],
      where: this.where(filters),
      _count: { _all: true },
      _sum: {
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costMicrosUsd: true,
      },
      _avg: { latencyMs: true },
      orderBy: { _count: { id: "desc" } },
      take: 100,
    });

    return {
      period: this.period(filters),
      items: rows.map((row) => ({
        useCase: row.useCase,
        provider: row.provider,
        model: row.model,
        status: row.status,
        tableId: row.tableId,
        totalCalls: row._count._all,
        inputTokens: row._sum.inputTokens ?? 0,
        cachedInputTokens: row._sum.cachedInputTokens ?? 0,
        outputTokens: row._sum.outputTokens ?? 0,
        totalTokens: row._sum.totalTokens ?? 0,
        totalCostMicrosUsd: toStringNumber(row._sum.costMicrosUsd),
        averageLatencyMs: row._avg.latencyMs,
      })),
    };
  }

  private static where(filters: AiUsageFilters): Prisma.AiUsageEventWhereInput {
    return {
      ...(filters.dateFrom || filters.dateTo ? { createdAt: this.dateRange(filters) } : {}),
      ...(filters.useCase ? { useCase: filters.useCase } : {}),
      ...(filters.provider ? { provider: filters.provider } : {}),
      ...(filters.model ? { model: filters.model } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.tableId ? { tableId: filters.tableId } : {}),
    };
  }

  private static dateRange(filters: AiUsageFilters) {
    return {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }

  private static period(filters: AiUsageFilters) {
    return {
      dateFrom: filters.dateFrom?.toISOString() ?? null,
      dateTo: filters.dateTo?.toISOString() ?? null,
      interpretation: "UTC inclusive bounds over AiUsageEvent.createdAt.",
    };
  }

  private static decisionCount(rows: Array<{ status: string; _count: { _all: number } }>, status: string): number {
    return rows.find((row) => row.status === status)?._count._all ?? 0;
  }

  private static sqlWhere(filters: AiUsageFilters) {
    const clauses: Prisma.Sql[] = [];
    if (filters.dateFrom) clauses.push(Prisma.sql`"createdAt" >= ${filters.dateFrom}`);
    if (filters.dateTo) clauses.push(Prisma.sql`"createdAt" <= ${filters.dateTo}`);
    if (filters.useCase) clauses.push(Prisma.sql`"useCase" = ${filters.useCase}::"AiUseCase"`);
    if (filters.provider) clauses.push(Prisma.sql`"provider" = ${filters.provider}`);
    if (filters.model) clauses.push(Prisma.sql`"model" = ${filters.model}`);
    if (filters.status) clauses.push(Prisma.sql`"status" = ${filters.status}::"AiUsageStatus"`);
    if (filters.tableId) clauses.push(Prisma.sql`"tableId" = ${filters.tableId}`);
    if (!clauses.length) {
      return Prisma.empty;
    }
    return Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
  }
}
