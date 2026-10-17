import { createInterface } from "node:readline/promises";
import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { isConfiguredSuperAdmin } from "../utils/superAdmin.utils.js";

const askHidden = (prompt: string): Promise<string> => new Promise((resolve, reject) => {
  const input = process.stdin;
  if (!input.isTTY) {
    reject(new Error("Run this command in an interactive terminal so the password can be entered securely."));
    return;
  }

  let value = "";
  process.stdout.write(prompt);
  input.setRawMode(true);
  input.resume();
  const cleanup = () => {
    input.setRawMode(false);
    input.removeListener("data", onData);
    process.stdout.write("\n");
  };
  const onData = (chunk: Buffer) => {
    for (const char of chunk.toString("utf8")) {
      if (char === "\u0003") {
        cleanup();
        reject(new Error("Cancelled."));
        return;
      }
      if (char === "\r" || char === "\n") {
        cleanup();
        resolve(value);
        return;
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
      } else if (char >= " ") {
        value += char;
      }
    }
  };
  input.on("data", onData);
});

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run super-admin:create -- admin@example.com");
  process.exitCode = 1;
} else if (!isConfiguredSuperAdmin(email)) {
  console.error("Add this email to SUPER_ADMIN_EMAILS in Backend/.env, then restart the command.");
  process.exitCode = 1;
} else {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const name = (await prompt.question("Administrator name: ")).trim();
    prompt.close();
    if (!name) throw new Error("Administrator name is required.");

    const password = await askHidden("Password (hidden): ");
    if (password.length < 8) throw new Error("Password must be at least 8 characters long.");
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await db.user.findUnique({ where: { email }, select: { id: true, tenantId: true, roleId: true } });
    if (existing && (existing.tenantId || existing.roleId)) {
      throw new Error("Use a separate account without a hospital or staff role for platform administration.");
    }

    if (existing) {
      await db.user.update({ where: { id: existing.id }, data: { name, passwordHash, isActive: true, isSuperAdmin: true } });
    } else {
      await db.user.create({ data: { name, email, passwordHash, isActive: true, isSuperAdmin: true } });
    }
    console.log(`Platform administrator account ready for ${email}. Sign in through the CareBase login page.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not create platform administrator.");
    process.exitCode = 1;
  } finally {
    prompt.close();
    await db.$disconnect();
  }
}
