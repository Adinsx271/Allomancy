import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("alle Browser-Skripte sind syntaktisch gültig", () => {
    const projectRoot = path.join(__dirname, "..");
    const rootScripts = fs.readdirSync(projectRoot)
        .filter((fileName) => fileName.endsWith(".js"))
        .map((fileName) => path.join(projectRoot, fileName));
    const editorScripts = fs.readdirSync(path.join(projectRoot, "level-editor"))
        .filter((fileName) => fileName.endsWith(".js"))
        .map((fileName) => path.join(projectRoot, "level-editor", fileName));

    for (const fileName of [...rootScripts, ...editorScripts]) {
        const source = fs.readFileSync(fileName, "utf8")
            .replace(/^import[\s\S]*?;\s*$/gm, "")
            .replace(/export\s*\{[\s\S]*?\};/g, "")
            .replace(/\bexport\s+default\s+/g, "")
            .replace(/\bexport\s+(?=async\s+function\b)/g, "")
            .replace(/\bexport\s+(?=(const|let|class|function)\b)/g, "");
        new vm.Script(source, { filename: fileName });
    }
});
