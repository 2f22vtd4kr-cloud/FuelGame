import { useEffect, useRef, useState } from "react";

// ── Palette ─────────────────────────────────────────────────────────────────
const P = {
  o:   '#111111', // outline
  sk:  '#C68642', // skin
  ski: '#D9956A', // skin highlight
  skd: '#A06030', // skin shadow
  cy:  '#F4C030', // cap / hoodie yellow
  cym: '#D4A020', // cap / hoodie mid
  cyd: '#C8900A', // cap / hoodie dark
  cyb: '#A07008', // cap brim bottom
  cyt: '#FFDA50', // cap highlight
  cr:  '#CC1111', // Я red
  crd: '#AA0000', // Я dark red
  jb:  '#4A72C0', // jeans blue
  jbm: '#2E5098', // jeans mid
  jbd: '#1A3878', // jeans dark
  sh:  '#222222', // shoe
  shs: '#444444', // shoe shine
  hr:  '#5A2D0C', // hair
  hrh: '#7A4020', // hair highlight
  lip: '#CC7755', // mouth / lips
  wh:  '#FFFFFF', // white
};

type Dir = 'front' | 'back' | 'left' | 'right';

// ── Low-level pixel helpers ──────────────────────────────────────────────────
function fill(ctx: CanvasRenderingContext2D, color: string) { ctx.fillStyle = color; }
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function outline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = P.o;
  rect(ctx, x, y, w, 1);
  rect(ctx, x, y + h - 1, w, 1);
  rect(ctx, x, y, 1, h);
  rect(ctx, x + w - 1, y, 1, h);
}

// ── Walk-cycle offsets ───────────────────────────────────────────────────────
function walk(frame: number) {
  const bob  = (frame === 1 || frame === 3) ? 1 : 0;
  const lly  = frame === 1 ? -3 : frame === 3 ? 3  : 0; // left-leg  Y
  const rly  = frame === 1 ?  3 : frame === 3 ? -3 : 0; // right-leg Y
  const lay  = frame === 1 ?  2 : frame === 3 ? -2 : 0; // left-arm  Y
  const ray  = frame === 1 ? -2 : frame === 3 ?  2 : 0; // right-arm Y
  return { bob, lly, rly, lay, ray };
}

