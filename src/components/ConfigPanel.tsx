import { useEffect, useState } from 'react';
import type { WooConfig } from '../types/product';

const STORAGE_KEY = 'wc-product-form-config';

interface ConfigPanelProps {
  config: WooConfig;
  onChange: (config: WooConfig) => void;
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        onChange(JSON.parse(saved) as WooConfig);
      } catch {
        // ignore invalid storage
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setOpen(false);
  };

  return (
    <section className="config-panel">
      <button type="button" className="btn btn--ghost config-toggle" onClick={() => setOpen(!open)}>
        {open ? 'Masquer' : 'Configurer'} l’API WooCommerce
      </button>

      {open && (
        <div className="config-fields">
          <div className="field">
            <label htmlFor="siteUrl">URL du site</label>
            <input
              id="siteUrl"
              type="url"
              placeholder="https://votre-boutique.com"
              value={config.siteUrl}
              onChange={(e) => onChange({ ...config, siteUrl: e.target.value })}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="consumerKey">Consumer Key</label>
              <input
                id="consumerKey"
                type="text"
                value={config.consumerKey}
                onChange={(e) => onChange({ ...config, consumerKey: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="consumerSecret">Consumer Secret</label>
              <input
                id="consumerSecret"
                type="password"
                value={config.consumerSecret}
                onChange={(e) => onChange({ ...config, consumerSecret: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="wpUser">Utilisateur WordPress (upload images)</label>
              <input
                id="wpUser"
                type="text"
                value={config.wpUser}
                onChange={(e) => onChange({ ...config, wpUser: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="wpAppPassword">Mot de passe application</label>
              <input
                id="wpAppPassword"
                type="password"
                value={config.wpAppPassword}
                onChange={(e) => onChange({ ...config, wpAppPassword: e.target.value })}
              />
            </div>
          </div>
          <span className="hint">
            Pour les images, utilisez un compte WordPress autorisé à ajouter des médias et son mot de passe d'application. Les clés WooCommerce seules ne suffisent pas.
          </span>
          <button type="button" className="btn btn--primary" onClick={save}>
            Enregistrer la configuration
          </button>
        </div>
      )}
    </section>
  );
}
