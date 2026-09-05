#!/usr/bin/env node
// Gera os ícones da app, o ícone adaptativo Android, o splash e os gráficos
// das lojas a partir do logótipo real (assets/logo.png — dourado sobre preto
// puro, sem canal alfa). Nada é inventado: é sempre o mesmo logótipo,
// recortado, com transparência derivada da luminosidade e redimensionado.
//
//   assets/icon.png                      1024×1024, preto opaco (iOS + Android legado)
//   assets/android-icon-foreground.png   1024×1024, transparente, logo na zona segura (66 %)
//   assets/android-icon-monochrome.png   1024×1024, silhueta branca com alfa (Android 13+)
//   assets/splash-icon.png               1024×1024, transparente (plugin expo-splash-screen)
//   assets/favicon.png                   96×96, preto opaco (web)
//   assets/logo-transparent.png          logo recortado com alfa real (para materiais futuros)
//   docs/store/play-icon-512.png         512×512, ícone hi-res que o Play Console pede
//   docs/store/feature-graphic-1024x500.png  gráfico de funcionalidade do Play
//
// Uso:  npm run build:icons   (depois: nova build EAS — o app.json muda)
// Usa `pngjs`, que já vem com o Expo (@expo/image-utils). Sem dependências novas.

import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => join(root, p);

// ---------------------------------------------------------------- extração

// Recorta o logo e converte "dourado sobre preto" em RGBA com alfa real:
// a cor original é o dourado pré-multiplicado pelo alfa (fundo preto), por
// isso alfa = brilho / brilho de referência e cor = original / alfa.
function extractLogo(png) {
  const { width, height, data } = png;
  const THRESHOLD = 12;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  const brights = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const m = Math.max(data[i], data[i + 1], data[i + 2]);
      if (m > THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        brights.push(m);
      }
    }
  }
  brights.sort((a, b) => a - b);
  const ref = brights[Math.floor(brights.length * 0.99)]; // evita cortar o brilho máximo
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = new Float32Array(w * h * 4); // RGBA, cor não pré-multiplicada, 0..255
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y + minY) * width + (x + minX)) * 4;
      const oi = (y * w + x) * 4;
      const m = Math.max(data[si], data[si + 1], data[si + 2]);
      const a = Math.min(1, m / ref);
      if (a <= THRESHOLD / 255) continue; // fica transparente
      out[oi] = Math.min(255, data[si] / a);
      out[oi + 1] = Math.min(255, data[si + 1] / a);
      out[oi + 2] = Math.min(255, data[si + 2] / a);
      out[oi + 3] = a * 255;
    }
  }
  return { w, h, px: out };
}

// ------------------------------------------------------------ redimensionar

// Redução por média de área (supersampling) — só reduzimos, nunca ampliamos.
function resize(sprite, targetW) {
  const scale = sprite.w / targetW;
  const targetH = Math.max(1, Math.round(sprite.h / scale));
  const n = Math.max(2, Math.ceil(scale) + 1); // amostras por eixo
  const out = new Float32Array(targetW * targetH * 4);
  for (let oy = 0; oy < targetH; oy++) {
    for (let ox = 0; ox < targetW; ox++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < n; sy++) {
        for (let sx = 0; sx < n; sx++) {
          const x = Math.min(sprite.w - 1, Math.floor((ox + (sx + 0.5) / n) * scale));
          const y = Math.min(sprite.h - 1, Math.floor((oy + (sy + 0.5) / n) * scale));
          const i = (y * sprite.w + x) * 4;
          const pa = sprite.px[i + 3] / 255;
          r += sprite.px[i] * pa; // acumula pré-multiplicado
          g += sprite.px[i + 1] * pa;
          b += sprite.px[i + 2] * pa;
          a += pa;
        }
      }
      const oi = (oy * targetW + ox) * 4;
      if (a > 0) {
        out[oi] = r / a;
        out[oi + 1] = g / a;
        out[oi + 2] = b / a;
        out[oi + 3] = (a / (n * n)) * 255;
      }
    }
  }
  return { w: targetW, h: targetH, px: out };
}

