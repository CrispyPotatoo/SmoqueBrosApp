const admin = require('firebase-admin');

// IMPORTANT: You need to download your service account key from the Firebase console
// and place it in the root of your project as 'serviceAccountKey.json'.
// Go to Project Settings > Service accounts > Generate new private key
const serviceAccount = require('../serviceAccountKey.json');

// --- Product Data ---
const productsData = [
  {
    name: "Voopoo Argus G2",
    category: "Pods",
    description: "A sleek 1000 mAh pod kit with 3 ml capacity.",
    price: 1395,
    imageUrl: "https://i.postimg.cc/y867sfhw/argus-g2.webp"
  },
  {
    name: "Voopoo Argus XT",
    category: "Mods",
    description: "Mod kit with up to 100W output and UFORCE-L tank.",
    price: 1500,
    imageUrl: "https://cdn.shopify.com/s/files/1/0274/3001/8782/products/voopoo-argus-xt-100w-kit-silver-carbon-fiber.jpg"
  },
  {
    name: "Chillax",
    category: "Disposable",
    description: "Long-lasting disposable vape with smooth flavor delivery.",
    price: 550,
    imageUrl: "https://i.postimg.cc/rm4kQ7ct/chillax.png"
  },
  {
    name: "Hannya Nano",
    category: "Pods",
    description: "Compact pod system with refillable cartridge and vibrant designs.",
    price: 1200,
    imageUrl: "https://i.postimg.cc/RhQzzfWS/hannya.webp"
  },
  {
    name: "Odos Veyron",
    category: "Pods",
    description: "Odos Veyron DT, stylish and powerful.",
    price: 1799,
    imageUrl: "https://i.postimg.cc/X74bk2Pp/odos-veyron.png"
  },
  {
    name: "X-Forge",
    category: "Disposable",
    description: "10ml disposable vape with up to 10,000 puffs, 12mg nicotine.",
    price: 500,
    imageUrl: "https://i.postimg.cc/Dy6KjrV5/x-forge.png"
  },
  {
    name: "X-Ultra",
    category: "Pods",
    description: "Device and pods offering 10ml capacity and 10,000 puffs.",
    price: 450,
    imageUrl: "https://i.postimg.cc/t4mGy94x/x-ultra.png"
  }
];

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Make sure to replace this with your actual database URL from the Firebase console
  databaseURL: 'https://smoquebros-4badf.firebaseio.com'
});

const db = admin.firestore();

const clearCollection = async (collectionPath: string) => {
  const collectionRef = db.collection(collectionPath);
  const querySnapshot = await collectionRef.get();

  if (querySnapshot.empty) {
    console.log(`Collection '${collectionPath}' is already empty.`);
    return;
  }

  const batch = db.batch();
  querySnapshot.docs.forEach((doc: any) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Successfully cleared ${querySnapshot.size} documents from '${collectionPath}'.`);
};

const seedDatabase = async () => {
  try {
    console.log('--- Starting Database Seed ---');
    
    // 1. Clear the existing products collection
    await clearCollection('products');

    // 2. Add the new products
    console.log('Adding new products...');
    const productsCollection = db.collection('products');
    for (const product of productsData) {
      await productsCollection.add(product);
      console.log(`  Added: ${product.name}`);
    }

    console.log('\nDatabase seeding completed successfully!');
    process.exit(0); // Exit successfully
  } catch (error) {
    console.error('\nError seeding database:', error);
    process.exit(1); // Exit with error
  }
};

seedDatabase();
