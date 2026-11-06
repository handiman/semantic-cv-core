// Removes the given files/folders (recursively, ignoring missing ones).
// Usage: node scripts/clean.js <path> [<path> ...]
import { rmSync } from 'node:fs';

for (const target of process.argv.slice(2)) {
  rmSync(target, { recursive: true, force: true });
}
