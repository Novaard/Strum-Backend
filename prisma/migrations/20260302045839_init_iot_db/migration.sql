-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'off',
    "voltase" INTEGER NOT NULL DEFAULT 0,
    "arus" INTEGER NOT NULL DEFAULT 0,
    "suhu" INTEGER NOT NULL DEFAULT 0,
    "kelembapan" INTEGER NOT NULL DEFAULT 0,
    "thresholdIdle" INTEGER NOT NULL DEFAULT 0,
    "thresholdDuty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceLog" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "voltase" INTEGER NOT NULL,
    "arus" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "suhu" INTEGER NOT NULL,
    "kelembapan" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceLog_deviceId_idx" ON "DeviceLog"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceLog_timestamp_idx" ON "DeviceLog"("timestamp");

-- AddForeignKey
ALTER TABLE "DeviceLog" ADD CONSTRAINT "DeviceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
