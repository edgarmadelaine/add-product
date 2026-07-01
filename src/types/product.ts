export interface WooConfig {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  wpUser: string;
  wpAppPassword: string;
}

export interface ProductAttribute {
  name: string;
  values: string;
  /** Images par valeur de couleur (clé = nom de la couleur) */
  colorImages?: Record<string, { showcase: File | null; plans: File[] }>;
}

export interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  brand: BrandOption | null;
  regularPrice: string;
  showcaseImage: File | null;
  planImages: File[];
  attribute1: ProductAttribute | null;
  attribute2: ProductAttribute | null;
}

export interface ParsedAttribute {
  name: string;
  options: string[];
}

export interface BrandOption {
  id: number;
  name: string;
  source: 'taxonomy' | 'attribute';
  taxonomy?: string;
  attributeId?: number;
  attributeName?: string;
}

export function isColorAttribute(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return ['couleur', 'couleurs', 'color', 'colors', 'colour', 'colours'].includes(normalized);
}

export function parseAttributeValues(raw: string): string[] {
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}
