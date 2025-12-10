'use client';

import { PlatformType } from '@/lib/platforms/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface PlatformFilterProps {
    selectedPlatforms: Set<PlatformType>;
    onChange: (platforms: Set<PlatformType>) => void;
}

export function PlatformFilter({ selectedPlatforms, onChange }: PlatformFilterProps) {
    const handleToggle = (platform: PlatformType) => {
        const newSelected = new Set(selectedPlatforms);
        if (newSelected.has(platform)) {
            newSelected.delete(platform);
        } else {
            newSelected.add(platform);
        }
        onChange(newSelected);
    };

    return (
        <div className="flex flex-wrap items-center gap-6 p-4 border rounded-lg bg-card mb-6 shadow-sm">
            <span className="text-sm font-medium text-muted-foreground mr-2">
                Source Platforms:
            </span>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="filter-alibaba"
                    checked={selectedPlatforms.has('alibaba')}
                    onCheckedChange={() => handleToggle('alibaba')}
                />
                <Label htmlFor="filter-alibaba" className="cursor-pointer font-medium">Alibaba</Label>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="filter-mic"
                    checked={selectedPlatforms.has('madeinchina')}
                    onCheckedChange={() => handleToggle('madeinchina')}
                />
                <Label htmlFor="filter-mic" className="cursor-pointer font-medium">Made-in-China</Label>
            </div>
        </div>
    );
}
