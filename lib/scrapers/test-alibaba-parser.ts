/**
 * Test script for Alibaba parser functions
 * Run with: npx tsx lib/scrapers/test-alibaba-parser.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseProductGroups, parseProductList, parseProductDetail, getLeafGroups } from './alibaba-parser';

const docsDir = path.join(process.cwd(), 'docs');

console.log('=== Testing Alibaba Parser ===\n');

// Test parseProductGroups
console.log('1. Testing parseProductGroups with ab-prodlist.html...');
try {
    const prodlistHtml = fs.readFileSync(path.join(docsDir, 'ab-prodlist.html'), 'utf-8');
    const groups = parseProductGroups(prodlistHtml);

    console.log(`   Found ${groups.length} product groups`);
    groups.slice(0, 5).forEach(g => {
        console.log(`   - ${g.name} (${g.isLeaf ? 'leaf' : 'parent'}) ${g.children ? `[${g.children.length} children]` : ''}`);
    });

    const leaves = getLeafGroups(groups);
    console.log(`   Total leaf groups: ${leaves.length}\n`);
} catch (e) {
    console.error('   Error:', e instanceof Error ? e.message : e);
}

// Test parseProductList
console.log('2. Testing parseProductList with ab-prodgrp.html...');
try {
    const prodgrpHtml = fs.readFileSync(path.join(docsDir, 'ab-prodgrp.html'), 'utf-8');
    const products = parseProductList(prodgrpHtml);

    console.log(`   Found ${products.length} products`);
    products.slice(0, 3).forEach(p => {
        console.log(`   - [${p.id}] ${p.title.slice(0, 50)}...`);
        console.log(`     Price: ${p.price || 'N/A'}, MOQ: ${p.moq || 'N/A'}`);
    });
    console.log();
} catch (e) {
    console.error('   Error:', e instanceof Error ? e.message : e);
}

// Test parseProductDetail
console.log('3. Testing parseProductDetail with ab-prod.html...');
try {
    const prodHtml = fs.readFileSync(path.join(docsDir, 'ab-prod.html'), 'utf-8');
    const testUrl = 'https://www.alibaba.com/product-detail/Luxury-Living-Room-Furniture-3-Seater_1600930741831.html';
    const detail = parseProductDetail(prodHtml, testUrl);

    console.log(`   Title: ${detail.title.slice(0, 60)}...`);
    console.log(`   ID: ${detail.id}`);
    console.log(`   Supplier: ${detail.supplierName || 'N/A'} (${detail.supplierLocation || 'N/A'})`);
    console.log(`   Pricing tiers: ${detail.pricing.length}`);
    detail.pricing.forEach(p => console.log(`     - ${p.quantity}: ${p.price}`));
    console.log(`   Attributes: ${Object.keys(detail.attributes).length}`);
    Object.entries(detail.attributes).slice(0, 5).forEach(([k, v]) =>
        console.log(`     - ${k}: ${v}`)
    );
    console.log(`   Media URLs: ${detail.mediaUrls.length}`);
    console.log(`   Lead time entries: ${detail.leadTime?.length || 0}`);
    console.log(`   Variations: ${detail.variations?.length || 0}`);
    console.log(`   Certifications: ${detail.certifications?.length || 0}`);
    console.log(`   Customization options: ${detail.customization?.length || 0}`);
} catch (e) {
    console.error('   Error:', e instanceof Error ? e.message : e);
}

console.log('\n=== Test Complete ===');
