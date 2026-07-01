import type { BrandOption, ParsedAttribute, WooConfig } from '../types/product';
import { isColorAttribute, parseAttributeValues } from '../types/product';

interface WcImage {
  id?: number;
  src?: string;
}

interface WcProductPayload {
  name: string;
  type: 'simple' | 'variable';
  sku?: string;
  description?: string;
  regular_price?: string;
  images?: WcImage[];
  meta_data?: { key: string; value: string }[];
  attributes?: {
    id?: number;
    name: string;
    visible: boolean;
    variation: boolean;
    options: string[];
  }[];
  brands?: { id: number }[];
}

interface WcVariationPayload {
  regular_price: string;
  sku?: string;
  attributes: { name: string; option: string }[];
  image?: WcImage;
}

interface WcVariationBatchResponse {
  create?: { id: number }[];
}

interface WcAttribute {
  id: number;
  name: string;
  slug: string;
}

interface WcAttributeTerm {
  id: number;
  name: string;
  slug: string;
}

interface WpTerm {
  id: number;
  name: string;
  slug: string;
}

interface WpTaxonomy {
  slug: string;
  rest_base?: string;
}

interface WpErrorResponse {
  code?: string;
  message?: string;
}

const BRAND_TAXONOMIES = ['product_brand', 'pwb-brand', 'yith_product_brand', 'brand'];
const BRAND_NAME_PATTERN = /brand|marque/i;
const MAX_VARIATIONS = 100;
const VARIATION_BATCH_SIZE = 25;

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function authQuery(config: WooConfig): string {
  const params = new URLSearchParams({
    consumer_key: config.consumerKey,
    consumer_secret: config.consumerSecret,
  });
  return params.toString();
}

async function wcFetch<T>(
  config: WooConfig,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = import.meta.env.DEV ? '/api/wc' : `${normalizeSiteUrl(config.siteUrl)}/wp-json/wc/v3`;
  const separator = path.includes('?') ? '&' : '?';
  const url = `${base}${path}${separator}${authQuery(config)}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      message = parsed.message ?? body;
    } catch {
      // keep raw body
    }
    throw new Error(`WooCommerce API (${response.status}): ${message}`);
  }

  return response.json() as Promise<T>;
}

async function wpFetch<T>(config: WooConfig, path: string): Promise<T | null> {
  const base = import.meta.env.DEV ? '/api/wp' : `${normalizeSiteUrl(config.siteUrl)}/wp-json/wp/v2`;
  const separator = path.includes('?') ? '&' : '?';
  const url = `${base}${path}${separator}${authQuery(config)}`;

  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) return null;

  return response.json() as Promise<T>;
}

async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<T[]>,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const batch = await fetchPage(page);
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return all;
}

async function fetchAvailableBrandTaxonomies(config: WooConfig): Promise<string[]> {
  const taxonomies = await wpFetch<Record<string, WpTaxonomy>>(config, '/taxonomies');
  if (!taxonomies) return ['product_brand'];

  const availableRoutes = new Set(
    Object.values(taxonomies).flatMap((taxonomy) => [
      taxonomy.slug,
      taxonomy.rest_base,
    ]).filter(Boolean),
  );

  return BRAND_TAXONOMIES.filter((taxonomy) => availableRoutes.has(taxonomy));
}

export async function fetchBrands(config: WooConfig): Promise<BrandOption[]> {
  const brands: BrandOption[] = [];
  const seen = new Set<string>();

  const addBrand = (brand: BrandOption) => {
    const key = `${brand.source}:${brand.id}:${brand.name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    brands.push(brand);
  };

  const brandTaxonomies = await fetchAvailableBrandTaxonomies(config);

  for (const taxonomy of brandTaxonomies) {
    const terms = await fetchAllPages(async (page) => {
      const result = await wpFetch<WpTerm[]>(
        config,
        `/${taxonomy}?per_page=100&page=${page}&hide_empty=false`,
      );
      return result ?? [];
    });

    for (const term of terms) {
      addBrand({
        id: term.id,
        name: term.name,
        source: 'taxonomy',
        taxonomy,
      });
    }
  }

  const attributes = await wcFetch<WcAttribute[]>(config, '/products/attributes?per_page=100');
  const brandAttributes = attributes.filter(
    (attr) => BRAND_NAME_PATTERN.test(attr.name) || BRAND_NAME_PATTERN.test(attr.slug),
  );

  for (const attr of brandAttributes) {
    const terms = await fetchAllPages((page) =>
      wcFetch<WcAttributeTerm[]>(
        config,
        `/products/attributes/${attr.id}/terms?per_page=100&page=${page}`,
      ),
    );

    for (const term of terms) {
      addBrand({
        id: term.id,
        name: term.name,
        source: 'attribute',
        attributeId: attr.id,
        attributeName: attr.name,
      });
    }
  }

  return brands.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function uploadImage(
  config: WooConfig,
  file: File,
): Promise<{ id: number; src: string }> {
  if (!config.wpUser || !config.wpAppPassword) {
    throw new Error(
      'Identifiants WordPress requis pour l’upload d’images (utilisateur + mot de passe application).',
    );
  }

  const base = import.meta.env.DEV ? '/api/wp' : `${normalizeSiteUrl(config.siteUrl)}/wp-json/wp/v2`;
  const formData = new FormData();
  formData.append('file', file, file.name);

  const wpUser = config.wpUser.trim();
  const wpAppPassword = config.wpAppPassword.replace(/[\s\uFEFF\xA0]+/g, '');
  const credentials = btoa(`${wpUser}:${wpAppPassword}`);

  const response = await fetch(`${base}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    let message = bodyText;
    try {
      const parsed = JSON.parse(bodyText) as WpErrorResponse;
      message = parsed.message ?? bodyText;
      if (response.status === 403) {
        message = `${message} Vérifiez que l'utilisateur WordPress "${wpUser}" a le droit d'ajouter des médias et que le mot de passe utilisé est bien un mot de passe d'application WordPress.`;
      }
    } catch {
      // Not a JSON response, use a generic message for HTML errors like 504
      if (bodyText.trim().startsWith('<')) {
        message = `Le serveur a répondu avec une erreur ${response.status} (Gateway Time-out). Cela se produit souvent avec des images volumineuses ou des configurations de serveur lentes.`;
      }
    }
    throw new Error(`Upload image (${response.status}): ${message}`);
  }

  const data = (await response.json()) as { id: number; source_url: string };
  return { id: data.id, src: data.source_url };
}