// ── FRONT (row 2) ────────────────────────────────────────────────────────────
function drawFront(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number) {
  const { bob, lly, rly, lay, ray } = walk(frame);
  ctx.clearRect(ox, oy, 64, 64);

  // legs (behind body)
  for (const [lx, ly] of [[20, lly], [33, rly]] as [number,number][]) {
    fill(ctx, P.jbm); rect(ctx, ox+lx,   oy+48+ly+bob, 11, 12);
    fill(ctx, P.jb);  rect(ctx, ox+lx+1, oy+48+ly+bob, 9,  11);
    fill(ctx, P.jbd); rect(ctx, ox+lx,   oy+48+ly+bob, 11,  1);
    outline(ctx, ox+lx, oy+48+ly+bob, 11, 11);
  }
  // shoes
  for (const [sx, sy] of [[18, lly], [32, rly]] as [number,number][]) {
    fill(ctx, P.sh);  rect(ctx, ox+sx,   oy+56+sy+bob, 14, 4);
    fill(ctx, P.shs); rect(ctx, ox+sx+1, oy+57+sy+bob, 12, 2);
    fill(ctx, P.o);   rect(ctx, ox+sx,   oy+56+sy+bob, 14, 1);
    fill(ctx, P.o);   rect(ctx, ox+sx,   oy+56+sy+bob,  1, 4);
    fill(ctx, P.o);   rect(ctx, ox+sx+13,oy+56+sy+bob,  1, 4);
  }

  // left arm
  fill(ctx, P.cyd); rect(ctx, ox+10, oy+35+lay+bob, 9, 14);
  fill(ctx, P.cy);  rect(ctx, ox+11, oy+35+lay+bob, 7, 12);
  fill(ctx, P.cym); rect(ctx, ox+12, oy+36+lay+bob, 5, 10);
  outline(ctx, ox+10, oy+35+lay+bob, 9, 13);
  // right arm
  fill(ctx, P.cyd); rect(ctx, ox+45, oy+35+ray+bob, 9, 14);
  fill(ctx, P.cy);  rect(ctx, ox+46, oy+35+ray+bob, 7, 12);
  fill(ctx, P.cym); rect(ctx, ox+47, oy+36+ray+bob, 5, 10);
  outline(ctx, ox+45, oy+35+ray+bob, 9, 13);

  // hoodie body
  fill(ctx, P.cyd); rect(ctx, ox+17, oy+34+bob, 30, 18);
  fill(ctx, P.cy);  rect(ctx, ox+18, oy+34+bob, 28, 17);
  fill(ctx, P.cym); rect(ctx, ox+19, oy+35+bob, 26, 15);
  // zipper
  fill(ctx, P.cyd); rect(ctx, ox+31, oy+34+bob, 2, 16);
  // kangaroo pocket
  fill(ctx, P.cym); rect(ctx, ox+22, oy+44+bob, 20, 5);
  fill(ctx, P.cyd); rect(ctx, ox+22, oy+44+bob, 20,  1);
  fill(ctx, P.cyd); rect(ctx, ox+22, oy+44+bob,  1,  5);
  fill(ctx, P.cyd); rect(ctx, ox+41, oy+44+bob,  1,  5);
  outline(ctx, ox+17, oy+34+bob, 30, 18);

  // head
  fill(ctx, P.skd); rect(ctx, ox+21, oy+19+bob, 22, 17);
  fill(ctx, P.sk);  rect(ctx, ox+22, oy+19+bob, 20, 16);
  fill(ctx, P.ski); rect(ctx, ox+23, oy+20+bob, 18, 12);
  // ears
  fill(ctx, P.sk);  rect(ctx, ox+21, oy+24+bob,  2,  6);
  fill(ctx, P.sk);  rect(ctx, ox+41, oy+24+bob,  2,  6);
  fill(ctx, P.skd); rect(ctx, ox+21, oy+24+bob,  1,  6);
  fill(ctx, P.skd); rect(ctx, ox+42, oy+24+bob,  1,  6);
  // eyebrows
  fill(ctx, P.hr);  rect(ctx, ox+25, oy+23+bob, 4, 1);
  fill(ctx, P.hr);  rect(ctx, ox+35, oy+23+bob, 4, 1);
  // eyes
  fill(ctx, P.o);   rect(ctx, ox+25, oy+25+bob, 4, 3);
  fill(ctx, P.o);   rect(ctx, ox+35, oy+25+bob, 4, 3);
  fill(ctx, P.wh);  px(ctx, ox+26, oy+25+bob, P.wh);
  fill(ctx, P.wh);  px(ctx, ox+36, oy+25+bob, P.wh);
  fill(ctx, '#4A3010'); rect(ctx, ox+26, oy+26+bob, 2, 1);
  fill(ctx, '#4A3010'); rect(ctx, ox+36, oy+26+bob, 2, 1);
  // nose
  fill(ctx, P.skd); rect(ctx, ox+30, oy+30+bob, 4, 3);
  fill(ctx, P.sk);  rect(ctx, ox+31, oy+31+bob, 2, 2);
  // mouth
  fill(ctx, P.o);   rect(ctx, ox+27, oy+33+bob, 10, 1);
  fill(ctx, P.lip); rect(ctx, ox+28, oy+33+bob,  8, 1);
  fill(ctx, P.ski); rect(ctx, ox+28, oy+34+bob,  8, 1);
  // chin
  fill(ctx, P.skd); rect(ctx, ox+22, oy+34+bob, 20,  1);
  outline(ctx, ox+21, oy+19+bob, 22, 16);

  // cap dome
  fill(ctx, P.cyt); rect(ctx, ox+22, oy+ 5+bob, 20, 13);
  fill(ctx, P.cy);  rect(ctx, ox+22, oy+ 5+bob, 20, 13);
  fill(ctx, P.cyt); rect(ctx, ox+24, oy+ 5+bob, 16, 6);
  fill(ctx, P.cym); rect(ctx, ox+22, oy+15+bob, 20,  3);
  // cap top round
  fill(ctx, P.cy);  rect(ctx, ox+24, oy+ 4+bob, 16,  2);
  fill(ctx, P.cy);  rect(ctx, ox+27, oy+ 3+bob, 10,  2);
  fill(ctx, P.cy);  rect(ctx, ox+29, oy+ 2+bob,  6,  2);
  // button
  fill(ctx, P.cyd); rect(ctx, ox+30, oy+ 2+bob,  4,  2);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+ 2+bob,  4,  1);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+ 2+bob,  1,  2);
  fill(ctx, P.o);   rect(ctx, ox+33, oy+ 2+bob,  1,  2);
  outline(ctx, ox+22, oy+ 5+bob, 20, 13);
  fill(ctx, P.o);   rect(ctx, ox+24, oy+ 4+bob, 16, 1);
  fill(ctx, P.o);   rect(ctx, ox+27, oy+ 3+bob, 10, 1);
  fill(ctx, P.o);   rect(ctx, ox+29, oy+ 2+bob,  6, 1);

  // Я letter (7×8 at cap center)
  const rx = ox + 29, ry = oy + 7 + bob;
  fill(ctx, P.cr);  rect(ctx, rx,   ry,   6, 8); // red block
  fill(ctx, P.cyt); // cutouts to form Я
  rect(ctx, rx+2,   ry+1, 4, 3); // inside top loop
  fill(ctx, P.crd);
  rect(ctx, rx,     ry,   6, 1); // top line
  rect(ctx, rx,     ry,   1, 8); // left bar
  rect(ctx, rx+4,   ry+4, 2, 4); // right leg of Я

  // cap brim
  fill(ctx, P.cyd); rect(ctx, ox+16, oy+18+bob, 32, 4);
  fill(ctx, P.cym); rect(ctx, ox+17, oy+18+bob, 30, 2);
  fill(ctx, P.cyb); rect(ctx, ox+16, oy+21+bob, 32, 1);
  outline(ctx, ox+16, oy+18+bob, 32, 4);
}

