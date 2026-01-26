import fs from 'node:fs';
import path from 'node:path';

import { detectEntities } from '../src/utils/redaction';

const targetPath = path.join(process.cwd(), 'demo/series-demo-contract-el.txt');
const text = fs.readFileSync(targetPath, 'utf8');
const personEntities = detectEntities(text).filter(entity => entity.type === 'PERSON');
const sortedEntities = [...personEntities].sort((a, b) => b.startIndex - a.startIndex);

let sanitized = text;
for (const entity of sortedEntities) {
  sanitized = sanitized.slice(0, entity.startIndex) + '[ΠΡΟΣΩΠΟ]' + sanitized.slice(entity.endIndex);
}

fs.writeFileSync(targetPath, sanitized, 'utf8');
console.log(`Replaced PERSON entities: ${personEntities.length}`);
