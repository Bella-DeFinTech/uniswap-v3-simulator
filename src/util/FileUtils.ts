import { accessSync, constants } from "fs";
import { basename } from "path";

export function exists(filePath: string): boolean {
  try {
    accessSync(filePath, constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

export function getDatabaseNameFromPath(
  filePath: string,
  extToMove?: string
): string {
  return basename(filePath, extToMove);
}