// ── BACK (row 3) ─────────────────────────────────────────────────────────────
function drawBack(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number) {
  const { bob, lly, rly, lay, ray } = walk(frame);
  ctx.clearRect(ox, oy, 64, 64);

  // legs
  for (const [lx, ly] of [[20, lly], [33, rly]] as [number,number][]) {
    fill(ctx, P.jbm); rect(ctx, ox+lx,   oy+48+ly+bob, 11, 12);
    fill(ctx, P.jb);  rect(ctx, ox+lx+1, oy+48+ly+bob,  9, 11);
    fill(ctx, P.jbd); rect(ctx, ox+lx,   oy+48+ly+bob, 11,  1);
    outline(ctx, ox+lx, oy+48+ly+bob, 11, 11);
  }
  // shoes
  for (const [sx, sy] of [[18, lly], [32, rly]] as [number,number][]) {
    fill(ctx, P.sh);  rect(ctx, ox+sx,   oy+56+sy+bob, 14, 4);
    fill(ctx, P.shs); rect(ctx, ox+sx+1, oy+57+sy+bob, 12, 2);
    fill(ctx, P.o);   rect(ctx, ox+sx,   oy+56+sy+bob, 14,  1);
    fill(ctx, P.o);   rect(ctx, ox+sx,   oy+56+sy+bob,  1,  4);
    fill(ctx, P.o);   rect(ctx, ox+sx+13,oy+56+sy+bob,  1,  4);
  }
  // arms
  fill(ctx, P.cyd); rect(ctx, ox+10, oy+35+lay+bob, 9, 14);
  fill(ctx, P.cy);  rect(ctx, ox+11, oy+35+lay+bob, 7, 12);
  fill(ctx, P.cym); rect(ctx, ox+12, oy+36+lay+bob, 5, 10);
  outline(ctx, ox+10, oy+35+lay+bob, 9, 13);
  fill(ctx, P.cyd); rect(ctx, ox+45, oy+35+ray+bob, 9, 14);
  fill(ctx, P.cy);  rect(ctx, ox+46, oy+35+ray+bob, 7, 12);
  fill(ctx, P.cym); rect(ctx, ox+47, oy+36+ray+bob, 5, 10);
  outline(ctx, ox+45, oy+35+ray+bob, 9, 13);
  // hoodie body (back — no zipper, different seams)
  fill(ctx, P.cyd); rect(ctx, ox+17, oy+34+bob, 30, 18);
  fill(ctx, P.cy);  rect(ctx, ox+18, oy+34+bob, 28, 17);
  fill(ctx, P.cym); rect(ctx, ox+19, oy+35+bob, 26, 15);
  fill(ctx, P.cyd); rect(ctx, ox+18, oy+40+bob,  1,  8);
  fill(ctx, P.cyd); rect(ctx, ox+45, oy+40+bob,  1,  8);
  outline(ctx, ox+17, oy+34+bob, 30, 18);
  // head (back – hair visible)
  fill(ctx, P.skd); rect(ctx, ox+21, oy+19+bob, 22, 17);
  fill(ctx, P.hr);  rect(ctx, ox+22, oy+19+bob, 20, 16);
  fill(ctx, P.hrh); rect(ctx, ox+24, oy+20+bob, 16, 10);
  // ears (back)
  fill(ctx, P.sk);  rect(ctx, ox+21, oy+24+bob,  2,  6);
  fill(ctx, P.sk);  rect(ctx, ox+41, oy+24+bob,  2,  6);
  fill(ctx, P.skd); rect(ctx, ox+21, oy+24+bob,  1,  6);
  fill(ctx, P.skd); rect(ctx, ox+42, oy+24+bob,  1,  6);
  // neck back
  fill(ctx, P.skd); rect(ctx, ox+28, oy+34+bob,  8,  2);
  outline(ctx, ox+21, oy+19+bob, 22, 16);
  // cap (back view)
  fill(ctx, P.cy);  rect(ctx, ox+22, oy+ 5+bob, 20, 13);
  fill(ctx, P.cyt); rect(ctx, ox+24, oy+ 5+bob, 16,  6);
  fill(ctx, P.cym); rect(ctx, ox+22, oy+14+bob, 20,  4);
  fill(ctx, P.cy);  rect(ctx, ox+24, oy+ 4+bob, 16,  2);
  fill(ctx, P.cy);  rect(ctx, ox+27, oy+ 3+bob, 10,  2);
  fill(ctx, P.cy);  rect(ctx, ox+29, oy+ 2+bob,  6,  2);
  fill(ctx, P.cyd); rect(ctx, ox+30, oy+ 2+bob,  4,  2);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+ 2+bob,  4,  1);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+ 2+bob,  1,  2);
  fill(ctx, P.o);   rect(ctx, ox+33, oy+ 2+bob,  1,  2);
  outline(ctx, ox+22, oy+ 5+bob, 20, 13);
  fill(ctx, P.o);   rect(ctx, ox+24, oy+ 4+bob, 16,  1);
  fill(ctx, P.o);   rect(ctx, ox+27, oy+ 3+bob, 10,  1);
  fill(ctx, P.o);   rect(ctx, ox+29, oy+ 2+bob,  6,  1);
  // back brim (smaller)
  fill(ctx, P.cyd); rect(ctx, ox+20, oy+18+bob, 24, 3);
  fill(ctx, P.cym); rect(ctx, ox+21, oy+18+bob, 22, 1);
  // snapback strap
  fill(ctx, '#888888'); rect(ctx, ox+27, oy+19+bob, 10, 2);
  fill(ctx, '#555555'); rect(ctx, ox+31, oy+19+bob,  2, 2);
  outline(ctx, ox+20, oy+18+bob, 24, 3);
}

