
// To run it, execute: npx ts-node -O '{\"module\": \"commonjs\"}' scripts/seedVapeProducts.ts

import { addDoc, collection } from 'firebase/firestore';
import { db } from '../constants/firebaseConfig'; // Ensure this path is correct

// --- Configuration ---
const VAPE_PRODUCTS_COLLECTION = 'vape_products';

// --- Product Data ---
// IMPORTANT: You need to replace the placeholder 'imageUrl' values with the public URLs of your product images.
const vapeProducts = [
  {
    name: 'Hannya',
    price: 2500.0,
    description: 'A powerful and stylish vape mod inspired by the traditional Japanese Hannya mask.',
    category: 'Mod',
    imageUrl: 'https://example.com/hannya.jpg', // REPLACE THIS URL
    stock: 100,
    sizes: ['N/A'],
    colors: [],
    rating: 4.7,
    reviews: 150,
  },
  {
    name: 'Argus G2',
    price: 1650.0,
    description: 'The Argus G2 continues to deliver the smooth taste and feel of the Argus G, while offering enhanced interactive features.',
    category: 'Pod',
    imageUrl: 'https://example.com/argus_g2.png', // REPLACE THIS URL
    stock: 100,
    sizes: ['N/A'],
    colors: [],
    rating: 4.8,
    reviews: 200,
  },
  {
    name: 'Argus XT',
    price: 3200.0,
    description: 'With its rugged design and powerful output, the Argus XT is built for the adventurous vaper.',
    category: 'Mod',
    imageUrl: 'https://example.com/argus_xt.png', // REPLACE THIS URL
    stock: 100,
    sizes: ['N/A'],
    colors: [],
    rating: 4.9,
    reviews: 180,
  },
  {
    name: 'Chillax',
    price: 550.0,
    description: 'Enjoy a relaxing vape experience with Chillax disposable vapes, available in a variety of flavors.',
    category: 'Disposable',
    imageUrl: 'https://example.com/chillax.png', // REPLACE THIS URL
    stock: 200,
    sizes: ['N/A'],
    colors: [],
    flavors: ['VISTA S.I', 'VISTA W.S', 'VISTA I.L', 'VISTA G.B', 'VISTA W.I', 'VISTA I.M'],
    rating: 4.5,
    reviews: 300,
  },
  {
    name: 'Odos Veyron',
    price: 2800.0,
    description: 'Experience the peak of vaping technology with the sleek and powerful Odos Veyron.',
    category: 'Mod',
    imageUrl: 'https://example.com/odos_veyron.png', // REPLACE THIS URL
    stock: 100,
    sizes: ['N/A'],
    colors: [],
    rating: 4.6,
    reviews: 120,
  },
  {
    name: 'X Forge',
    price: 1800.0,
    description: 'Forge your own path with the X Forge pod system, known for its robust build and flavor production.',
    category: 'Pod',
    imageUrl: 'https://example.com/x_forge.png', // REPLACE THIS URL
    stock: 150,
    sizes: ['N/A'],
    colors: [],
    flavors: ['B1G BLACK', 'B1G RIZZ', 'B1G FROST', 'B1G SPARKLE'],
    rating: 4.7,
    reviews: 250,
  },
  {
    name: 'X Ultra',
    price: 2200.0,
    description: 'The X Ultra offers an ultra-premium vaping experience with its advanced features and elegant design.',
    category: 'Pod',
    imageUrl: 'https://example.com/x_ultra.png', // REPLACE THIS URL
    stock: 130,
    sizes: ['N/A'],
    colors: [],
    flavors: ['Morning Garden', 'Summer Dew', 'Violet Stream', 'Wild Fragrance', 'Bubble Dream', 'Cloud Spring'],
    rating: 4.8,
    reviews: 280,
  },
];

// --- Seeding Function ---
const seedDatabase = async () => {
  console.log('Starting to seed the database...');
  const productsCollectionRef = collection(db, VAPE_PRODUCTS_COLLECTION);

  try {
    for (const product of vapeProducts) {
      await addDoc(productsCollectionRef, product);
      console.log(`Added product: ${product.name}`);
    }
    console.log('\nSeeding complete! Your vape products have been added.');
    console.log(`Total products added: ${vapeProducts.length}`);
  } catch (error) {
    console.error('Error seeding the database:', error);
    console.log('\nSeeding failed. Please check your Firebase configuration and permissions.');
  }
};

// --- Run the Script ---
seedDatabase();
