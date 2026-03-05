import mqtt from "mqtt";
import { prisma } from "./db";

export function initMQTT() {
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
    mqttClient.subscribe("mesin/telemetry");
  });

  mqttClient.on("message", async (topic, message) => {
    if (topic === "mesin/telemetry") {
      try {
        const payload = JSON.parse(message.toString());
        if (!payload.device_id || !payload.data) return;

        const timestamp = new Date(payload.connection.ts * 1000);
        const statusMesin = payload.data.status_mesin; // "off", "idle", "on_duty"

        await prisma.$transaction([
          prisma.device.upsert({
            where: { id: payload.device_id },
            update: {
              status: statusMesin,
              lastSeen: timestamp,
              rawData: payload, // Simpan RAW JSON
            },
            create: {
              id: payload.device_id,
              status: statusMesin,
              lastSeen: timestamp,
              rawData: payload, // Simpan RAW JSON
            },
          }),
          prisma.deviceLog.create({
            data: {
              deviceId: payload.device_id,
              timestamp: timestamp,
              status: statusMesin,
              rawData: payload, // Simpan RAW JSON
            },
          }),
        ]);
      } catch (error) {
        console.error("❌ Error processing MQTT message:", error);
      }
    }
  });
}
