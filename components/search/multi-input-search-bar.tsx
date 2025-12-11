'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { SearchInput } from '@/lib/platforms/types';
import { v4 as uuidv4 } from 'uuid';

interface MultiInputSearchBarProps {
    onSearch: (inputs: SearchInput[]) => void;
    loading?: boolean;
}

export function MultiInputSearchBar({ onSearch, loading = false }: MultiInputSearchBarProps) {
    const [textInput, setTextInput] = useState('');
    const [inputs, setInputs] = useState<SearchInput[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addTextInput = () => {
        if (!textInput.trim()) return;

        const newInput: SearchInput = {
            id: uuidv4(),
            type: 'text',
            value: textInput.trim()
        };

        setInputs([...inputs, newInput]);
        setTextInput('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                // Shift+Enter to search
                handleSearchClick();
            } else {
                // Enter to add keyword
                addTextInput();
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newInputs: SearchInput[] = Array.from(files).map(file => ({
                id: uuidv4(),
                type: 'image',
                value: file.name,
                file: file
            }));

            setInputs([...inputs, ...newInputs]);
            // Reset input so same file can be selected again if removed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeInput = (id: string) => {
        setInputs(inputs.filter(i => i.id !== id));
    };

    const handleSearchClick = () => {
        // If there is text in the input but not added yet, add it first?
        // Or just ignore. Usually convenient to search what is active.
        // Let's add it if it exists.
        let finalInputs = [...inputs];
        if (textInput.trim()) {
            const tempInput: SearchInput = {
                id: uuidv4(),
                type: 'text',
                value: textInput.trim()
            };
            finalInputs.push(tempInput);
            setInputs(finalInputs);
            setTextInput('');
        }

        if (finalInputs.length > 0) {
            onSearch(finalInputs);
        }
    };

    return (
        <div className="w-full max-w-3xl space-y-4">
            {/* Input Area */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        type="text"
                        placeholder="Type a keyword and press Enter, or add images..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading}
                        className="pr-10"
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                        onClick={addTextInput}
                        disabled={!textInput.trim() || loading}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    multiple
                />

                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    title="Upload Image"
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>

                <Button
                    onClick={handleSearchClick}
                    disabled={loading || (inputs.length === 0 && !textInput.trim())}
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Search
                </Button>
            </div>

            {/* Chips Area */}
            {inputs.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                    {inputs.map((input) => (
                        <Badge key={input.id} variant="secondary" className="pl-2 pr-1 py-1 text-sm bg-background border-input border shadow-sm">
                            {input.type === 'image' && <ImageIcon className="h-3 w-3 mr-2 text-blue-500" />}
                            {input.type === 'text' && <span className="mr-2 text-muted-foreground">#</span>}
                            <span className="max-w-[150px] truncate">{input.value}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                onClick={() => removeInput(input.id)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
