import { readFileSync } from 'fs';
import { resolve } from 'path';

// read all files and log
const read = (p) => readFileSync(resolve(p), 'utf-8');

console.log('App.tsx exists?:', !!read('src/App.tsx'));
console.log('ProcessEdge exists?:', !!read('src/components/edges/ProcessEdge.tsx'));
console.log('ProcessNode exists?:', !!read('src/components/nodes/ProcessNode.tsx'));
console.log('PreviewTex exists?:', !!read('src/components/PreviewTex.tsx'));
console.log('texGenerator exists?:', !!read('src/lib/texGenerator.ts'));
console.log('types exists?:', !!read('src/lib/types.ts'));
