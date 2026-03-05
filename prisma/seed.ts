// prisma/seed.ts
import { prisma } from "../src/db"; // Menggunakan konfigurasi yang sudah benar dari src/db.ts

async function main() {
  console.log("Memulai proses seeding...");

  // Hash password menggunakan bawaan Bun
  const hashPassword = await Bun.password.hash("admin123");

  // Gunakan upsert agar jika di-run 2x tidak terjadi error duplicate
  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashPassword,
    },
  });

  console.log("✅ Admin user created/verified:", user.username);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