// ── LEFT (row 0) ─────────────────────────────────────────────────────────────
function drawLeft(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number) {
  const { bob, lly, rly, lay, ray } = walk(frame);
  ctx.clearRect(ox, oy, 64, 64);

  // back leg (behind body)
  fill(ctx, P.jbd); rect(ctx, ox+25, oy+48+rly+bob, 9, 12);
  fill(ctx, P.jbm); rect(ctx, ox+26, oy+48+rly+bob, 7, 11);
  fill(ctx, P.o);   rect(ctx, ox+25, oy+48+rly+bob, 9,  1);
  // back shoe
  fill(ctx, P.sh);  rect(ctx, ox+21, oy+56+rly+bob, 13, 4);
  fill(ctx, P.o);   rect(ctx, ox+21, oy+56+rly+bob, 13,  1);
  // back arm (visible left side)
  fill(ctx, P.cyd); rect(ctx, ox+27, oy+35+ray+bob, 5, 12);
  fill(ctx, P.cym); rect(ctx, ox+28, oy+35+ray+bob, 3, 10);
  fill(ctx, P.o);   rect(ctx, ox+27, oy+35+ray+bob, 1, 12);
  fill(ctx, P.o);   rect(ctx, ox+31, oy+35+ray+bob, 1, 12);

  // body
  fill(ctx, P.cyd); rect(ctx, ox+22, oy+34+bob, 20, 18);
  fill(ctx, P.cy);  rect(ctx, ox+23, oy+34+bob, 18, 17);
  fill(ctx, P.cym); rect(ctx, ox+24, oy+35+bob, 16, 15);
  fill(ctx, P.cyd); rect(ctx, ox+34, oy+44+bob,  6,  1); // side seam
  outline(ctx, ox+22, oy+34+bob, 20, 18);

  // front leg
  fill(ctx, P.jbm); rect(ctx, ox+23, oy+48+lly+bob, 11, 12);
  fill(ctx, P.jb);  rect(ctx, ox+24, oy+48+lly+bob,  9, 11);
  fill(ctx, P.jbd); rect(ctx, ox+23, oy+48+lly+bob, 11,  1);
  outline(ctx, ox+23, oy+48+lly+bob, 11, 11);
  // front shoe (larger, side profile)
  fill(ctx, P.sh);  rect(ctx, ox+18, oy+56+lly+bob, 16, 4);
  fill(ctx, P.shs); rect(ctx, ox+19, oy+57+lly+bob, 14, 2);
  fill(ctx, P.o);   rect(ctx, ox+18, oy+56+lly+bob, 16,  1);
  fill(ctx, P.o);   rect(ctx, ox+18, oy+56+lly+bob,  1,  4);
  fill(ctx, P.o);   rect(ctx, ox+33, oy+56+lly+bob,  1,  4);

  // front arm
  fill(ctx, P.cyd); rect(ctx, ox+22, oy+35+lay+bob, 6, 13);
  fill(ctx, P.cy);  rect(ctx, ox+23, oy+35+lay+bob, 5, 11);
  fill(ctx, P.cym); rect(ctx, ox+24, oy+36+lay+bob, 3,  9);
  outline(ctx, ox+22, oy+35+lay+bob, 6, 12);

  // head (left profile)
  fill(ctx, P.skd); rect(ctx, ox+23, oy+19+bob, 16, 17);
  fill(ctx, P.sk);  rect(ctx, ox+24, oy+19+bob, 15, 16);
  fill(ctx, P.ski); rect(ctx, ox+25, oy+20+bob, 12, 12);
  // hair on back of head
  fill(ctx, P.hr);  rect(ctx, ox+23, oy+19+bob,  2, 16);
  fill(ctx, P.hrh); rect(ctx, ox+24, oy+20+bob,  2, 12);
  // eye (facing left)
  fill(ctx, P.hr);  rect(ctx, ox+32, oy+23+bob, 4, 1); // eyebrow
  fill(ctx, P.o);   rect(ctx, ox+33, oy+25+bob, 3, 3);
  fill(ctx, P.wh);  px(ctx, ox+34, oy+25+bob, P.wh);
  fill(ctx, '#4A3010'); rect(ctx, ox+33, oy+26+bob, 2, 1);
  // nose (profile)
  fill(ctx, P.skd); rect(ctx, ox+37, oy+29+bob, 3, 4);
  fill(ctx, P.sk);  rect(ctx, ox+36, oy+30+bob, 2, 3);
  fill(ctx, P.skd); rect(ctx, ox+37, oy+32+bob, 2, 1);
  // mouth
  fill(ctx, P.o);   rect(ctx, ox+35, oy+33+bob, 3, 1);
  fill(ctx, P.lip); rect(ctx, ox+35, oy+33+bob, 2, 1);
  // chin
  fill(ctx, P.skd); rect(ctx, ox+24, oy+34+bob, 14, 1);
  outline(ctx, ox+23, oy+19+bob, 16, 16);

  // cap (left side, brim points right = forward)
  fill(ctx, P.cy);  rect(ctx, ox+23, oy+ 5+bob, 16, 14);
  fill(ctx, P.cyt); rect(ctx, ox+25, oy+ 5+bob, 12,  7);
  fill(ctx, P.cym); rect(ctx, ox+23, oy+15+bob, 16,  4);
  fill(ctx, P.cy);  rect(ctx, ox+25, oy+ 4+bob, 13,  2);
  fill(ctx, P.cy);  rect(ctx, ox+27, oy+ 3+bob,  9,  2);
  fill(ctx, P.cy);  rect(ctx, ox+29, oy+ 2+bob,  5,  2);
  fill(ctx, P.cyd); rect(ctx, ox+30, oy+ 2+bob,  3,  2);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+ 2+bob,  3,  1);
  fill(ctx, P.o);   rect(ctx, ox+32, oy+ 2+bob,  1,  2);
  outline(ctx, ox+23, oy+ 5+bob, 16, 14);
  fill(ctx, P.o);   rect(ctx, ox+25, oy+ 4+bob, 13,  1);
  fill(ctx, P.o);   rect(ctx, ox+29, oy+ 2+bob,  5,  1);
  // brim extending forward (rightward)
  fill(ctx, P.cyd); rect(ctx, ox+24, oy+18+bob, 18, 3);
  fill(ctx, P.cym); rect(ctx, ox+25, oy+18+bob, 16, 1);
  fill(ctx, P.cyb); rect(ctx, ox+24, oy+20+bob, 18, 1);
  outline(ctx, ox+24, oy+18+bob, 18, 3);
  fill(ctx, P.o);   rect(ctx, ox+41, oy+18+bob,  1, 3); // brim tip

  // Я visible on side (partial, sideways)
  fill(ctx, P.cr);  rect(ctx, ox+31, oy+8+bob, 4, 6);
  fill(ctx, P.cyd); rect(ctx, ox+31, oy+8+bob, 4, 1);
  fill(ctx, P.cyd); rect(ctx, ox+31, oy+8+bob, 1, 6);
}

