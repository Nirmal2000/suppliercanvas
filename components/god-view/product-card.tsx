import { Product } from '@/lib/scrapers/mic-types';

interface ProductCardProps {
    product: Product;
    isSelected: boolean;
    onToggleSelection: (url: string) => void;
    onClick: (product: Product) => void;
}

export function ProductCard({ product, isSelected, onToggleSelection, onClick }: ProductCardProps) {
    return (
        <div
            className={`group relative bg-card text-card-foreground rounded-lg shadow-sm border hover:shadow-md transition-all overflow-hidden flex flex-col h-full text-sm cursor-pointer ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'}`}
            onClick={() => onClick(product)}
        >
            {/* Checkbox overlay */}
            <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    onToggleSelection(product.url);
                }}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => { }} // Handle via onClick div
                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
            </div>

            <div className="aspect-square relative flex-shrink-0 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400?text=No+Image';
                    }}
                />
            </div>
            <div className="p-3 flex flex-col flex-grow">
                <div className="text-xs text-muted-foreground mb-1 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                        <span className="uppercase font-semibold flex-shrink-0">{product.source}</span>
                        <span className="px-1 text-muted-foreground/40">|</span>
                        <span className="font-medium truncate" title={product.metadata.supplierUrl}>
                            {product.metadata.supplierUrl.replace(/^https?:\/\//, '').split('.')[0]}
                        </span>
                    </div>
                    <span className="truncate max-w-[40%] text-right font-mono text-[10px] bg-muted px-1 rounded" title={product.metadata.searchKeyword}>
                        {product.metadata.searchKeyword}
                    </span>
                </div>

                <div
                    className="font-medium text-card-foreground line-clamp-2 hover:text-primary mb-2 leading-tight"
                    title={product.title}
                >
                    {product.title}
                </div>

                <div className="mt-auto space-y-1">
                    {product.price && (
                        <div className="text-red-600 dark:text-red-400 font-bold">{product.price}</div>
                    )}
                    {product.moq && (
                        <div className="text-muted-foreground text-xs">Min: {product.moq}</div>
                    )}
                    {product.modelNo && (
                        <div className="text-xs text-primary font-mono mt-1">Model: {product.modelNo}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
