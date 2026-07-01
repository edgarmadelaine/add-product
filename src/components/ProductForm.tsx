import { useState } from 'react';
import {
  createSimpleProduct,
  createVariableProduct,
  getActiveAttributes,
  uploadColorImages,
  uploadImage,
  uploadImages,
} from '../api/woocommerce';
import type { ProductFormData, WooConfig } from '../types/product';
import { AttributeFields } from './AttributeFields';
import { BrandSelect } from './BrandSelect';
import { ImageDropzone } from './ImageDropzone';
import { MultiImageDropzone } from './MultiImageDropzone';

const initialForm: ProductFormData = {
  name: '',
  sku: '',
  description: '',
  brand: null,
  regularPrice: '',
  showcaseImage: null,
  planImages: [],
  attribute1: null,
  attribute2: null,
};

interface ProductFormProps {
  config: WooConfig;
}

export function ProductForm({ config }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const update = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!config.siteUrl || !config.consumerKey || !config.consumerSecret) {
      return 'Configurez l’URL du site et les clés API WooCommerce.';
    }
    if (!form.name.trim()) return 'Le nom du produit est requis.';
    if (!form.regularPrice.trim()) return 'Le prix régulier est requis.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const error = validate();
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }

    setLoading(true);

    try {
      const showcaseImagePayload = form.showcaseImage
        ? await uploadImage(config, form.showcaseImage)
        : undefined;
      
      const planImagesPayload = await uploadImages(config, form.planImages);

      const images = [showcaseImagePayload, ...planImagesPayload]
        .filter(Boolean)
        .map((p) => ({ id: p!.id, src: p!.src }));

      const attributes = getActiveAttributes(form.attribute1, form.attribute2);
      const colorImages = await uploadColorImages(config, [form.attribute1, form.attribute2]);

      if (attributes.length === 0) {
        const product = await createSimpleProduct(config, {
          name: form.name.trim(),
          sku: form.sku.trim(),
          description: form.description.trim(),
          brand: form.brand,
          regularPrice: form.regularPrice.trim(),
          images,
        });

        setMessage({
          type: 'success',
          text: `Produit simple créé (ID ${product.id}).`,
        });
      } else {
        const product = await createVariableProduct(config, {
          name: form.name.trim(),
          sku: form.sku.trim(),
          description: form.description.trim(),
          brand: form.brand,
          regularPrice: form.regularPrice.trim(),
          images,
          attributes,
          colorImages,
        });

        const attrSummary = attributes
          .map((a) => `${a.name}: ${a.options.join(', ')}`)
          .join(' · ');
        const colorImageCount = Object.keys(colorImages).length;

        setMessage({
          type: 'success',
          text: `Produit variable créé (ID ${product.id}) avec ${product.variationCount} variation(s). Attributs: ${attrSummary}${colorImageCount > 0 ? ` · ${colorImageCount} image(s) couleur assignée(s)` : ''}`,
        });
      }

      setForm(initialForm);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erreur inconnue.',
      });
    } finally {
      setLoading(false);
    }
  };

  const activeAttributes = getActiveAttributes(form.attribute1, form.attribute2);
  const productType =
    activeAttributes.length === 0
      ? 'simple'
      : `variable (${activeAttributes.length} attribut${activeAttributes.length > 1 ? 's' : ''})`;

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Ajouter un produit</h2>
        <span className="badge">Type: {productType}</span>
      </div>

      <div className="field">
        <label htmlFor="name">Nom du produit *</label>
        <input
          id="name"
          type="text"
          required
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="sku">SKU</label>
          <input
            id="sku"
            type="text"
            value={form.sku}
            onChange={(e) => update('sku', e.target.value)}
          />
        </div>
        <BrandSelect
          config={config}
          value={form.brand}
          onChange={(brand) => update('brand', brand)}
        />
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="regularPrice">Prix régulier *</label>
        <input
          id="regularPrice"
          type="text"
          inputMode="decimal"
          placeholder="29.99"
          required
          value={form.regularPrice}
          onChange={(e) => update('regularPrice', e.target.value)}
        />
      </div>

      <ImageDropzone
        label="Image de vitrine"
        file={form.showcaseImage}
        onChange={(file) => update('showcaseImage', file)}
      />

      <MultiImageDropzone
        files={form.planImages}
        onChange={(files) => update('planImages', files)}
      />

      <div className="attributes-section">
        <h3>Attributs (optionnels)</h3>
        <p className="muted">
          Sans attribut → produit simple. Avec au moins un attribut → produit variable avec
          variations pour chaque combinaison de valeurs. Nommez un attribut « Couleur » pour
          ajouter une image par couleur.
        </p>
        <AttributeFields
          label="Attribut 1"
          attribute={form.attribute1}
          onChange={(attr) => update('attribute1', attr)}
        />
        <AttributeFields
          label="Attribut 2"
          attribute={form.attribute2}
          onChange={(attr) => update('attribute2', attr)}
        />
      </div>

      {message && (
        <div className={`alert alert--${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <button type="submit" className="btn btn--primary btn--large" disabled={loading}>
        {loading ? 'Création en cours…' : 'Créer le produit'}
      </button>
    </form>
  );
}