export async function uploadImages(
  config: WooConfig,
  files: File[],
): Promise<{ id: number; src: string }[]> {
  if (!files || files.length === 0) return [];
  const results: { id: number; src: string }[] = [];
  for (const file of files) {
    if (file.size === 0) continue;
    try {
      const result = await uploadImage(config, file);
      results.push(result);
    } catch (error) {
      console.error(`Échec du téléversement pour le fichier ${file.name}:`, error);
      // On continue avec les autres images même si une échoue
    }
  }
  return results;
}

export function getActiveAttributes(
  attr1: { name: string; values: string } | null,
  attr2: { name: string; values: string } | null,
): ParsedAttribute[] {
  const result: ParsedAttribute[] = [];

  for (const attr of [attr1, attr2]) {
    if (!attr?.name.trim()) continue;
    const options = parseAttributeValues(attr.values);
    if (options.length === 0) continue;
    result.push({ name: attr.name.trim(), options });
  }

  return result;
}

function cartesianProduct(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((combo) => curr.map((value) => [...combo, value])),
    [[]],
  );
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildBrandPayload(brand: BrandOption | null): Pick<WcProductPayload, 'brands' | 'meta_data' | 'attributes'> {
  if (!brand) return {};

  if (brand.source === 'taxonomy') {
    return {
      brands: [{ id: brand.id }],
      meta_data: [{ key: 'brand', value: brand.name }],
    };
  }

  return {
    meta_data: [{ key: 'brand', value: brand.name }],
    attributes: [
      {
        id: brand.attributeId,
        name: brand.attributeName ?? 'Brand',
        visible: true,
        variation: false,
        options: [brand.name],
      },
    ],
  };
}

function resolveVariationImage(
  combo: string[],
  attributes: ParsedAttribute[],
  defaultImage: WcImage | undefined,
  colorImages: Record<string, { showcase: WcImage | undefined; plans: WcImage[] }>,
): WcImage | undefined {
  for (let i = 0; i < attributes.length; i++) {
    if (isColorAttribute(attributes[i].name)) {
      const colorValue = combo[i];
      if (colorImages[colorValue]?.showcase) return colorImages[colorValue].showcase;
    }
  }
  return defaultImage;
}

