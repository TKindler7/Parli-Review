import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:'portfolio-entry',base:'./',publicDir:'../public',resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},define:{__PORTFOLIO_BUILD__:'true'},build:{outDir:'../portfolio-dist',emptyOutDir:true,sourcemap:false}});
