import { PlatformType, AggregatedSearchResult, SearchInput, UnifiedSupplier } from '@/lib/platforms/types';

/**
 * Search across multiple platforms using the Unified Search API
 */
export async function searchUnified(
  inputs: SearchInput[],
  platforms: PlatformType[] = ['alibaba', 'madeinchina']
): Promise<AggregatedSearchResult> {
  try {
    const formData = new FormData();

    // Process text inputs
    const textInputs = inputs.filter(i => i.type === 'text');
    if (textInputs.length > 0) {
      formData.append('queries', JSON.stringify(textInputs.map(i => ({ id: i.id, value: i.value }))));
    }

    // Process image inputs
    const imageInputs = inputs.filter(i => i.type === 'image' && i.file);
    imageInputs.forEach(input => {
      if (input.file) {
        formData.append(`file_${input.id}`, input.file);
      }
    });

    // Platforms
    formData.append('platforms', JSON.stringify(platforms));

    const response = await fetch('/api/search/unified', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Unified search failed: ${response.status}`);
    }

    const data: AggregatedSearchResult = await response.json();

    // Client-side fixup if needed (e.g. restoring Dates)
    return data;

  } catch (error) {
    console.error('Unified search error:', error);
    return {
      inputs,
      results: [],
      timestamp: Date.now()
    };
  }
}

/**
 * Legacy support / Single text search wrapper
 */
export async function searchAllPlatforms(
  query: string,
  platforms: PlatformType[] = ['alibaba', 'madeinchina']
): Promise<AggregatedSearchResult> {
  const input: SearchInput = {
    id: 'legacy-query',
    type: 'text',
    value: query
  };
  return searchUnified([input], platforms);
}