// ------------------------------------------------------------------ compor

// Canvas preto opaco ou transparente, com o sprite centrado.
// `tint` (ex.: [255,255,255]) substitui a cor mantendo o alfa (monocromático).
function compose({ width, height, opaque, sprite, tint }) {
  const png = new PNG({ width, height, colorType: 6 });
  const d = png.data;
  if (opaque) for (let i = 0; i < d.length; i += 4) d[i + 3] = 255; // preto opaco
  const x0 = Math.round((width - sprite.w) / 2);
  const y0 = Math.round((height - sprite.h) / 2);
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      const si = (y * sprite.w + x) * 4;
      const a = sprite.px[si + 3] / 255;
      if (a <= 0) continue;
      const c = tint ?? [sprite.px[si], sprite.px[si + 1], sprite.px[si + 2]];
      const oi = ((y + y0) * width + (x + x0)) * 4;
      if (opaque) {
        d[oi] = Math.round(c[0] * a); // sobre preto: cor × alfa
        d[oi + 1] = Math.round(c[1] * a);
        d[oi + 2] = Math.round(c[2] * a);
        d[oi + 3] = 255;
      } else {
        d[oi] = Math.round(c[0]);
        d[oi + 1] = Math.round(c[1]);
        d[oi + 2] = Math.round(c[2]);
        d[oi + 3] = Math.round(a * 255);
      }
    }
  }
  return png;
}

function save(path, png, { rgb = false } = {}) {
  mkdirSync(dirname(rel(path)), { recursive: true });
  writeFileSync(rel(path), PNG.sync.write(png, { colorType: rgb ? 2 : 6 }));
  console.log(`  ${path}  ${png.width}×${png.height}`);
}

// ------------------------------------------------------------------- main

const logo = extractLogo(PNG.sync.read(readFileSync(rel('assets/logo.png'))));
console.log(`Logo recortado: ${logo.w}×${logo.h}`);

// Logo com alfa real, tamanho original (o SPEC pedia um PNG transparente).
save('assets/logo-transparent.png', compose({ width: logo.w, height: logo.h, opaque: false, sprite: logo }));

// Ícone principal (iOS exige quadrado opaco, sem cantos arredondados).
save('assets/icon.png', compose({ width: 1024, height: 1024, opaque: true, sprite: resize(logo, 760) }), { rgb: true });

// Android adaptativo: 1024 = 108 dp; zona segura = 66 dp ≈ 626 px. O logo
// fica a 600 px de largura para nenhuma máscara (círculo, squircle) o cortar.
const fg = resize(logo, 600);
save('assets/android-icon-foreground.png', compose({ width: 1024, height: 1024, opaque: false, sprite: fg }));
save('assets/android-icon-monochrome.png', compose({ width: 1024, height: 1024, opaque: false, sprite: fg, tint: [255, 255, 255] }));

// Splash: imagem transparente que o plugin centra num fundo preto.
save('assets/splash-icon.png', compose({ width: 1024, height: 1024, opaque: false, sprite: resize(logo, 960) }));

// Web.
save('assets/favicon.png', compose({ width: 96, height: 96, opaque: true, sprite: resize(logo, 84) }), { rgb: true });

// Lojas (Play Console): ícone hi-res 512×512 e gráfico de funcionalidade 1024×500.
save('docs/store/play-icon-512.png', compose({ width: 512, height: 512, opaque: true, sprite: resize(logo, 380) }));
save('docs/store/feature-graphic-1024x500.png', compose({ width: 1024, height: 500, opaque: true, sprite: resize(logo, 620) }));

console.log('Feito. O app.json aponta para estes ficheiros; uma alteração aqui exige nova build EAS.');
