
import { NextRequest, NextResponse } from "next/server";
import {
    PlatformType,
    SearchInput,
    AggregatedSearchResult
} from "@/lib/platforms/types";
import { searchUnified } from "@/lib/search/unified-service";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Parse Inputs
        const inputs: SearchInput[] = [];

        // Text Queries
        const queriesJson = formData.get("queries") as string;
        if (queriesJson) {
            try {
                const parsedQueries = JSON.parse(queriesJson);
                if (Array.isArray(parsedQueries)) {
                    parsedQueries.forEach((q: { id: string, value: string }) => {
                        inputs.push({
                            id: q.id,
                            type: 'text',
                            value: q.value
                        });
                    });
                }
            } catch (e) {
                console.error("Failed to parse queries", e);
            }
        }

        // Image Files
        for (const key of formData.keys()) {
            if (key.startsWith("file_")) {
                const id = key.replace("file_", "");
                const file = formData.get(key) as File;
                if (file) {
                    inputs.push({
                        id,
                        type: 'image',
                        value: file.name,
                        file // We have the file object here to pass to service
                    });
                }
            }
        }

        // Platforms
        let platforms: PlatformType[] = ['alibaba', 'madeinchina'];
        const platformsJson = formData.get("platforms") as string;
        if (platformsJson) {
            try {
                platforms = JSON.parse(platformsJson);
            } catch (e) {
                // fallback
            }
        }

        // Execute Shared Search
        const unifiedResults = await searchUnified(inputs, platforms);

        const response: AggregatedSearchResult = {
            inputs: inputs.map(i => ({ id: i.id, type: i.type, value: i.value })), // Exclude file object
            results: unifiedResults,
            timestamp: Date.now()
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error("Unified API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

