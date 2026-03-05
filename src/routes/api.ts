import { Elysia, t } from "elysia";
import jwt from "@elysiajs/jwt";
import { prisma } from "../db";
import { calculateSummary } from "../utils/summary";

export const apiRoutes = new Elysia({ prefix: "/api" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "SUPER_SECRET_KEY",
    }),
  )
  // --- MIDDLEWARE AUTENTIKASI ---
  .derive(async ({ jwt, cookie: { auth_session }, set }) => {
    const profile = await jwt.verify(auth_session.value as string);
    if (!profile) {
      set.status = 401;
      throw new Error("Unauthorized");
    }
    return { user: profile };
  })

  // 1. Stats
  .get("/stats", async () => {
    const total = await prisma.device.count();
    const onDuty = await prisma.device.count({ where: { status: "on_duty" } });
    const idle = await prisma.device.count({ where: { status: "idle" } });
    const off = await prisma.device.count({ where: { status: "off" } });

    const totalOn = onDuty + idle;
    const percentOnDuty = total === 0 ? 0 : (onDuty / total) * 100;

    return {
      success: true,
      data: {
        total,
        on: totalOn,
        idle,
        onDuty,
        off,
        percentOnDuty: percentOnDuty.toFixed(2) + "%",
      },
    };
  })

  // 2. Device List
  .get("/devices", async () => {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeen: "desc" },
    });
    return { success: true, data: devices };
  })

  // 3. Device Detail
  .get("/devices/:id", async ({ params: { id } }) => {
    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) return { success: false, message: "Device tidak ditemukan" };
    return { success: true, data: device };
  })

  // 4. Summary Harian
  .get("/summary/harian/:tanggal", async ({ params: { tanggal } }) => {
    // Format tanggal: YYYY-MM-DD
    const startDate = new Date(`${tanggal}T00:00:00.000Z`);
    const endDate = new Date(`${tanggal}T23:59:59.999Z`);

    const devices = await prisma.device.findMany({ select: { id: true } });
    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );
    return { success: true, data: results };
  })

  // 5. Summary Mingguan
  .get("/summary/mingguan", async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // 7 Hari terakhir

    const devices = await prisma.device.findMany({ select: { id: true } });
    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );
    return { success: true, range: { startDate, endDate }, data: results };
  })

  // 6. Summary Bulanan
  .get("/summary/bulanan", async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 1); // 1 Bulan terakhir

    const devices = await prisma.device.findMany({ select: { id: true } });
    const results = await Promise.all(
      devices.map(async (d) => ({
        device_id: d.id,
        summary: await calculateSummary(d.id, startDate, endDate),
      })),
    );
    return { success: true, range: { startDate, endDate }, data: results };
  })

  // 7. Set Operasional
  .post(
    "/set-operasional",
    async ({ body }) => {
      await prisma.appConfig.upsert({
        where: { key: "operational_hours" },
        update: { value: body },
        create: { key: "operational_hours", value: body },
      });
      return {
        success: true,
        message: "Jam operasional berhasil diubah",
        data: body,
      };
    },
    {
      body: t.Object({
        start: t.String({ description: "Format HH:mm misal 08:00" }),
        end: t.String({ description: "Format HH:mm misal 17:00" }),
      }),
    },
  );
