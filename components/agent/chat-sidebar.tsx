"use client";


import * as React from "react";
import { useSearchStore } from "@/lib/agent/state";
import {
    ChatContainerRoot,
    ChatContainerContent,
    ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import { Message, MessageContent } from "@/components/ui/message";
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { ArrowUp, Loader2, Paperclip, X } from "lucide-react";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { Tool } from "@/components/ui/tool";
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload";
import { Image as UIImage } from "@/components/ui/image";

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export function ChatSidebar() {
    const {
        messages,
        searchQuery,
        setSearchQuery,
        isAgentResponding,
        setIsAgentResponding,
        addMessage,
    } = useSearchStore();

    const [files, setFiles] = React.useState<File[]>([]);

    const handleFilesAdded = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if ((!searchQuery.trim() && files.length === 0) || isAgentResponding) return;

        let userMessage: HumanMessage;
        const images: string[] = [];

        try {
            // Process files
            if (files.length > 0) {
                for (const file of files) {
                    const base64 = await fileToBase64(file);
                    images.push(base64);
                }

                // Create Multimodal Message
                userMessage = new HumanMessage({
                    content: [
                        { type: "text", text: searchQuery },
                        ...images.map(img => ({
                            type: "image_url",
                            image_url: { url: img }
                        }))
                    ],
                    id: Date.now().toString(),
                });
            } else {
                // Text only
                userMessage = new HumanMessage({
                    content: searchQuery,
                    id: Date.now().toString(),
                });
            }

            addMessage(userMessage);
            setSearchQuery("");
            setFiles([]);
            setIsAgentResponding(true);

            // Prepare Payload
            // We manually construct the payload to ensure images are passed correctly
            // The API expects 'messages' array where the last message has the data
            const payloadMessages = [...messages, userMessage].map(m => m.toJSON());

            // If we have images, ensure they are attached to the last message's data payload
            // This caters to our API's logic that looks for data.images or data.content array
            if (images.length > 0) {
                const lastMsg = payloadMessages[payloadMessages.length - 1] as any;
                if (!lastMsg.data) lastMsg.data = {};
                lastMsg.data.images = images;
            }

            const response = await fetch("/api/agent/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: payloadMessages,
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
                                useSearchStore.setState(state => {
                                    const lastMsg = state.messages[state.messages.length - 1];
                                    const isLastMsgAI = lastMsg && lastMsg.type === 'ai';

                                    // Extract simple string content
                                    const chunkContent = typeof msgData === 'string' ? msgData : (msgData.content || "");

                                    if (!chunkContent) return state;

                                    if (isLastMsgAI) {
                                        // Merge content
                                        const newContent = (lastMsg.content as string) + chunkContent;
                                        // Create new instance with merged content
                                        const newMsg = new AIMessage(newContent);

                                        const newMessages = [...state.messages];
                                        newMessages[newMessages.length - 1] = newMsg;
                                        return { messages: newMessages };
                                    } else {
                                        // New message
                                        return { messages: [...state.messages, new AIMessage(chunkContent)] };
                                    }
                                });
                            });
                        } else if (event.type === "tools") {
                            // Tool artifact received
                            console.log("Client Tool Event:", event);
                            let output = event.data.output;
                            console.log("Client Tool Output (Raw):", JSON.stringify(output, null, 2));

                            let artifact = null;

                            // Handle raw array: [summary, artifact]
                            if (Array.isArray(output) && output.length === 2) {
                                artifact = output[1];
                            }
                            // Handle LangChain serialized object: { lc: 1, kwargs: { artifact: ... } }
                            else if (output && typeof output === 'object' && output.kwargs && output.kwargs.artifact) {
                                artifact = output.kwargs.artifact;
                            }
                            // Handle direct object with artifact property (fallback)
                            else if (output && typeof output === 'object' && output.artifact) {
                                artifact = output.artifact;
                            }

                            if (artifact) {
                                console.log("Client Tool Artifact Found:", artifact);
                                if (artifact.results) {
                                    console.log("Setting Search Results:", artifact.results.length);

                                    // PREFERRED: Use inputs from artifact (contains correct IDs and Images)
                                    if (artifact.inputs && Array.isArray(artifact.inputs)) {
                                        console.log("Setting Search Inputs from Agent Artifact:", artifact.inputs);
                                        useSearchStore.getState().setSearchInputs(artifact.inputs);
                                    }
                                    // FALLBACK: Extract from queries if inputs are missing
                                    else if (artifact.queries && Array.isArray(artifact.queries)) {
                                        const newInputs = artifact.queries.map((q: string) => ({
                                            id: crypto.randomUUID(),
                                            type: 'text',
                                            value: q
                                        }));
                                        console.log("Setting Search Inputs from Agent Queries (Fallback):", newInputs);
                                        useSearchStore.getState().setSearchInputs(newInputs);
                                    }

                                    useSearchStore.getState().setSearchResults(artifact.results);
                                }
                            } else {
                                console.log("No artifact found in tool output");
                            }

                            // FIX: Add ToolMessage to the UI state so it renders!
                            // We use the artifact as the display content, but truncate the huge results array and inputs
                            let displayContent = output;

                            if (artifact) {
                                const displayArtifact = { ...artifact };

                                // Truncate results
                                if (Array.isArray(displayArtifact.results)) {
                                    displayArtifact.results = `<${displayArtifact.results.length} results (hidden)>`;
                                }

                                // Truncate inputs (contains base64 images)
                                if (Array.isArray(displayArtifact.inputs)) {
                                    displayArtifact.inputs = `<${displayArtifact.inputs.length} inputs (hidden)>`;
                                }

                                // Use the clean artifact as the message content
                                displayContent = displayArtifact;
                            }

                            const toolMsg = new ToolMessage({
                                content: JSON.stringify(displayContent),
                                tool_call_id: event.data.tool_call_id || "unknown",
                                name: event.data.name || "tool",
                                status: "success"
                            });
                            addMessage(toolMsg);
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
                        const type = m.type;
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

                        // Render Message Content (Text or Multimodal)
                        let contentToRender: React.ReactNode = "";
                        if (typeof m.content === 'string') {
                            contentToRender = m.content;
                        } else if (Array.isArray(m.content)) {
                            contentToRender = (
                                <div className="flex flex-col gap-2">
                                    {m.content.map((block: any, idx: number) => {
                                        if (block.type === 'text') return <span key={idx}>{block.text}</span>;
                                        if (block.type === 'image_url') {
                                            // Handle base64 or url
                                            const url = block.image_url.url;
                                            const isBase64 = url.startsWith('data:');
                                            const base64 = isBase64 ? url.split(',')[1] : undefined;
                                            // Extract media type if possible, default to png
                                            const mediaType = isBase64 ? url.split(';')[0].split(':')[1] : "image/png";

                                            if (base64) {
                                                return <UIImage key={idx} base64={base64} mediaType={mediaType} alt="Uploaded" className="max-w-full rounded-md" />;
                                            } else {
                                                // Fallback for non-base64 (remote URLs)
                                                return <img key={idx} src={url} alt="Uploaded" className="max-w-full rounded-md" />;
                                            }
                                        }
                                        return null;
                                    })}
                                </div>
                            );
                        }

                        return (
                            <Message key={i} className={isUser ? 'ml-auto max-w-[85%]' : 'max-w-[90%]'}>
                                <MessageContent className={isUser ? 'bg-primary text-primary-foreground' : 'bg-background border'}>
                                    {contentToRender as any}
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
                <FileUpload onFilesAdded={handleFilesAdded} accept="image/*" multiple={true}>
                    <div className="relative flex flex-col gap-2">
                        {/* Selected Files Preview */}
                        {files.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {files.map((file, i) => (
                                    <div key={i} className="relative group shrink-0">
                                        <div className="h-16 w-16 bg-muted rounded-md overflow-hidden border">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt="preview"
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFile(i)}
                                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <PromptInput
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            isLoading={isAgentResponding}
                            onSubmit={handleSubmit}
                            className="border-input bg-background"
                        >
                            <PromptInputTextarea
                                placeholder="Describe product or upload image..."
                                disabled={isAgentResponding}
                                className="min-h-[50px] pr-12"
                            />
                            <PromptInputActions className="absolute right-2 bottom-2">
                                <PromptInputAction tooltip="Upload Image">
                                    <FileUploadTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                    </FileUploadTrigger>
                                </PromptInputAction>
                                <Button
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleSubmit}
                                    disabled={(!searchQuery.trim() && files.length === 0) || isAgentResponding}
                                >
                                    {isAgentResponding ? <Loader2 className="animate-spin h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                                </Button>
                            </PromptInputActions>
                        </PromptInput>
                    </div>
                </FileUpload>
            </div>
        </div>
    );
}

