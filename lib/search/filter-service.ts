import { UnifiedProduct, FilterValue, FilterDefinition } from '@/lib/platforms/types';

export function applyFilters(products: UnifiedProduct[], filters: FilterValue[]): UnifiedProduct[] {
    if (!filters.length) return products;

    return products.filter((product) => {
        return filters.every((filter) => {
            // Platform check is handled at a higher level or implicitly by filter definitions
            // Here we check if the product matches the specific filter criteria
            return checkFilterMatch(product, filter);
        });
    });
}

function checkFilterMatch(product: UnifiedProduct, filter: FilterValue): boolean {
    const { filterId, value } = filter;

    // Alibaba Filters
    if (product.platform === 'alibaba') {
        const data = product.platformSpecific as any;

        switch (filterId) {
            case 'alibaba-verified':
                return !!data.verifiedSupplier === (value === true);
            case 'alibaba-gold-years':
                if (typeof value === 'object' && 'min' in value) {
                    const years = parseInt(data.goldYearsNumber || '0', 10);
                    return years >= value.min && years <= value.max;
                }
                return false;
            case 'alibaba-moq':
                if (typeof value === 'object' && 'min' in value) {
                    // Parse MOQ string like "10 Pieces" -> 10
                    const moqStr = product.moq || '0';
                    const moq = parseInt(moqStr.replace(/[^0-9]/g, ''), 10) || 0;
                    return moq >= value.min && moq <= value.max;
                }
                return false;
        }
    }

    // Made-in-China Filters
    if (product.platform === 'madeinchina') {
        const data = product.platformSpecific as any;

        switch (filterId) {
            case 'mic-audited':
                return !!data.isAuditedSupplier === (value === true);
            case 'mic-stars':
                if (typeof value === 'number') {
                    return (data.capabilityStars || 0) >= value;
                }
                return false;
        }
    }

    return true;
}

export function getSupportedFilters(): FilterDefinition[] {
    return [
        // Alibaba Filters
        {
            id: 'alibaba-verified',
            label: 'Verified Supplier',
            type: 'boolean',
            platform: 'alibaba'
        },
        {
            id: 'alibaba-gold-years',
            label: 'Gold Supplier Years',
            type: 'range',
            platform: 'alibaba',
            min: 0,
            max: 20,
            unit: 'years'
        },
        {
            id: 'alibaba-moq',
            label: 'MOQ Range',
            type: 'range',
            platform: 'alibaba',
            min: 1,
            max: 10000,
            unit: 'units'
        },

        // Made-in-China Filters
        {
            id: 'mic-audited',
            label: 'Audited Supplier',
            type: 'boolean',
            platform: 'madeinchina'
        },
        {
            id: 'mic-stars',
            label: 'Capability Stars (Min)',
            type: 'select',
            platform: 'madeinchina',
            options: [
                { label: 'Any', value: 0 },
                { label: '1+ Star', value: 1 },
                { label: '2+ Stars', value: 2 },
                { label: '3+ Stars', value: 3 },
                { label: '4+ Stars', value: 4 },
                { label: '5 Stars', value: 5 },
            ]
        }
    ];
}
