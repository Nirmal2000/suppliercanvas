import fs from 'fs';
import path from 'path';
import { mapAlibabaToUnifiedProduct } from '../lib/platforms/alibaba/product-mapper';

const testFile = path.resolve(__dirname, '../docs/test.json');

try {
    const data = fs.readFileSync(testFile, 'utf-8');
    const json = JSON.parse(data);
    const offers = json.offers;

    if (offers && Array.isArray(offers)) {
        console.log(`Found ${offers.length} offers.`);
        const firstOffer = offers[0];
        const mapped = mapAlibabaToUnifiedProduct(firstOffer);
        console.log('Mapped Product:', JSON.stringify(mapped, null, 2));
    } else {
        console.log('No offers found in test.json');
    }
} catch (err) {
    console.error('Error:', err);
}
