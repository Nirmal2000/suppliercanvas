
import fs from 'fs';
import path from 'path';
import { load } from 'cheerio';
import { parseMICHTML } from '../lib/platforms/madeinchina/parser';

const micFile = path.resolve(__dirname, '../docs/micprodsearch.html');

async function debug() {
    console.log('--- Debugging MIC Parser ---');
    if (fs.existsSync(micFile)) {
        const html = fs.readFileSync(micFile, 'utf-8');
        console.log(`File size: ${html.length} bytes`);

        // Quick Cheerio check
        const $ = load(html);
        const listNodes = $('.list-node');
        console.log(`Found ${listNodes.length} .list-node elements via direct Cheerio check`);

        if (listNodes.length > 0) {
            // Check the 3rd node (index 2) to skip potential top ads
            const targetNode = listNodes.length > 2 ? listNodes.eq(2) : listNodes.first();
            console.log('--- Sample Node HTML (Start) ---');
            console.log(targetNode.html()?.substring(0, 500));
            console.log('--- Sample Node HTML (End) ---');

            const nameLink = targetNode.find('h2.company-name a');
            console.log('Company Name Link text (h2.company-name a):', nameLink.text());

            // Try fallback/alternate selectors just in case
            console.log('Alternative selector (.company-name a):', targetNode.find('.company-name a').text());
        }

        // Run actual parser
        const parsed = parseMICHTML(html, 'test', 1);
        console.log(`Parsed ${parsed.companies.length} companies from parser function.`);

    } else {
        console.log(`MIC sample file not found: ${micFile}`);
    }
}

debug().catch(console.error);
