import { useEffect, useRef, useState } from 'react';
import type { BrandOption, WooConfig } from '../types/product';
import { fetchBrands } from '../api/woocommerce';

interface BrandSelectProps {
  config: WooConfig;
  value: BrandOption | null;
  onChange: (brand: BrandOption | null) => void;
}

export function BrandSelect({ config, value, onChange }: BrandSelectProps) {
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.name ?? '');
  const containerRef = useRef<HTMLDivElement>(null);

  const canFetch = Boolean(config.siteUrl && config.consumerKey && config.consumerSecret);

  useEffect(() => {
    if (!canFetch) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchBrands(config)
      .then((list) => {
        if (!cancelled) setBrands(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger les marques.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config.siteUrl, config.consumerKey, config.consumerSecret, canFetch]);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value?.name ?? '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const selectBrand = (brand: BrandOption) => {
    onChange(brand);
    setQuery(brand.name);
    setOpen(false);
  };

  const clearBrand = () => {
    onChange(null);
    setQuery('');
  };

  return (
    <div className="field brand-select" ref={containerRef}>
      <label htmlFor="brand-search">Marque (Brand)</label>
      <div className="brand-select__input-wrap">
        <input
          id="brand-search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={loading ? 'Chargement des marques…' : 'Rechercher une marque…'}
          value={query}
          disabled={!canFetch}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onChange(null);
          }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button type="button" className="brand-select__clear" onClick={clearBrand} aria-label="Effacer">
            ×
          </button>
        )}
      </div>

      {!canFetch && (
        <span className="hint">Configurez l’API WooCommerce pour charger les marques.</span>
      )}
      {error && <span className="hint hint--error">{error}</span>}

      {open && canFetch && !loading && (
        <ul className="brand-select__list" role="listbox">
          {filtered.length === 0 ? (
            <li className="brand-select__empty">Aucune marque trouvée</li>
          ) : (
            filtered.map((brand) => (
              <li key={`${brand.source}-${brand.id}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.id === brand.id && value?.source === brand.source}
                  className={`brand-select__option ${value?.id === brand.id && value?.source === brand.source ? 'brand-select__option--selected' : ''}`}
                  onClick={() => selectBrand(brand)}
                >
                  {brand.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
