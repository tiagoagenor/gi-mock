import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface LogFilters {
  method?: string;
  statusRange?: "1xx" | "2xx" | "3xx" | "4xx" | "5xx";
  mockId?: string;
  search?: string;
  take?: number;
  cursor?: string;
}

export async function listLogs(filters: LogFilters) {
  const where: Prisma.RequestLogWhereInput = {};
  if (filters.method) where.method = filters.method;
  if (filters.mockId) where.mockId = filters.mockId;
  if (filters.search) where.path = { contains: filters.search };
  if (filters.statusRange) {
    const base = Number(filters.statusRange[0]) * 100;
    where.statusCode = { gte: base, lt: base + 100 };
  }

  const take = Math.min(filters.take ?? 100, 500);
  const logs = await prisma.requestLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    include: { mock: { select: { name: true, hash: true } } },
  });

  const hasMore = logs.length > take;
  const items = hasMore ? logs.slice(0, take) : logs;
  return { items, nextCursor: hasMore ? items[items.length - 1]?.id : null };
}

export async function getLog(id: string) {
  return prisma.requestLog.findUnique({
    where: { id },
    include: { mock: { select: { name: true, hash: true, method: true, path: true } } },
  });
}

export async function clearLogs() {
  await prisma.requestLog.deleteMany({});
}
