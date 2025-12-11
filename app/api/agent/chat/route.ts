import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";

import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { searchTool } from "@/lib/agent/tools";
import { ChatRequest, StreamEvent, SerializedMessage } from "@/contracts/api.types";

// Force dynamic since we read request body and stream response

export const maxDuration = 60; // Allow 60s for agent thinking/tools

export async function POST(req: NextRequest) {
    try {
        const body: ChatRequest = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
        }

        // 1. Initialize LLM
        const llm = new ChatOpenAI({
            model: "google/gemini-2.5-pro", // Updated to vision-capable model
            temperature: 0,
            configuration: {
                apiKey: process.env.OPENAI_API_KEY,
                baseURL: "https://openrouter.ai/api/v1/",
            },
        });

        // 2. Define Tools
        const tools = [searchTool];

        const agent = createAgent({
            model: llm,
            tools,
            systemPrompt: `You are a helpful sourcing assistant for SupplierCanvas. 
You help users find suppliers on Alibaba and Made-in-China. 

CORE BEHAVIORS:
1. DESCRIPTIVE RESPONSES: Be elaborative and descriptive in your analysis. Don't just give short answers. Explain *why* you are searching for specific terms.
2. SEARCH STRATEGY:
   - When a user provides a specific product name, DO NOT just search for that one term. You MUST generate multiple relevant search queries including synonyms, industry terms, and variations.
   - When a user provides a broad description, analyze the intent and extract relevant commercial keywords for search.
3. IMAGE INPUTS:
   - If the user provides an image, you MUST identify the product shown.
   - You MUST IMMEDIATELY call the 'search' tool with keywords derived from the image analysis. This is mandatory for all image inputs.

ALWAYS use the 'search' tool when the user asks for products, describes a need, or uploads an image.
When calling the search tool, provide an array of diverse, high-value keywords in the 'queries' argument to maximize results.
When tool results are returned, they are automatically shown to the user. Briefly summarize the findings but focus your text response on the *quality* of the match or specific details rather than just listing names.`,
        });

        // 4. Prepare History & Context
        const messagesData = messages as SerializedMessage[];
        const history: (HumanMessage | AIMessage | ToolMessage)[] = [];
        let attachments: string[] = []; // Store base64 images from the LAST user message

        // Process all messages except the last one
        for (let i = 0; i < messagesData.length - 1; i++) {
            const m = messagesData[i];

            // Check both data.content (new format) and kwargs.content (old format)
            const content = m.data?.content || m.kwargs?.content || "";

            // Determine type: check m.type first, then fall back to ID check
            let type = m.type;
            if (type === 'constructor' && m.id) {
                const classType = m.id[m.id.length - 1];
                if (classType === 'HumanMessage') type = 'human';
                else if (classType === 'AIMessage') type = 'ai';
                else if (classType === 'ToolMessage') type = 'tool';
            }

            if (type === 'human') history.push(new HumanMessage(content));
            else if (type === 'ai') history.push(new AIMessage(content));
            else if (type === 'tool') {
                history.push(new ToolMessage({
                    content: content,
                    tool_call_id: m.kwargs?.tool_call_id || "",
                    name: m.kwargs?.name || m.data?.name || "tool"
                }));
            }
        }

        // Process the LAST message (User's current input)
        const lastMessageData = messagesData[messagesData.length - 1];
        let lastContentText = lastMessageData.data?.content || lastMessageData.kwargs?.content || "";

        // Handle array content (multimodal)
        if (Array.isArray(lastContentText)) {
            const textBlock = lastContentText.find((c: any) => c.type === 'text');
            lastContentText = textBlock ? textBlock.text : "";
        }
        console.log("Extracted Text:", lastContentText);
        // Check for images in the last message's payload
        // We look in 'data' properties for custom fields like 'images'
        const lastImages = (lastMessageData.data as any)?.images || (lastMessageData as any).images || [];

        // Construct the final HumanMessage
        let finalUserMessage: HumanMessage;

        if (lastImages && lastImages.length > 0) {
            attachments = lastImages; // Capture for tool config
            console.log(`[Agent] Received ${attachments.length} images`);

            // Multimodal Content Block
            const contentBlocks: any[] = [
                { type: "text", text: lastContentText }
            ];

            lastImages.forEach((img: string) => {
                // Parse data URI: data:image/jpeg;base64,...
                const [metadata, base64Data] = img.split(',');
                const mimeType = metadata.split(':')[1].split(';')[0];

                contentBlocks.push({
                    type: "image",
                    image_url: {
                        url: img
                    },
                    // base64: base64Data,
                    // mime_type: mimeType,
                } as any);
                console.log(`[Agent] Added image: ${mimeType}, length: ${base64Data.length}`);
            });

            finalUserMessage = new HumanMessage({ content: contentBlocks });
        } else {
            // Text-only
            finalUserMessage = new HumanMessage(lastContentText);
        }

        // 5. Create Streaming Response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Stream agent execution
                    const eventStream = await agent.streamEvents(
                        {
                            messages: [
                                ...history,
                                finalUserMessage
                            ]
                        },
                        {
                            streamMode: ["values", "updates"],
                            // Pass attachments to tools via configurable
                            configurable: {
                                attachments: attachments
                            }
                        }
                    );

                    for await (const event of eventStream) {
                        // Handle both chat model stream and generic llm stream
                        console.log("Agent Event:", event.event, event.name);
                        if (event.event === "on_chat_model_stream" || event.event === "on_llm_stream") {
                            const chunk = event.data.chunk;

                            // Debugging reasoning content
                            console.log("----------------------------------------------------------------");
                            console.log("Chunk keys:", Object.keys(chunk || {}));
                            if (chunk?.lc_kwargs) console.log("lc_kwargs:", JSON.stringify(chunk.lc_kwargs, null, 2));
                            if (chunk?.additional_kwargs) console.log("additional_kwargs:", JSON.stringify(chunk.additional_kwargs, null, 2));
                            if (chunk?.message?.additional_kwargs) console.log("message.additional_kwargs:", JSON.stringify(chunk.message.additional_kwargs, null, 2));
                            console.log("----------------------------------------------------------------");

                            // Check for content in various possible locations
                            const content = chunk?.content || chunk?.message?.content || chunk?.text || "";

                            if (content) {
                                const streamEvent: StreamEvent = {
                                    type: 'model',
                                    data: {
                                        messages: [{
                                            content,
                                            type: 'ai',
                                            data: { content }
                                        } as any]
                                    },
                                    timestamp: Date.now()
                                };
                                controller.enqueue(JSON.stringify(streamEvent) + "\n");
                            }
                        } else if (event.event === "on_tool_end") {
                            // Check for output
                            if (event.data.output) {
                                const streamEvent: StreamEvent = {
                                    type: 'tools',
                                    data: { output: event.data.output },
                                    timestamp: Date.now()
                                };
                                controller.enqueue(JSON.stringify(streamEvent) + "\n");
                            }
                        } else if (event.event === "on_llm_error" || event.event === "on_tool_error" || event.event === "on_chain_error") {
                            console.error("Agent Stream Error Event:", event);
                        }
                    }

                    // Safely close
                    if (controller.desiredSize !== null) {
                        controller.close();
                    }
                } catch (e) {
                    console.error("Stream error", JSON.stringify(e));
                    // Only error if stream is still open
                    if (controller.desiredSize !== null) {
                        controller.error(e);
                    }
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (error: any) {
        console.error("Agent Request Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}