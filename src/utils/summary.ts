import { prisma } from "../db.js";

export async function calculateSummary(
  deviceId: string,
  startDate: Date,
  endDate: Date,
) {
  const logs = await prisma.deviceLog.findMany({
    where: { deviceId, timestamp: { gte: startDate, lte: endDate } },
    orderBy: { timestamp: "asc" },
  });

  let idleHours = 0;
  let onDutyHours = 0;
  let offHours = 0;

  // Ambil config operasional (default 08:00 - 17:00 jika belum di set)
  const config = await prisma.appConfig.findUnique({
    where: { key: "operational_hours" },
  });
  const opsHours = config
    ? (config.value as any)
    : { start: "08:00", end: "17:00" };

  // Helper kalkulasi durasi (disederhanakan untuk contoh)
  // Dalam real-case, harus mendeteksi rentang waktu yang masuk ke jam operasional
  for (let i = 0; i < logs.length - 1; i++) {
    const currentLog = logs[i];
    const nextLog = logs[i + 1];

    // Konversi milidetik ke Jam
    const diffHours =
      (nextLog.timestamp.getTime() - currentLog.timestamp.getTime()) /
      (1000 * 60 * 60);

    if (currentLog.status === "idle") idleHours += diffHours;
    else if (currentLog.status === "on_duty") onDutyHours += diffHours;
    else if (currentLog.status === "off") offHours += diffHours;
  }

  const onHours = idleHours + onDutyHours;

  // Rumus Availability: (Waktu Ops - Downtime) / Waktu Ops
  // *Asumsi sementara*: offHours dihitung sebagai downtime penuh. Untuk perhitungan presisi pada jam operasional
  // Anda perlu memfilter diffHours yang hanya berada di antara jam ops (misal jam 8 s/d 17 = 9 jam total ops/hari).

  // Total Ops per hari misal 9 jam. Jika mingguan (7 hari) = 63 Jam.
  const totalDays =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) || 1;

  const startHourNum = parseInt(opsHours.start.split(":")[0]);
  const endHourNum = parseInt(opsHours.end.split(":")[0]);
  const opsHoursPerDay = endHourNum - startHourNum;
  const totalOpsTime = opsHoursPerDay * totalDays;

  // Persentase
  let availability = 0;
  if (totalOpsTime > 0) {
    // Downtime adalah seberapa lama mesin OFF di jam tersebut
    // Asumsi sederhana: seluruh offHours terjadi di jam kerja (pada realisasinya logic pemotongan waktu bisa lebih rumit)
    const downtime = offHours > totalOpsTime ? totalOpsTime : offHours;
    availability = ((totalOpsTime - downtime) / totalOpsTime) * 100;
  }

  return {
    idle_hours: idleHours.toFixed(2),
    onduty_hours: onDutyHours.toFixed(2),
    on_total_hours: onHours.toFixed(2),
    off_hours: offHours.toFixed(2),
    availability_percent: availability.toFixed(2),
  };
}