// ── RIGHT (row 1) ────────────────────────────────────────────────────────────
function drawRight(ctx: CanvasRenderingContext2D, ox: number, oy: number, frame: number) {
  const { bob, lly, rly, lay, ray } = walk(frame);
  ctx.clearRect(ox, oy, 64, 64);

  // back leg
  fill(ctx, P.jbd); rect(ctx, ox+30, oy+48+lly+bob, 9, 12);
  fill(ctx, P.jbm); rect(ctx, ox+31, oy+48+lly+bob, 7, 11);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+48+lly+bob, 9,  1);
  // back shoe
  fill(ctx, P.sh);  rect(ctx, ox+30, oy+56+lly+bob, 13, 4);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+56+lly+bob, 13,  1);
  // back arm
  fill(ctx, P.cyd); rect(ctx, ox+32, oy+35+lay+bob, 5, 12);
  fill(ctx, P.cym); rect(ctx, ox+33, oy+35+lay+bob, 3, 10);
  fill(ctx, P.o);   rect(ctx, ox+32, oy+35+lay+bob, 1, 12);
  fill(ctx, P.o);   rect(ctx, ox+36, oy+35+lay+bob, 1, 12);

  // body
  fill(ctx, P.cyd); rect(ctx, ox+22, oy+34+bob, 20, 18);
  fill(ctx, P.cy);  rect(ctx, ox+23, oy+34+bob, 18, 17);
  fill(ctx, P.cym); rect(ctx, ox+24, oy+35+bob, 16, 15);
  fill(ctx, P.cyd); rect(ctx, ox+24, oy+44+bob,  6,  1);
  outline(ctx, ox+22, oy+34+bob, 20, 18);

  // front leg
  fill(ctx, P.jbm); rect(ctx, ox+30, oy+48+rly+bob, 11, 12);
  fill(ctx, P.jb);  rect(ctx, ox+31, oy+48+rly+bob,  9, 11);
  fill(ctx, P.jbd); rect(ctx, ox+30, oy+48+rly+bob, 11,  1);
  outline(ctx, ox+30, oy+48+rly+bob, 11, 11);
  // front shoe
  fill(ctx, P.sh);  rect(ctx, ox+30, oy+56+rly+bob, 16, 4);
  fill(ctx, P.shs); rect(ctx, ox+31, oy+57+rly+bob, 14, 2);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+56+rly+bob, 16,  1);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+56+rly+bob,  1,  4);
  fill(ctx, P.o);   rect(ctx, ox+45, oy+56+rly+bob,  1,  4);

  // front arm
  fill(ctx, P.cyd); rect(ctx, ox+36, oy+35+ray+bob, 6, 13);
  fill(ctx, P.cy);  rect(ctx, ox+37, oy+35+ray+bob, 5, 11);
  fill(ctx, P.cym); rect(ctx, ox+38, oy+36+ray+bob, 3,  9);
  outline(ctx, ox+36, oy+35+ray+bob, 6, 12);

  // head (right profile)
  fill(ctx, P.skd); rect(ctx, ox+25, oy+19+bob, 16, 17);
  fill(ctx, P.sk);  rect(ctx, ox+25, oy+19+bob, 15, 16);
  fill(ctx, P.ski); rect(ctx, ox+26, oy+20+bob, 12, 12);
  // hair
  fill(ctx, P.hr);  rect(ctx, ox+39, oy+19+bob,  2, 16);
  fill(ctx, P.hrh); rect(ctx, ox+38, oy+20+bob,  2, 12);
  // eyebrow
  fill(ctx, P.hr);  rect(ctx, ox+28, oy+23+bob, 4, 1);
  // eye
  fill(ctx, P.o);   rect(ctx, ox+28, oy+25+bob, 3, 3);
  fill(ctx, P.wh);  px(ctx, ox+29, oy+25+bob, P.wh);
  fill(ctx, '#4A3010'); rect(ctx, ox+29, oy+26+bob, 2, 1);
  // nose (profile)
  fill(ctx, P.skd); rect(ctx, ox+25, oy+29+bob, 3, 4);
  fill(ctx, P.sk);  rect(ctx, ox+26, oy+30+bob, 2, 3);
  fill(ctx, P.skd); rect(ctx, ox+25, oy+32+bob, 2, 1);
  // mouth
  fill(ctx, P.o);   rect(ctx, ox+26, oy+33+bob, 3, 1);
  fill(ctx, P.lip); rect(ctx, ox+27, oy+33+bob, 2, 1);
  // chin
  fill(ctx, P.skd); rect(ctx, ox+26, oy+34+bob, 14, 1);
  outline(ctx, ox+25, oy+19+bob, 16, 16);

  // cap (right side, brim extends left = forward)
  fill(ctx, P.cy);  rect(ctx, ox+25, oy+ 5+bob, 16, 14);
  fill(ctx, P.cyt); rect(ctx, ox+26, oy+ 5+bob, 12,  7);
  fill(ctx, P.cym); rect(ctx, ox+25, oy+15+bob, 16,  4);
  fill(ctx, P.cy);  rect(ctx, ox+26, oy+ 4+bob, 13,  2);
  fill(ctx, P.cy);  rect(ctx, ox+28, oy+ 3+bob,  9,  2);
  fill(ctx, P.cy);  rect(ctx, ox+30, oy+ 2+bob,  5,  2);
  fill(ctx, P.cyd); rect(ctx, ox+31, oy+ 2+bob,  3,  2);
  fill(ctx, P.o);   rect(ctx, ox+31, oy+ 2+bob,  3,  1);
  fill(ctx, P.o);   rect(ctx, ox+31, oy+ 2+bob,  1,  2);
  outline(ctx, ox+25, oy+ 5+bob, 16, 14);
  fill(ctx, P.o);   rect(ctx, ox+26, oy+ 4+bob, 13,  1);
  fill(ctx, P.o);   rect(ctx, ox+30, oy+ 2+bob,  5,  1);
  // brim extending forward (leftward)
  fill(ctx, P.cyd); rect(ctx, ox+22, oy+18+bob, 18, 3);
  fill(ctx, P.cym); rect(ctx, ox+23, oy+18+bob, 16, 1);
  fill(ctx, P.cyb); rect(ctx, ox+22, oy+20+bob, 18, 1);
  outline(ctx, ox+22, oy+18+bob, 18, 3);
  fill(ctx, P.o);   rect(ctx, ox+22, oy+18+bob,  1, 3);

  // Я partial on right side
  fill(ctx, P.cr);  rect(ctx, ox+29, oy+8+bob, 4, 6);
  fill(ctx, P.cyd); rect(ctx, ox+29, oy+8+bob, 4, 1);
  fill(ctx, P.cyd); rect(ctx, ox+32, oy+8+bob, 1, 6);
}

