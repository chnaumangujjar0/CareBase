import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(projectRoot, "src", "generated", "prisma");
const destination = path.join(projectRoot, "dist", "generated", "prisma");

await mkdir(path.dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });
console.log(`Copied Prisma runtime to ${path.relative(projectRoot, destination)}`);
