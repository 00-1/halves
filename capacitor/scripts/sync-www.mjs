/*
 * T231 — copy the SHIPPING web build (gg1/prod) into the Capacitor webDir (www/),
 * so gg1/prod stays the single source of truth and Capacitor just bundles a copy.
 * Run from the capacitor/ dir (npm run sync:www) or via the CI workflow.
 *
 * NON-DESTRUCTIVE to the web app: this only READS gg1/prod and writes into
 * capacitor/www (which is git-ignored + regenerated). It never modifies gg1/*.
 */
import { existsSync, rmSync, mkdirSync, cpSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));      // capacitor/scripts
const repoRoot = join(here, "..", "..");                    // halves/
const SRC = join(repoRoot, "gg1", "prod");
const DST = join(here, "..", "www");                        // capacitor/www

if(!existsSync(SRC)) { console.error("FATAL: source not found: " + SRC); process.exit(1); }

rmSync(DST, { recursive: true, force: true });
mkdirSync(DST, { recursive: true });
cpSync(SRC, DST, { recursive: true });

const n = readdirSync(DST).length;
if(!existsSync(join(DST, "index.html"))) { console.error("FATAL: no index.html in synced www — gg1/prod incomplete?"); process.exit(1); }
console.log("synced gg1/prod → capacitor/www (" + n + " top-level entries; index.html present)");
