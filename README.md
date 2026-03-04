# ⚡ Strum-Backend (IoT Telemetry Server)

Backend server untuk memproses dan menyimpan data telemetri dari perangkat IoT (Internet of Things). Dibangun menggunakan ekosistem modern yang super cepat: **Bun**, **ElysiaJS**, **Prisma ORM** (dengan PostgreSQL), dan **MQTT Protocol**.

---

## 📋 Persyaratan Sistem (Prerequisites)

Sebelum menjalankan project ini, pastikan sistem Anda sudah terinstal:
1. **[Bun](https://bun.sh/)** (Minimal versi v1.0+) - Sebagai runtime dan package manager.
2. **PostgreSQL** - Database untuk menyimpan data perangkat dan log telemetri.
3. **MQTT Broker** (Contoh: Eclipse Mosquitto) - Sebagai jalur komunikasi dengan perangkat IoT.

---

## 🚀 Cara Instalasi & Menjalankan Project (Quick Start)

Ikuti langkah-langkah di bawah ini untuk menjalankan backend di mesin lokal Anda:

### 1. Clone Repositori
```bash
git clone https://github.com/Novaard/Strum-Backend.git
cd Strum-Backend
```

### 2. Instalasi Dependensi
Karena project ini menggunakan Bun, jalankan perintah berikut untuk menginstal semua library yang dibutuhkan:
```bash
bun install
```

### 3. Konfigurasi Environment Variables
Project ini membutuhkan kredensial database dan MQTT yang disimpan dalam file .env.
  #### 1. Salin template environment yang sudah disediakan:
  ```bash
  cp .env.example .env
  ```
  #### 2. Buka file `.env` yang baru saja dibuat, lalu isi nilainya sesuai dengan konfigurasi lokal Anda:
  ```env
  # Contoh isi .env
  DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/iot_db?schema=public"
  
  MQTT_BROKER_URL="mqtt://localhost:1883"
  MQTT_USERNAME="opsional_jika_ada"
  MQTT_PASSWORD="opsional_jika_ada"
  ```

### 4. Setup Database (Prisma)
Setelah `.env` terkonfigurasi, sinkronkan skema database dan generate Prisma Client:
```bash
bunx prisma generate
bunx prisma migrate dev
```

### 5. Jalankan Server
Jalankan server dalam mode development (dilengkapi dengan auto-reload jika ada perubahan kode):
```bash
bun --watch src/index.ts
```
Output yang diharapkan jika berhasil:
```text
✅ Connected to Mosquitto Broker
📡 Subscribed to topic: mesin/telemetry
🦊 Backend is running at localhost:3000
```

## 📡 Spesifikasi Integrasi IoT (MQTT)
Server ini berjalan di background untuk terus mendengarkan data dari perangkat keras (hardware) IoT melalui protokol MQTT.
- Topic Subscribe: mesin/telemetry
- Format Payload (JSON): Perangkat IoT wajib mengirimkan data dengan struktur berikut agar dapat disimpan ke database:
```json
{
  "device_id": "mesin_001",
  "connection": {
    "ts": 1709519520, 
    "ipaddress": "192.168.1.10"
  },
  "data": {
    "status_mesin": "on_duty",
    "voltase": 220.5,
    "arus": 1.2,
    "suhu": 45.2,
    "kelembapan": 60.5
  },
  "threshold": {
    "idle": 0.5,
    "on_duty": 1.0
  }
}
```
Catatan: `ts` adalah UNIX Timestamp dalam hitungan detik.

## 🌐 Dokumentasi REST API
Server menyediakan REST API endpoint untuk aplikasi Frontend / Dashboard. URL dasar: http://localhost:3000
### 1. Ambil Semua Status Perangkat Terakhir
Mengembalikan daftar semua mesin beserta status dan data sensor terakhirnya.
- Endpoint: GET /api/devices
- Response (200 OK):
```json
{
  "success": true,
  "data":[
    {
      "id": "mesin_001",
      "ipAddress": "192.168.1.10",
      "lastSeen": "2024-03-04T02:32:00.000Z",
      "status": "on_duty",
      "voltase": 220.5,
      "arus": 1.2,
      "suhu": 45.2,
      "kelembapan": 60.5,
      "thresholdIdle": 0.5,
      "thresholdDuty": 1.0
    }
  ]
}
```

### 2. Ambil Statistik Keseluruhan
Mengembalikan ringkasan status dari seluruh mesin yang terdaftar.
- Endpoint: GET /api/stats
- Response (200 OK):
```json
{
  "success": true,
  "data": {
    "total": 10,
    "onDuty": 5,
    "idle": 3,
    "off": 2
  }
}
```
