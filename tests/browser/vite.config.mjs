import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);
export default defineConfig({root,plugins:[{name:'isolated-fixture',enforce:'pre',resolveId(id,importer){if(id==='firebase/firestore'||id.endsWith('/core/firebase')||(id==='./firebase'&&importer?.includes('/core/'))||id.endsWith('/adventure/sharedSnapshot'))return path.join(root,'firestore.mjs');}},react()],server:{host:'127.0.0.1',port:4179,fs:{allow:[path.resolve(root,'../..')]}}});