export async function createSimpleProduct(
  config: WooConfig,
  data: {
    name: string;
    sku: string;
    description: string;
    brand: BrandOption | null;
    regularPrice: string;
    images?: WcImage[];
  },
): Promise<{ id: number; permalink: string }> {
  const brandPayload = buildBrandPayload(data.brand);

  const payload: WcProductPayload = {
    name: data.name,
    type: 'simple',
    sku: data.sku || undefined,
    description: data.description || undefined,
    regular_price: data.regularPrice,
    images: data.images,
    ...brandPayload,
  };

  const product = await wcFetch<{ id: number; permalink: string }>(config, '/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return product;
}

export async function createVariableProduct(
  config: WooConfig,
  data: {
    name: string;
    sku: string;
    description: string;
    brand: BrandOption | null;
    regularPrice: string;
    images?: WcImage[];
    attributes: ParsedAttribute[];
    colorImages?: Record<string, { showcase: WcImage | undefined; plans: WcImage[] }>;
  },
): Promise<{ id: number; permalink: string; variationCount: number }> {
  const brandPayload = buildBrandPayload(data.brand);
  const brandAttributes = brandPayload.attributes ?? [];
  const defaultImage = data.images?.[0];

  const payload: WcProductPayload = {
    name: data.name,
    type: 'variable',
    sku: data.sku || undefined,
    description: data.description || undefined,
    meta_data: brandPayload.meta_data,
    brands: brandPayload.brands,
    images: data.images,
    attributes: [
      ...brandAttributes,
      ...data.attributes.map((attr) => ({
        name: attr.name,
        visible: true,
        variation: true,
        options: attr.options,
      })),
    ],
  };

  const parent = await wcFetch<{ id: number; permalink: string }>(config, '/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const optionSets = data.attributes.map((a) => a.options);
  const combinations = cartesianProduct(optionSets);
  const colorImages = data.colorImages ?? {};

  if (combinations.length > MAX_VARIATIONS) {
    throw new Error(
      `Trop de variations à créer (${combinations.length}). Réduisez les valeurs d’attributs à ${MAX_VARIATIONS} variations maximum.`,
    );
  }

  const variationPayloads: WcVariationPayload[] = combinations.map((combo) => {
    const variationImage = resolveVariationImage(
      combo,
      data.attributes,
      defaultImage,
      colorImages,
    );


    return {
      regular_price: data.regularPrice,
      sku: data.sku ? `${data.sku}-${combo.join('-')}` : undefined,
      attributes: combo.map((value, index) => ({
        name: data.attributes[index].name,
        option: value,
      })),
      image: variationImage,
    };
  });

  let variationCount = 0;
  for (const batch of chunkArray(variationPayloads, VARIATION_BATCH_SIZE)) {
    const result = await wcFetch<WcVariationBatchResponse>(config, `/products/${parent.id}/variations/batch`, {
      method: 'POST',
      body: JSON.stringify({ create: batch }),
    });
    variationCount += result.create?.length ?? batch.length;
  }

  return { ...parent, variationCount };
}

export async function uploadColorImages(
  config: WooConfig,
  attributes: (
    | {
        name: string;
        values: string;
        colorImages?: Record<string, { showcase: File | null; plans: File[] }>;
      }
    | null
  )[],
): Promise<Record<string, { showcase: WcImage | undefined; plans: WcImage[] }>> {
  const uploaded: Record<string, { showcase: WcImage | undefined; plans: WcImage[] }> = {};

  for (const attr of attributes) {
    if (!attr || !isColorAttribute(attr.name) || !attr.colorImages) continue;

    for (const [color, images] of Object.entries(attr.colorImages)) {
      if (!images || uploaded[color]) continue;
      
      const showcaseImage = images.showcase ? await uploadImage(config, images.showcase) : undefined;
      const planImages = await uploadImages(config, images.plans);

      uploaded[color] = {
        showcase: showcaseImage,
        plans: planImages,
      };
    }
  }

  return uploaded;
}
