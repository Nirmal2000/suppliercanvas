'use client';

import { SearchInput } from '@/lib/platforms/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon, Link } from 'lucide-react';

interface InputFilterProps {
  inputs: SearchInput[];
  selectedInputId: string | null;
  onSelect: (id: string | null) => void;
}

export function InputFilter({ inputs, selectedInputId, onSelect }: InputFilterProps) {
  if (inputs.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-1">
      <span className="text-sm text-muted-foreground mr-2 font-medium">Filter results by:</span>

      <Badge
        variant={selectedInputId === null ? "default" : "outline"}
        className="cursor-pointer hover:bg-primary/90 transition-colors py-1.5"
        onClick={() => onSelect(null)}
      >
        All Inputs
      </Badge>

      {inputs.map((input) => (
        <Badge
          key={input.id}
          variant={selectedInputId === input.id ? "default" : "outline"}
          className="cursor-pointer flex items-center gap-1 hover:bg-primary/90 transition-colors py-1.5"
          onClick={() => onSelect(input.id === selectedInputId ? null : input.id)}
        >
          {input.type === 'text' ? <Link className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
          <span className="max-w-[150px] truncate">{input.value}</span>
        </Badge>
      ))}

      {selectedInputId && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground ml-auto"
          onClick={() => onSelect(null)}
        >
          <X className="h-3 w-3 mr-1" /> Clear Filter
        </Button>
      )}
    </div>
  );
}
