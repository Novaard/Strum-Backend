import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import mqtt from "mqtt";

// Inisialisasi Driver Adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// Masukkan adapter ke dalam PrismaClient
const prisma = new PrismaClient({ adapter });
const app = new Elysia();

// --- 1. SETUP MQTT CLIENT (Background Process) ---
// Koneksi ke Mosquitto (Gunakan mqtt:// atau mqtts:// untuk internal server)
const mqttClient = mqtt.connect(
  process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: `backend-server-${Math.random().toString(16).slice(3)}`,
  },
);

mqttClient.on("connect", () => {
  console.log("✅ Connected to Mosquitto Broker");
  mqttClient.subscribe("mesin/telemetry", (err) => {
    if (err) console.error("❌ MQTT Subscribe Error:", err);
    else console.log("📡 Subscribed to topic: mesin/telemetry");
  });
});

mqttClient.on("error", (err) => {
  console.error("❌ MQTT Connection Error:", err);
});

mqttClient.on("message", async (topic, message) => {
  console.log(`📥 Menerima data di topik ${topic}`);

  if (topic === "mesin/telemetry") {
    try {
      const payload = JSON.parse(message.toString());
      console.log("📝 Menyimpan ke database:", payload.device_id);

      // Validasi struktur payload sederhana
      if (!payload.device_id || !payload.data) return;

      const timestamp = new Date(payload.connection.ts * 1000); // Asumsi timestamp unix (detik)

      // Simpan log dan update status terakhir device menggunakan Prisma Transaction
      await prisma.$transaction([
        // Update atau buat Device
        prisma.device.upsert({
          where: { id: payload.device_id },
          update: {
            ipAddress: payload.connection.ipaddress,
            lastSeen: timestamp,
            status: payload.data.status_mesin,
            voltase: payload.data.voltase,
            arus: payload.data.arus,
            suhu: payload.data.suhu,
            kelembapan: payload.data.kelembapan,
            thresholdIdle: payload.threshold.idle,
            thresholdDuty: payload.threshold.on_duty,
          },
          create: {
            id: payload.device_id,
            ipAddress: payload.connection.ipaddress,
            lastSeen: timestamp,
            status: payload.data.status_mesin,
            voltase: payload.data.voltase,
            arus: payload.data.arus,
            suhu: payload.data.suhu,
            kelembapan: payload.data.kelembapan,
            thresholdIdle: payload.threshold.idle,
            thresholdDuty: payload.threshold.on_duty,
          },
        }),
        // Insert Log Telemetri
        prisma.deviceLog.create({
          data: {
            deviceId: payload.device_id,
            timestamp: timestamp,
            voltase: payload.data.voltase,
            arus: payload.data.arus,
            status: payload.data.status_mesin,
            suhu: payload.data.suhu,
            kelembapan: payload.data.kelembapan,
          },
        }),
      ]);
    } catch (error) {
      console.error("❌ Error processing MQTT message:", error);
    }
  }
});

// --- 2. REST API SETUP ---
app.use(cors());

// Get All Devices (Current Status)
app.get("/api/devices", async () => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeen: "desc" },
    });
    return { success: true, data: devices };
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: "Database Error" }),
      { status: 500 },
    );
  }
});

// Get Statistics (Overall)
app.get("/api/stats", async () => {
  try {
    const total = await prisma.device.count();
    const onDuty = await prisma.device.count({ where: { status: "on_duty" } });
    const idle = await prisma.device.count({ where: { status: "idle" } });
    const off = await prisma.device.count({ where: { status: "off" } });

    return { success: true, data: { total, onDuty, idle, off } };
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: "Database Error" }),
      { status: 500 },
    );
  }
});

app.listen(3000);
console.log(
  `🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`,
);
