import type { ProductAttribute } from '../types/product';
import { isColorAttribute, parseAttributeValues } from '../types/product';
import { ImageDropzone } from './ImageDropzone';
import { MultiImageDropzone } from './MultiImageDropzone';

interface AttributeFieldsProps {
  label: string;
  attribute: ProductAttribute | null;
  onChange: (attribute: ProductAttribute | null) => void;
}

const emptyAttribute: ProductAttribute = { name: '', values: '' };

function syncColorImages(
  attribute: ProductAttribute,
  values: string[],
): Record<string, { showcase: File | null; plans: File[] }> {
  const existing = attribute.colorImages ?? {};
  const next: Record<string, { showcase: File | null; plans: File[] }> = {};
  for (const value of values) {
    next[value] = existing[value] ?? { showcase: null, plans: [] };
  }
  return next;
}

export function AttributeFields({ label, attribute, onChange }: AttributeFieldsProps) {
  const current = attribute ?? emptyAttribute;
  const enabled = attribute !== null;
  const colorValues = isColorAttribute(current.name) ? parseAttributeValues(current.values) : [];
  const showColorImages = enabled && colorValues.length > 0;

  const updateColorShowcaseImage = (color: string, file: File | null) => {
    onChange({
      ...current,
      colorImages: {
        ...(current.colorImages ?? {}),
        [color]: { ...(current.colorImages?.[color] ?? { showcase: null, plans: [] }), showcase: file },
      },
    });
  };

  const updateColorPlanImages = (color: string, files: File[]) => {
    onChange({
      ...current,
      colorImages: {
        ...(current.colorImages ?? {}),
        [color]: { ...(current.colorImages?.[color] ?? { showcase: null, plans: [] }), plans: files },
      },
    });
  };

  return (
    <fieldset className="attribute-block">
      <legend>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked ? { name: '', values: '' } : null)}
          />
          {label}
        </label>
      </legend>

      {enabled && (
        <div className="attribute-fields">
          <div className="field">
            <label htmlFor={`${label}-name`}>Nom de l’attribut</label>
            <input
              id={`${label}-name`}
              type="text"
              placeholder="Ex: Taille, Couleur…"
              value={current.name}
              onChange={(e) => {
                const name = e.target.value;
                const values = parseAttributeValues(current.values);
                const next: ProductAttribute = { ...current, name };
                if (isColorAttribute(name) && values.length > 0) {
                  next.colorImages = syncColorImages(next, values);
                } else {
                  delete next.colorImages;
                }
                onChange(next);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor={`${label}-values`}>Valeurs (séparées par des virgules)</label>
            <input
              id={`${label}-values`}
              type="text"
              placeholder="Ex: S, M, L, XL — ou Rouge, Bleu, Vert pour Couleur"
              value={current.values}
              onChange={(e) => {
                const values = parseAttributeValues(e.target.value);
                const next: ProductAttribute = { ...current, values: e.target.value };
                if (isColorAttribute(current.name)) {
                  next.colorImages = syncColorImages(next, values);
                }
                onChange(next);
              }}
            />
            <span className="hint">
              Pour un produit variable, chaque valeur génère une variation (ex: S, M, L).
              {isColorAttribute(current.name) && ' Les couleurs peuvent avoir une image dédiée ci-dessous.'}
            </span>
          </div>

          {showColorImages && (
            <div className="color-images-section">
              <h4>Images par couleur</h4>
              <p className="muted">
                Ajoutez une image de vitrine et des images de plan pour chaque couleur.
              </p>
              <div className="color-images-grid">
                {colorValues.map((color) => (
                  <div key={color} className="color-image-item">
                    <span className="color-image-label">{color}</span>
                    <ImageDropzone
                      compact
                      label="Vitrine"
                      file={current.colorImages?.[color]?.showcase ?? null}
                      onChange={(file) => updateColorShowcaseImage(color, file)}
                    />
                    <MultiImageDropzone
                      compact
                      label="Plans"
                      files={current.colorImages?.[color]?.plans ?? []}
                      onChange={(files) => updateColorPlanImages(color, files)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}

