#!/usr/bin/env python
"""glb-verklein.py — shrink the textures inside a GLB (V9.6, PLAN-V9 §C).

Meshy ships 1024-2048 px PNG textures; on the iPad the pirate is forty pixels tall. This rewrites every embedded image
to at most --px pixels (default 512), JPEG when it has no alpha, and rebuilds the BIN chunk with 4-byte alignment.
Dev-time only (Pillow), not part of the game.  Usage:
    python scripts/glb-verklein.py in.glb out.glb [--px 512] [--kwaliteit 82]
"""
import io
import json
import struct
import sys

from PIL import Image

MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def lees(path):
    data = open(path, 'rb').read()
    magic, version, total = struct.unpack_from('<III', data, 0)
    assert magic == MAGIC and version == 2, 'geen GLB 2'
    off, js, bin_ = 12, None, b''
    while off + 8 <= len(data):
        ln, typ = struct.unpack_from('<II', data, off)
        chunk = data[off + 8:off + 8 + ln]
        if typ == JSON_CHUNK:
            js = json.loads(chunk.decode('utf-8'))
        elif typ == BIN_CHUNK:
            bin_ = chunk
        off += 8 + ln
    return js, bin_


def schrijf(path, js, bin_):
    j = json.dumps(js, separators=(',', ':')).encode('utf-8')
    j += b' ' * (-len(j) % 4)
    b = bin_ + b'\0' * (-len(bin_) % 4)
    total = 12 + 8 + len(j) + 8 + len(b)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', MAGIC, 2, total))
        f.write(struct.pack('<II', len(j), JSON_CHUNK))
        f.write(j)
        f.write(struct.pack('<II', len(b), BIN_CHUNK))
        f.write(b)


def verklein(js, bin_, px, kwaliteit):
    views = js.get('bufferViews', [])
    images = js.get('images', [])
    vervang = {}   # bufferView index -> (bytes, mime)
    for im in images:
        bv = im.get('bufferView')
        if bv is None:
            continue
        v = views[bv]
        raw = bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        pic = Image.open(io.BytesIO(raw))
        w, h = pic.size
        alpha = pic.mode in ('RGBA', 'LA') or (pic.mode == 'P' and 'transparency' in pic.info)
        if alpha:
            band = pic.convert('RGBA').getchannel('A')
            alpha = band.getextrema()[0] < 250
        if max(w, h) > px:
            s = px / max(w, h)
            pic = pic.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
        out = io.BytesIO()
        if alpha:
            pic.convert('RGBA').save(out, 'PNG', optimize=True)
            mime = 'image/png'
        else:
            pic.convert('RGB').save(out, 'JPEG', quality=kwaliteit, optimize=True)
            mime = 'image/jpeg'
        vervang[bv] = (out.getvalue(), mime)
        im['mimeType'] = mime
        print(f'  beeld {w}x{h} {len(raw)//1024} KB -> {pic.size[0]}x{pic.size[1]} {len(out.getvalue())//1024} KB {mime}')
    # rebuild the BIN chunk in the original view order, aligned to 4 bytes
    nieuw = bytearray()
    for i, v in enumerate(views):
        if v.get('buffer', 0) != 0:
            continue
        if i in vervang:
            data = vervang[i][0]
        else:
            data = bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        nieuw += b'\0' * (-len(nieuw) % 4)
        v['byteOffset'] = len(nieuw)
        v['byteLength'] = len(data)
        nieuw += data
    js['buffers'][0]['byteLength'] = len(nieuw)
    return js, bytes(nieuw)


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    px, kw = 512, 82
    if '--px' in argv:
        px = int(argv[argv.index('--px') + 1])
    if '--kwaliteit' in argv:
        kw = int(argv[argv.index('--kwaliteit') + 1])
    js, bin_ = lees(argv[1])
    js, bin_ = verklein(js, bin_, px, kw)
    schrijf(argv[2], js, bin_)
    import os
    print(f'{argv[1]} {os.path.getsize(argv[1])//1024} KB -> {argv[2]} {os.path.getsize(argv[2])//1024} KB')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
