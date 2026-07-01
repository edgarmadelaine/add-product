import { useState } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { ProductForm } from './components/ProductForm';
import type { WooConfig } from './types/product';
import './App.css';

const defaultConfig: WooConfig = {
  siteUrl: '',
  consumerKey: '',
  consumerSecret: '',
  wpUser: '',
  wpAppPassword: '',
};

function App() {
  const [config, setConfig] = useState<WooConfig>(defaultConfig);

  return (
    <div className="app">
      <header className="app-header">
        <h1>WooCommerce — Ajout de produits</h1>
        <p>Formulaire React connecté à l’API REST WooCommerce</p>
      </header>

      <main className="app-main">
        <ConfigPanel config={config} onChange={setConfig} />
        <ProductForm config={config} />
      </main>
    </div>
  );
}

export default App;
