#!/bin/sh
# CPU senza AVX2 (es. Intel Ivy Bridge): il compilatore Rust di Astro 7 crasha (exit 132, SIGILL).
# Installa il binding WASI (più lento, identico) e rimuove quello nativo. Rilanciare dopo ogni `npm install`.
grep -q avx2 /proc/cpuinfo && { echo "AVX2 presente, niente da fare"; exit 0; }
npm i --no-save --force "@astrojs/compiler-binding-wasm32-wasi@$(node -p "require('@astrojs/compiler-binding/package.json').version")"
rm -rf node_modules/@astrojs/compiler-binding-linux-x64-*
