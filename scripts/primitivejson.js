#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname, basename, extname, join } from "path";

/**
 * Merge two structure descriptors safely
 */
function mergeTypes(a, b) {
    if (a === undefined) return b;
    if (b === undefined) return a;

    // Both primitives
    if (typeof a === "string" && typeof b === "string") {
        if (a === b) return a;
        return [a, b];
    }

    // One primitive, one array → unify
    if (typeof a === "string" && Array.isArray(b)) {
        return Array.from(new Set([...b, a]));
    }
    if (Array.isArray(a) && typeof b === "string") {
        return Array.from(new Set([...a, b]));
    }

    // Both arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        const combined = [...a];

        for (const itemB of b) {
            const exists = combined.some((itemA) =>
                JSON.stringify(itemA) === JSON.stringify(itemB)
            );
            if (!exists) combined.push(itemB);
        }

        return combined;
    }

    // Both objects → merge keys
    if (typeof a === "object" && typeof b === "object") {
        const merged = { ...a };
        for (const key in b) {
            merged[key] = mergeTypes(merged[key], b[key]);
        }
        return merged;
    }

    // Mixed types fallback
    return Array.from(
        new Set([].concat(a, b).map((v) => JSON.stringify(v)))
    ).map((v) => JSON.parse(v));
}

function getStructure(value) {
    if (value === null) return "null";

    if (Array.isArray(value)) {
        if (value.length === 0) return ["unknown"];

        let mergedStructure = undefined;

        for (const element of value) {
            const elementStruct = getStructure(element);
            mergedStructure = mergeTypes(mergedStructure, elementStruct);
        }

        // Always return array
        return Array.isArray(mergedStructure)
            ? mergedStructure
            : [mergedStructure];
    }

    if (typeof value === "object") {
        const result = {};
        for (const key in value) {
            result[key] = getStructure(value[key]);
        }
        return result;
    }

    return typeof value;
}

async function main() {
    const file = process.argv[2];
    if (!file) {
        console.error("Usage: node json-structure.js <path-to-json-file>");
        process.exit(1);
    }

    try {
        const fullPath = resolve(process.cwd(), file);
        const content = readFileSync(fullPath, "utf-8");
        const json = JSON.parse(content);

        const structure = getStructure(json);

        const dir = dirname(fullPath);
        const name = basename(fullPath, extname(fullPath));
        const outName = `${name}.structure.json`;
        const outPath = join(dir, outName);

        writeFileSync(outPath, JSON.stringify(structure, null, 2), "utf-8");

        console.log(`✅ Structure saved to: ${outPath}`);
    } catch (e) {
        console.error("❌ Error:", e.message);
        process.exit(1);
    }
}

main();
