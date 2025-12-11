
import fs from 'fs';
import path from 'path';
import { mapAlibabaToUnified } from '../lib/platforms/alibaba/mapper';
import { mapMICToUnified } from '../lib/platforms/madeinchina/mapper';
import { parseMICHTML } from '../lib/platforms/madeinchina/parser';

const alibabaFile = path.resolve(__dirname, '../docs/sample_alibaba.json');
const micFile = path.resolve(__dirname, '../docs/micprodsearch.html');

async function verify() {
    console.log('--- Verifying Alibaba Grouping ---');
    if (fs.existsSync(alibabaFile)) {
        const data = fs.readFileSync(alibabaFile, 'utf-8');
        const json = JSON.parse(data);
        const unifiedSuppliers = mapAlibabaToUnified(json);

        if (unifiedSuppliers.length > 0) {
            console.log(`Found ${unifiedSuppliers.length} Alibaba suppliers.`);
            const firstSupplier = unifiedSuppliers[0];
            console.log(`Supplier: ${firstSupplier.name}`);
            console.log(`Product Count: ${firstSupplier.products.length}`);
            if (firstSupplier.products.length > 0) {
                console.log('Sample Product:', JSON.stringify(firstSupplier.products[0], null, 2));
            } else {
                console.warn('WARNING: No products found for Alibaba supplier.');
            }
        } else {
            console.log('No Alibaba suppliers found in sample data.');
        }
    } else {
        console.log(`Alibaba sample file not found: ${alibabaFile}`);
    }

    console.log('\n--- Verifying Made-in-China Grouping ---');
    if (fs.existsSync(micFile)) {
        const html = fs.readFileSync(micFile, 'utf-8');
        const parsed = parseMICHTML(html, 'test', 1);
        const unifiedSuppliers = mapMICToUnified(parsed);

        if (unifiedSuppliers.length > 0) {
            console.log(`Found ${unifiedSuppliers.length} MIC suppliers.`);
            const firstSupplier = unifiedSuppliers[0];
            console.log(`Supplier: ${firstSupplier.name}`);
            console.log(`Product Count: ${firstSupplier.products.length}`);
            if (firstSupplier.products.length > 0) {
                console.log('Sample Product:', JSON.stringify(firstSupplier.products[0], null, 2));
            } else {
                console.warn('WARNING: No products found for MIC supplier.');
            }
        } else {
            console.log('No MIC suppliers found in sample data.');
        }
    } else {
        console.log(`MIC sample file not found: ${micFile}`);
    }
}

verify().catch(console.error);
