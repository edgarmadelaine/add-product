# WooCommerce Product Form

Cette application React + TypeScript permet de créer rapidement des produits WooCommerce depuis un formulaire web. Elle prend en charge les produits simples et variables, l’upload d’images, les attributs, ainsi que la sélection d’une marque depuis les taxonomies ou attributs WooCommerce/WordPress.

## Fonctionnalités

- Connexion à une boutique WooCommerce via l’URL du site et les clés API
- Création de produits simples ou variables
- Téléchargement d’images de vitrine et de galerie
- Gestion d’attributs et de variations
- Sélection de marque depuis les taxonomies ou attributs disponibles

## Stack technique

- React 19
- TypeScript
- Vite
- WooCommerce REST API

## Prérequis

- Node.js 20 ou plus
- npm

## Installation

```bash
git clone https://github.com/edgarmadelaine/add-product.git
cd add-product
npm install
```

## Démarrage en local

```bash
npm run dev
```

Puis ouvrez l’URL affichée par Vite dans votre navigateur.

## Construction de production

```bash
npm run build
```

## Utilisation

1. Renseignez l’URL de votre boutique WooCommerce.
2. Ajoutez votre consumer key et votre consumer secret.
3. Remplissez les informations du produit.
4. Ajoutez des images et des attributs si nécessaire.
5. Envoyez le formulaire pour créer le produit dans WooCommerce.

> Les identifiants WooCommerce sont saisis dans l’interface et ne doivent jamais être commités dans le dépôt.

## Déploiement

Le projet est prêt à être publié sur GitHub et peut ensuite être déployé sur Vercel, Netlify ou tout autre hébergeur statique compatible Vite.
