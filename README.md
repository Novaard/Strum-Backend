# ⚡ Strum-Backend (IoT Telemetry Server)

Backend server untuk memproses dan menyimpan data telemetri dari perangkat IoT (Internet of Things). Dibangun menggunakan ekosistem modern yang super cepat: **Bun**, **ElysiaJS**, **Prisma ORM** (dengan PostgreSQL), dan **MQTT Protocol**.

Versi terbaru ini mendukung penyimpanan **Raw JSON** untuk skalabilitas tinggi, dilengkapi dengan sistem Autentikasi (JWT + Cookie), kalkulasi **Summary Waktu (Downtime/Uptime)**, serta persentase **Availability**.

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

Project ini membutuhkan kredensial database, JWT rahasia, dan MQTT yang disimpan dalam file `.env`.

#### 1. Salin template environment yang sudah disediakan:

```bash
cp .env.example .env
```

#### 2. Buka file .env yang baru saja dibuat, lalu isi nilainya:

```env
# Database PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/iot_db?schema=public"

# Auth Secret (Ubah dengan string acak yang aman)
JWT_SECRET="SUPER_SECRET_KEY_UBAH_INI"

# MQTT Broker (Opsional jika tanpa kredensial)
MQTT_BROKER_URL="mqtt://localhost:1883"
MQTT_USERNAME=""
MQTT_PASSWORD=""
```

### 4. Setup Database & Pembuatan Akun Admin

Sinkronkan skema database, generate Prisma Client, dan jalankan seeder untuk membuat akun Admin pertama kali:

```bash
bunx prisma db push
bunx prisma generate
bun run prisma/seed.ts
```

(Catatan: Akun bawaan dari seeder adalah Username: `admin`, Password: `admin123`)

### 5. Jalankan Server

Jalankan server dalam mode development:

```bash
bun --watch src/index.ts
```

## 📡 Spesifikasi Integrasi IoT (MQTT)

Server ini berjalan di background untuk terus mendengarkan data dari perangkat keras (hardware) IoT melalui protokol MQTT. Semua data payload akan disimpan seutuhnya (Raw JSON) di dalam database.

- Topic Subscribe: `mesin/telemetry`
- Format Payload (JSON):
  Perangkat IoT wajib mengirimkan data dengan struktur berikut agar status dan timestamp dapat diproses oleh sistem:

```json
{
  "version": "1.0",
  "device_id": "ESP32-001",
  "connection": {
    "ipaddress": "192.168.1.10",
    "ts": 1741136820
  },
  "location": "Pabrik Utama",
  "data": {
    "voltase": 220,
    "arus": 5,
    "status_mesin": "on_duty",
    "suhu": 45,
    "kelembapan": 60
  },
  "threshold": 10
}
```

Catatan: `connection.ts` adalah UNIX Timestamp dalam hitungan **detik**. `data.status_mesin` harus bernilai: `"off"`, `"idle"`, atau `"on_duty"`.

## 🌐 Dokumentasi REST API

URL dasar: `http://localhost:3000`

⚠️ **PENTING**: Seluruh endpoint /api/\* (kecuali Login) diproteksi. Anda wajib melakukan Login terlebih dahulu. Sistem menggunakan cookie HttpOnly (auth_session) untuk menyimpan token JWT secara otomatis.

### 🔐 **Autentikasi**

1. **Login** (`POST /api/auth/login`)

- **Body (JSON)**: {`"username": "admin", "password": "admin123"`}
- **Response**: Menerbitkan Cookie `auth_session`.

2. **Logout** (`POST /api/auth/logout`)

- Menghapus sesi cookie saat ini.

### 📊 API Endpoint (Protected)

#### 1. Ambil Statistik Keseluruhan

Mengembalikan ringkasan total perangkat dan kalkulasi persentase kinerjanya.

- Endpoint: `GET /api/stats`
- Response:

```json
{
  "success": true,
  "data": {
    "total": 10,
    "on": 8,
    "idle": 3,
    "onDuty": 5,
    "off": 2,
    "percentOnDuty": "50.00%"
  }
}
```

**_(Catatan: `on` adalah gabungan dari `idle` + `onDuty`)_**

#### 2. Ambil Semua Perangkat (List)

Mengembalikan daftar semua mesin dengan payload JSON terakhir.

- Endpoint: `GET /api/devices`

#### 3. Detail Perangkat Spesifik

- Endpoint: `GET /api/devices/:id`
- Response:

```json
{
  "success": true,
  "data": {
    "id": "ESP32-001",
    "status": "on_duty",
    "lastSeen": "2026-03-05T01:33:00.000Z",
    "rawData": { ...payload_json_terakhir... }
  }
}
```

#### 4. Setup Jam Operasional

Mengatur batas waktu operasional pabrik/mesin (Digunakan untuk kalkulasi Availability).

- Endpoint: `POST /api/set-operasional`
- Body: {`"start": "08:00", "end": "17:00"`}

#### 5. Summary Harian

Mengalkulasi jam kerja (On Duty, Idle, Off) per perangkat pada tanggal spesifik.
Endpoint: `GET /api/summary/harian/{tanggal}` **_(Format: YYYY-MM-DD)_**

#### 6. Summary Mingguan & Bulanan (Dengan Availability)

Mengalkulasi ringkasan waktu mesin selama 7 hari atau 1 bulan terakhir, dilengkapi dengan persentase **_Availability_** `(Waktu Operasional - Downtime) / Waktu Operasional`.
Endpoint Mingguan: `GET /api/summary/mingguan`
Endpoint Bulanan: `GET /api/summary/bulanan`
Response:

```json
{
  "success": true,
  "range": {
    "startDate": "2026-02-26T00:00:00.000Z",
    "endDate": "2026-03-05T00:00:00.000Z"
  },
  "data": [
    {
      "device_id": "ESP32-001",
      "summary": {
        "idle_hours": "12.50",
        "onduty_hours": "40.00",
        "on_total_hours": "52.50",
        "off_hours": "5.00",
        "availability_percent": "92.06"
      }
    }
  ]
}
```

## 📂 Struktur Folder (Modular & Scalable)

Proyek ini telah direstrukturisasi menggunakan pendekatan modular (Plugin Elysia) agar mudah di-maintain dan siap untuk Production:

```txt
Strum-Backend/
 ├── prisma/
 │    ├── schema.prisma    # Skema Database PostgreSQL & Konfigurasi Raw JSON
 │    └── seed.ts          # Script untuk generate User Admin pertama kali
 ├── src/
 │    ├── index.ts         # Entry point utama (menjalankan API Server & MQTT Service)
 │    ├── db.ts            # Inisialisasi koneksi Prisma Client & Adapter PostgreSQL
 │    ├── mqtt.ts          # Service MQTT background (Subscribe telemetri & Insert ke DB)
 │    ├── utils/
 │    │    └── summary.ts  # Logika kompleks: Kalkulasi durasi (Uptime/Downtime) & Availability
 │    └── routes/
 │         ├── auth.ts     # Endpoint public: Login & Logout (Pembuatan JWT)
 │         └── api.ts      # Endpoint protected: Stats, Summary, & Set Operasional
 ├── .env                  # Variabel lingkungan rahasia
 ├── package.json          # List dependensi
 └── README.md             # Dokumentasi
```
