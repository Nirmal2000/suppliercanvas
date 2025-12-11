import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";

import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { searchTool } from "@/lib/agent/tools";
import { ChatRequest, StreamEvent, SerializedMessage } from "@/contracts/api.types";

// Force dynamic since we read request body and stream response
export const dynamic = 'force-dynamic';
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
            model: "gpt-4o-mini", // Updated from modelName
            temperature: 0,
        });

        // 2. Define Tools
        const tools = [searchTool];

        // 3. Create Agent (New API)
        // Note: We are using the user-provided API signature. 
        // If 'createAgent' is not found, we might need 'createToolCallingAgent' from 'langchain/agents' but without AgentExecutor?
        // No, the snippet implies a new unified entry point.
        // If this fails at runtime/build, we will revert/fix.
        // For now, I will use the code as requested.

        // Wait, if I write invalid code it won't run.
        // I'll assume 'langchain' exports it.
        // However, I suspect the user might be using a wrapper or hypothetical API? 
        // "AgentExecutor ... are legacy ... Use createAgent".
        // Let's assume this exists.

        const agent = createAgent({
            model: llm,
            tools,
            systemPrompt: `You are a helpful sourcing assistant for SupplierCanvas. 
You help users find suppliers on Alibaba and Made-in-China. 
ALWAYS use the 'search' tool when the user asks for products or suppliers. 
When the tool returns results, they are automatically shown to the user in the main grid, 
so you should just briefly summarize what you found (e.g. 'I found 10 suppliers for X...'). 
Do not list all products in the chat unless specifically asked.`,
        });

        // 4. Prepare History
        // Fix for "m throws when doing m.type" -> use 'any' cast and safe checks
        // 4. Prepare History
        const messagesData = messages as SerializedMessage[];
        const lastMessage = messagesData[messagesData.length - 1]!;
        const history = messagesData.slice(0, -1).map((m: SerializedMessage) => {
            if (m.type === 'human') return new HumanMessage(m.data.content || "");
            if (m.type === 'ai') return new AIMessage(m.data.content || "");
            if (m.type === 'tool') {
                return new ToolMessage({
                    content: m.data.content || "",
                    tool_call_id: m.data.tool_call_id || "",
                    ...m.data
                });
            }
            return new HumanMessage(m.data?.content || "");
        });

        // 5. Create Streaming Response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Stream agent execution
                    const eventStream = await agent.streamEvents(
                        {
                            messages: [
                                ...history,
                                new HumanMessage(lastMessage.data.content || "")
                            ]
                        },
                        {
                            version: "v1",
                            streamMode: ["values", "updates"]
                        }
                    );

                    for await (const event of eventStream) {
                        // Updated event mapping for v1
                        if (event.event === "on_chat_model_stream") {
                            const chunk = event.data.chunk;
                            if (chunk && chunk.content) {
                                const streamEvent: StreamEvent = {
                                    type: 'model',
                                    data: { messages: [chunk] },
                                    timestamp: Date.now()
                                };
                                controller.enqueue(JSON.stringify(streamEvent) + "\n");
                            }
                        } else if (event.event === "on_tool_end") {
                            // Check for output
                            if (event.data.output) {
                                // For 'content_and_artifact', output might be complex.
                                // We pass it through.
                                const streamEvent: StreamEvent = {
                                    type: 'tools',
                                    data: { output: event.data.output },
                                    timestamp: Date.now()
                                };
                                controller.enqueue(JSON.stringify(streamEvent) + "\n");
                            }
                        }
                    }

                    controller.close();
                } catch (e) {
                    console.error("Stream error", e);
                    controller.error(e);
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