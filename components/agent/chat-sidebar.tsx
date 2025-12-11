"use client";

import * as React from "react";
import { useSearchStore } from "@/lib/agent/state";
import {
    ChatContainerRoot,
    ChatContainerContent,
    ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import { Message, MessageContent } from "@/components/ui/message";
import { PromptInput, PromptInputTextarea, PromptInputActions } from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Loader2 } from "lucide-react";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { Tool } from "@/components/ui/tool";

export function ChatSidebar() {
    const {
        messages,
        searchQuery,
        setSearchQuery,
        isAgentResponding,
        setIsAgentResponding,
        addMessage,
    } = useSearchStore();

    const handleSubmit = async () => {
        if (!searchQuery.trim() || isAgentResponding) return;

        const userMessage = new HumanMessage({
            content: searchQuery,
            id: Date.now().toString(),
        });

        addMessage(userMessage);
        setSearchQuery("");
        setIsAgentResponding(true);

        try {
            const response = await fetch("/api/agent/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Send simplified JSON structure as expected by our API
                // We strip internal LC metadata to keep it clean
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => m.toJSON()),
                }),
            });

            if (!response.ok) {
                throw new Error(`API Request failed: ${response.statusText}`);
            }

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                // Keep the last partial line in buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const event = JSON.parse(line);

                        if (event.type === "model") {
                            const msgs = event.data.messages || [];
                            msgs.forEach((msgData: any) => {
                                // Check if we need to append to the last message or add new
                                // For simplicity in this MVP, we assume chunks are small strings associated with the last AIMessage 
                                // OR we rely on the fact that LangChain 'chunk' events usually come in sequence.
                                // Ideally we'd use `updateLastMessage` if it's content streaming.
                                // But here we are just adding simplified chunks.
                                // Let's assume the API sends valid serialized messages.

                                // If the last message is already an AI message, we might want to append content?
                                // The 'chunk' IS a message object (AIMessageChunk).
                                // We can just add it if our UI handles many small messages, or we merge.
                                // Merging is better for UI.

                                // NOTE: quickstart example adds new message for each chunk. That might cause flicker.
                                // Better pattern:
                                useSearchStore.setState(state => {
                                    const lastMsg = state.messages[state.messages.length - 1];
                                    const isLastMsgAI = lastMsg && lastMsg._getType() === 'ai';

                                    if (isLastMsgAI && msgData.content) {
                                        // Merge content
                                        const newContent = (lastMsg.content as string) + msgData.content;
                                        const newMsg = new AIMessage({ ...lastMsg, content: newContent });
                                        // Replace last message
                                        const newMessages = [...state.messages];
                                        newMessages[newMessages.length - 1] = newMsg;
                                        return { messages: newMessages };
                                    } else {
                                        // New message
                                        return { messages: [...state.messages, new AIMessage(msgData)] };
                                    }
                                });
                            });
                        } else if (event.type === "tools") {
                            // Tool artifact received
                            const output = event.data.output;
                            if (Array.isArray(output) && output.length === 2) {
                                // [summary, artifact] pattern we implemented
                                const artifact = output[1];
                                if (artifact && artifact.results) {
                                    useSearchStore.getState().setSearchResults(artifact.results);
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing stream line", e);
                    }
                }
            }

        } catch (error) {
            console.error("Chat error:", error);
            addMessage(new AIMessage("Sorry, I encountered an error while searching."));
        } finally {
            setIsAgentResponding(false);
        }
    };

    return (
        <div className="flex h-full w-[400px] flex-col border-r bg-muted/10">
            <div className="p-4 border-b font-semibold flex items-center gap-2">
                <span>AI Agent</span>
            </div>

            <ChatContainerRoot className="flex-1">
                <ChatContainerContent className="p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground mt-10 text-sm">
                            <p>Ask anything to find suppliers...</p>
                        </div>
                    )}
                    {messages.map((m, i) => {
                        const type = m._getType();
                        const isUser = type === 'human';
                        const isTool = type === 'tool';

                        if (isTool) {
                            let output = {};
                            try {
                                output = JSON.parse(m.content as string);
                            } catch (e) {
                                output = { result: m.content };
                            }

                            return (
                                <Tool
                                    key={i}
                                    toolPart={{
                                        type: m.name || 'tool',
                                        state: 'output-available',
                                        input: {},
                                        output: output,
                                        toolCallId: (m as any).tool_call_id,
                                    }}
                                    className="max-w-[90%]"
                                />
                            );
                        }

                        return (
                            <Message key={i} className={isUser ? 'ml-auto max-w-[85%]' : 'max-w-[90%]'}>
                                <MessageContent className={isUser ? 'bg-primary text-primary-foreground' : 'bg-background border'}>
                                    {(m.content || "") as string}
                                </MessageContent>
                            </Message>
                        );
                    })}
                </ChatContainerContent>
                {isAgentResponding && (
                    <div className="flex items-center gap-2 px-4 py-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                    </div>
                )}
                <ChatContainerScrollAnchor />
            </ChatContainerRoot>

            <div className="p-4 border-t bg-background">
                <div className="relative">
                    <PromptInput
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        isLoading={isAgentResponding}
                        onSubmit={handleSubmit}
                        className="border-input bg-background"
                    >
                        <PromptInputTextarea
                            placeholder="Describe what you need..."
                            disabled={isAgentResponding}
                            className="min-h-[50px]"
                        />
                        <PromptInputActions className="absolute right-2 bottom-2">
                            <Button
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleSubmit}
                                disabled={!searchQuery.trim() || isAgentResponding}
                            >
                                {isAgentResponding ? <Loader2 className="animate-spin h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                            </Button>
                        </PromptInputActions>
                    </PromptInput>
                </div>
            </div>
        </div>
    );
}