// ── Draw one frame ───────────────────────────────────────────────────────────
function drawFrame(ctx: CanvasRenderingContext2D, dir: Dir, frame: number, ox: number, oy: number) {
  switch (dir) {
    case 'front': drawFront(ctx, ox, oy, frame); break;
    case 'back':  drawBack (ctx, ox, oy, frame); break;
    // drawLeft visually faces right; drawRight visually faces left — swap so
    // the labeled direction matches the on-screen orientation.
    case 'left':  drawRight(ctx, ox, oy, frame); break;
    case 'right': drawLeft (ctx, ox, oy, frame); break;
  }
}

// ── Draw the full 4×4 sprite sheet ───────────────────────────────────────────
const DIRS: Dir[] = ['left', 'right', 'front', 'back'];
const DIR_LABELS = ['← Влево', '→ Вправо', '↓ Вперёд', '↑ Назад'];

function drawSheet(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      // Clip to this cell so walk-cycle offsets that approach the boundary
      // never bleed into adjacent cells.
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * 64, row * 64, 64, 64);
      ctx.clip();
      drawFrame(ctx, DIRS[row], col, col * 64, row * 64);
      ctx.restore();
    }
  }
}

// ── Component ────────────────────────────────────────────────────────────────
const SCALE = 3;           // sheet display scale (256×256 → 768×768 … clamped via CSS)
const PREVIEW_SCALE = 6;   // animated preview scale

