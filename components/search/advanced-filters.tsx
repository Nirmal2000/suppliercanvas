'use client';

import { useState, useEffect } from 'react';
import { FilterDefinition, FilterValue, PlatformType } from '@/lib/platforms/types';
import { getSupportedFilters } from '@/lib/search/filter-service';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AdvancedFiltersProps {
    activePlatforms: Set<PlatformType>;
    activeFilters: FilterValue[];
    onFilterChange: (filters: FilterValue[]) => void;
}

export function AdvancedFilters({ activePlatforms, activeFilters, onFilterChange }: AdvancedFiltersProps) {
    const [availableFilters, setAvailableFilters] = useState<FilterDefinition[]>([]);

    useEffect(() => {
        const allFilters = getSupportedFilters();
        const relevantFilters = allFilters.filter(f => activePlatforms.has(f.platform));
        setAvailableFilters(relevantFilters);
    }, [activePlatforms]);

    const handleFilterUpdate = (filterId: string, value: any) => {
        const newFilters = activeFilters.filter(f => f.filterId !== filterId);

        // Only add if value is "active" (true for boolean, non-zero/non-default for others)
        let isActive = false;
        if (typeof value === 'boolean') isActive = value;
        if (typeof value === 'number') isActive = value > 0;
        if (typeof value === 'object' && 'min' in value) isActive = true; // Range always active if set? Or check bounds?

        if (isActive) {
            newFilters.push({ filterId, value });
        }

        onFilterChange(newFilters);
    };

    const getFilterValue = (filterId: string) => {
        return activeFilters.find(f => f.filterId === filterId)?.value;
    };

    const clearFilters = () => {
        onFilterChange([]);
    };

    if (availableFilters.length === 0) return null;

    return (
        <div className="space-y-6 p-4 border rounded-lg bg-card mb-6 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Advanced Filters</h3>
                {activeFilters.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                        <X className="mr-1 h-3 w-3" />
                        Clear Filters
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableFilters.map((filter) => (
                    <div key={filter.id} className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                            {filter.label}
                            <span className="ml-1 text-[10px] opacity-70">({filter.platform})</span>
                        </Label>

                        {filter.type === 'boolean' && (
                            <div className="flex items-center space-x-2 h-10">
                                <Switch
                                    id={filter.id}
                                    checked={!!getFilterValue(filter.id)}
                                    onCheckedChange={(checked: boolean) => handleFilterUpdate(filter.id, checked)}
                                />
                                <Label htmlFor={filter.id} className="cursor-pointer">
                                    {getFilterValue(filter.id) ? 'Yes' : 'No'}
                                </Label>
                            </div>
                        )}

                        {filter.type === 'select' && filter.options && (
                            <Select
                                value={String(getFilterValue(filter.id) || 0)}
                                onValueChange={(val: string) => handleFilterUpdate(filter.id, Number(val))}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {filter.options.map((opt) => (
                                        <SelectItem key={String(opt.value)} value={String(opt.value)}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {filter.type === 'range' && (
                            <div className="pt-2 px-1">
                                <Slider
                                    defaultValue={[filter.min || 0, filter.max || 100]}
                                    max={filter.max}
                                    min={filter.min}
                                    step={1}
                                    value={
                                        (getFilterValue(filter.id) as { min: number; max: number })
                                            ? [(getFilterValue(filter.id) as { min: number; max: number }).min, (getFilterValue(filter.id) as { min: number; max: number }).max]
                                            : [filter.min || 0, filter.max || 100]
                                    }
                                    onValueChange={(vals: number[]) => handleFilterUpdate(filter.id, { min: vals[0], max: vals[1] })}
                                    className="my-4"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>
                                        {(getFilterValue(filter.id) as { min: number })?.min ?? filter.min} {filter.unit}
                                    </span>
                                    <span>
                                        {(getFilterValue(filter.id) as { max: number })?.max ?? filter.max} {filter.unit}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
