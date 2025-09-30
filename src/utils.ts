import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const radians = (degrees: number): number => degrees * (Math.PI / 180);
