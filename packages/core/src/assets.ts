/** Curated Unsplash photography. Swapped for Supabase Storage URLs when the backend lands. */
const u = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const EXTERIORS = [
  "1600596542815-ffad4c1539a9",
  "1600585154340-be6161a56a0c",
  "1564013799919-ab600027ffc6",
  "1512917774080-9991f1c4c750",
  "1613490493576-7fde63acd811",
  "1570129477492-45c003edd2be",
  "1568605114967-8130f3a36994",
  "1580587771525-78b9dba3b914",
  "1605276374104-dee2a0ed3cd6",
  "1600047509807-ba8f99d2cdde",
  "1545324418-cc1a3fa10c00",
  "1574362848149-11496d93a7c7",
  "1583608205776-bfd35f0d9f83",
  "1599809275671-b5942cabc7a2",
  "1625602812206-5ec545ca1231",
  "1576941089067-2de3c901e126",
].map((id) => u(id));

export const INTERIORS = [
  "1600607687939-ce8a6c25118c",
  "1600566753190-17f0baa2a6c3",
  "1502672260266-1c1ef2d93688",
  "1522708323590-d24dbb6b0267",
  "1560448204-e02f11c3d0e2",
  "1493809842364-78817add7ffb",
  "1484154218962-a197022b5858",
  "1556909114-f6e7ad7d3136",
  "1505691938895-1758d7feb511",
  "1540518614846-7eded433c457",
  "1552321554-5fefe8c9ef14",
  "1618221195710-dd6b41faaea6",
  "1586023492125-27b2c045efd7",
  "1600210492486-724fe5c67fb0",
  "1600573472550-8090b5e0745e",
  "1616594039964-ae9021a400a0",
].map((id) => u(id));

/** Deterministic gallery: 1 exterior + 4 interiors, rotated by seed. */
export function galleryFor(seed: number) {
  const ext = EXTERIORS[seed % EXTERIORS.length];
  const ints = Array.from({ length: 4 }, (_, i) => INTERIORS[(seed * 3 + i * 5) % INTERIORS.length]);
  return [ext, ...ints];
}

export const HERO_IMAGE = u("1600596542815-ffad4c1539a9", 2000);
export const DIASPORA_IMAGE = u("1613490493576-7fde63acd811", 1600);
export const LANDLORD_IMAGE = u("1600585154340-be6161a56a0c", 1600);
