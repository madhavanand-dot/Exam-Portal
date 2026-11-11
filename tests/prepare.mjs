// The emulator only loads rules from inside this folder: take a fresh copy of the real file before every run.
import { copyFileSync } from "node:fs";
copyFileSync(new URL("../firestore.rules", import.meta.url), new URL("./firestore.rules", import.meta.url));