export function DenisSprite() {
  const sheetRef   = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [activeDir,   setActiveDir]   = useState<Dir>('front');
  const [activeFrame, setActiveFrame] = useState(0);
  const [playing, setPlaying]         = useState(true);
  // draw full sheet once on mount
  useEffect(() => {
    const canvas = sheetRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawSheet(ctx);
  }, []);

  // Single preview loop — `activeFrame` is the sole source of truth;
  // the interval advances it, direction buttons reset it.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Always draw the current frame immediately (covers pause + direction change)
    ctx.clearRect(0, 0, 64, 64);
    drawFrame(ctx, activeDir, activeFrame, 0, 0);

    if (!playing) return;

    const timer = setInterval(() => {
      setActiveFrame(f => {
        const next = (f + 1) % 4;
        // Draw inside the setter so we always have the correct canvas context
        ctx.clearRect(0, 0, 64, 64);
        drawFrame(ctx, activeDir, next, 0, 0);
        return next;
      });
    }, 160);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDir, activeFrame, playing]);

  return (
    <div style={{ background: '#1a1a2e', minHeight: '100vh', color: '#fff', fontFamily: 'monospace', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: '#F4C030', textTransform: 'uppercase', marginBottom: 4 }}>
          Pixel Sprite Sheet
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, color: '#fff' }}>
          ДЕНИС
        </div>
        <div style={{ fontSize: 12, color: '#8888aa', marginTop: 2 }}>
          Жёлтая толстовка · Синие джинсы · Кепка «Я»
        </div>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left: sprite sheet grid */}
        <div>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 8, letterSpacing: 2 }}>
            SPRITE SHEET · 4×4 · 64px/FRAME · {SCALE}× ZOOM
          </div>

          {/* Column labels (frames 0–3) */}
          <div style={{ display: 'flex', marginLeft: 100, marginBottom: 4 }}>
            {[0,1,2,3].map(f => (
              <div key={f} style={{ width: 64*SCALE, textAlign: 'center', fontSize: 10, color: '#556688' }}>
                F{f}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex' }}>
            {/* Row labels */}
            <div style={{ width: 100, display: 'flex', flexDirection: 'column' }}>
              {DIR_LABELS.map((lbl, i) => (
                <div key={i} style={{
                  height: 64*SCALE, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 10, fontSize: 11, color: DIRS[i] === activeDir ? '#F4C030' : '#556688',
                  cursor: 'pointer', transition: 'color .15s',
                }} onClick={() => { setActiveDir(DIRS[i]); setActiveFrame(0); }}>
                  {lbl}
                </div>
              ))}
            </div>

            {/* Sheet canvas */}
            <div style={{ position: 'relative' }}>
              <canvas
                ref={sheetRef}
                width={256} height={256}
                style={{ imageRendering: 'pixelated', width: 256*SCALE, height: 256*SCALE, display: 'block', cursor: 'pointer' }}
                onClick={(e) => {
                  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const col = Math.floor(x / (64*SCALE));
                  const row = Math.floor(y / (64*SCALE));
                  if (col >= 0 && col < 4 && row >= 0 && row < 4) {
                    setActiveDir(DIRS[row]);
                    setActiveFrame(col);
                    setPlaying(false);
                  }
                }}
              />
              {/* Grid overlay */}
              <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                width={256*SCALE} height={256*SCALE}>
                {[0,1,2,3,4].map(i => (
                  <line key={`v${i}`} x1={i*64*SCALE} y1={0} x2={i*64*SCALE} y2={256*SCALE}
                    stroke="#334" strokeWidth={1} />
                ))}
                {[0,1,2,3,4].map(i => (
                  <line key={`h${i}`} x1={0} y1={i*64*SCALE} x2={256*SCALE} y2={i*64*SCALE}
                    stroke="#334" strokeWidth={1} />
                ))}
                {/* Active row/col highlight */}
                <rect x={0} y={DIRS.indexOf(activeDir)*64*SCALE}
                  width={256*SCALE} height={64*SCALE}
                  fill="rgba(244,192,48,0.06)" stroke="#F4C030" strokeWidth={2} />
              </svg>
            </div>
          </div>
        </div>

        {/* Right: animated preview + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Preview */}
          <div>
            <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 8, letterSpacing: 2 }}>
              ANIMATED PREVIEW · {PREVIEW_SCALE}× ZOOM
            </div>
            <div style={{
              background: '#14142a',
              border: '1px solid #334',
              borderRadius: 4,
              padding: 24,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <canvas
                ref={previewRef}
                width={64} height={64}
                style={{ imageRendering: 'pixelated', width: 64*PREVIEW_SCALE, height: 64*PREVIEW_SCALE }}
              />
            </div>
          </div>

          {/* Direction picker */}
          <div>
            <div style={{ fontSize: 11, color: '#556688', marginBottom: 8, letterSpacing: 1 }}>DIRECTION</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {DIRS.map((d, i) => (
                <button key={d} onClick={() => { setActiveDir(d); setActiveFrame(0); }}
                  style={{
                    padding: '6px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                    border: `1px solid ${activeDir === d ? '#F4C030' : '#334'}`,
                    background: activeDir === d ? 'rgba(244,192,48,0.15)' : '#14142a',
                    color: activeDir === d ? '#F4C030' : '#8888aa',
                    borderRadius: 3, cursor: 'pointer', letterSpacing: 1,
                  }}>
                  {DIR_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Playback */}
          <div>
            <div style={{ fontSize: 11, color: '#556688', marginBottom: 8, letterSpacing: 1 }}>PLAYBACK</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPlaying(p => !p)}
                style={{
                  padding: '6px 16px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                  border: '1px solid #F4C030', background: 'rgba(244,192,48,0.15)',
                  color: '#F4C030', borderRadius: 3, cursor: 'pointer', letterSpacing: 1,
                }}>
                {playing ? '⏸ PAUSE' : '▶ PLAY'}
              </button>
              {[0,1,2,3].map(f => (
                <button key={f} onClick={() => { setActiveFrame(f); setPlaying(false); }}
                  style={{
                    width: 32, height: 32, fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                    border: `1px solid ${activeFrame === f && !playing ? '#F4C030' : '#334'}`,
                    background: activeFrame === f && !playing ? 'rgba(244,192,48,0.15)' : '#14142a',
                    color: activeFrame === f && !playing ? '#F4C030' : '#556688',
                    borderRadius: 3, cursor: 'pointer',
                  }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Colour palette */}
          <div>
            <div style={{ fontSize: 11, color: '#556688', marginBottom: 8, letterSpacing: 1 }}>PALETTE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[
                ['Cap / Hoodie',   P.cy],
                ['Cap dark',       P.cyd],
                ['Cap brim',       P.cyb],
                ['Я Red',          P.cr],
                ['Skin',           P.sk],
                ['Skin hi',        P.ski],
                ['Skin dk',        P.skd],
                ['Hair',           P.hr],
                ['Jeans',          P.jb],
                ['Jeans dark',     P.jbm],
                ['Shoe',           P.sh],
                ['Outline',        P.o],
              ].map(([label, color]) => (
                <div key={label as string} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 28, height: 28, background: color as string,
                    border: '1px solid #334', borderRadius: 3,
                  }} />
                  <div style={{ fontSize: 9, color: '#556688', textAlign: 'center', lineHeight: 1.2 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spec */}
          <div style={{ background: '#14142a', border: '1px solid #334', borderRadius: 4, padding: 12, fontSize: 10, color: '#556688', lineHeight: 1.8 }}>
            <div style={{ color: '#F4C030', fontWeight: 700, marginBottom: 4 }}>SHEET SPEC</div>
            <div>Format: PNG · RGBA · 256×256px</div>
            <div>Frames: 4 cols (walk) × 4 rows (dir)</div>
            <div>Per frame: 64×64px</div>
            <div>Row 0: Left · Row 1: Right</div>
            <div>Row 2: Front · Row 3: Back</div>
            <div>FPS: 6–8 in-game</div>
          </div>
        </div>
      </div>
    </div>
  );
}
