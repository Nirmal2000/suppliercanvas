'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  defaultQuery?: string;
}

export function SearchBar({ onSearch, loading = false, defaultQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(defaultQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-2xl">
      <Input
        type="text"
        placeholder="Search for products (e.g., vacuum cleaner, sofa, headphones)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        className="flex-1"
        aria-label="Product search"
      />
      <Button type="submit" disabled={loading || !query.trim()}>
        <Search className="mr-2 h-4 w-4" />
        {loading ? 'Searching...' : 'Search'}
      </Button>
    </form>
  );
}
