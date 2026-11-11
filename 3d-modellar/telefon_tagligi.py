"""Telefon tagligi (podstavka) — 3D printer uchun STL yaratadi.

Ishlatish: python3 telefon_tagligi.py
O'lchamlarni pastdagi parametrlarda o'zgartirish mumkin (millimetrda).
"""
import math
import os
import struct

KENGLIK = 70.0       # tagligining eni
QALINLIK = 4.0       # devor qalinligi
TAG_UZUNLIGI = 80.0  # pastki asos uzunligi
SUYANCHIQ = 90.0     # telefon suyanadigan qism uzunligi
BURCHAK = 65.0       # suyanchiq qiyaligi (gradus)
LAB_BALANDLIGI = 12.0  # telefon sirpanib ketmasligi uchun old to'siq
TELEFON_QALINLIGI = 12.0  # to'siq bilan suyanchiq orasidagi joy (g'ilof bilan)


def profil():
    """Yon tomondan ko'rinish: yopiq ko'pburchak (soat strelkasiga teskari)."""
    a = math.radians(BURCHAK)
    t = QALINLIK
    x0 = 10.0  # suyanchiq asosi joyi
    bx, by = x0 + SUYANCHIQ * math.cos(a), SUYANCHIQ * math.sin(a)
    nx, ny = math.sin(a) * t, -math.cos(a) * t  # suyanchiq qalinligi yo'nalishi
    lab_x = x0 - TELEFON_QALINLIGI - t
    return [
        (lab_x, 0), (TAG_UZUNLIGI, 0), (TAG_UZUNLIGI, t),
        (x0 + nx + (t - ny) / math.tan(a), t),
        (bx + nx, by + ny), (bx, by),
        (x0 + t / math.tan(a), t), (lab_x + t, t), (lab_x + t, LAB_BALANDLIGI), (lab_x, LAB_BALANDLIGI),
    ]


def uchburchaklarga(poly):
    """Ear clipping: ko'pburchakni uchburchaklarga bo'lish."""
    def cross(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    def ichida(p, a, b, c):
        return cross(a, b, p) >= 0 and cross(b, c, p) >= 0 and cross(c, a, p) >= 0
    idx = list(range(len(poly))); tris = []
    while len(idx) > 3:
        for i in range(len(idx)):
            ia, ib, ic = idx[i-1], idx[i], idx[(i+1) % len(idx)]
            a, b, c = poly[ia], poly[ib], poly[ic]
            if cross(a, b, c) <= 0: continue
            if any(ichida(poly[j], a, b, c) for j in idx if j not in (ia, ib, ic)): continue
            tris.append((ia, ib, ic)); idx.pop(i); break
        else:
            raise RuntimeError('profil uchburchaklanmadi')
    tris.append(tuple(idx))
    return tris


def stl(poly, w, path):
    P = [(x, 0.0, y) for x, y in poly]; Q = [(x, w, y) for x, y in poly]
    faces = []
    for a, b, c in uchburchaklarga(poly):
        faces.append((P[a], P[c], P[b])); faces.append((Q[a], Q[b], Q[c]))
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        faces.append((P[i], P[j], Q[j])); faces.append((P[i], Q[j], Q[i]))
    with open(path, 'wb') as f:
        f.write(b'Telefon tagligi'.ljust(80, b' ')); f.write(struct.pack('<I', len(faces)))
        for v0, v1, v2 in faces:
            u = [v1[k]-v0[k] for k in range(3)]; v = [v2[k]-v0[k] for k in range(3)]
            nrm = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
            L = math.sqrt(sum(c*c for c in nrm)) or 1
            f.write(struct.pack('<12fH', *(c / L for c in nrm), *v0, *v1, *v2, 0))
    return len(faces)


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'telefon_tagligi.stl')
    print(f'{stl(profil(), KENGLIK, out)} ta uchburchak -> {out}')
