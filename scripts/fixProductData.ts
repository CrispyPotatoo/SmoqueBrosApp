import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyDbbhKlZgIMxEF_V9hYEwje-S5wDkZPsEM',
  authDomain: 'smoquebros-4badf.firebaseapp.com',
  projectId: 'smoquebros-4badf',
  storageBucket: 'smoquebros-4badf.appspot.com',
  messagingSenderId: '404318315259',
  appId: '1:404318315259:web:f14c55165dafca7da6065e',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixProductData() {
  try {
    console.log('Starting product data fix...');
    
    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);
    
    let fixedCount = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      const updates: any = {};
      
      // Fix missing price
      if (data.price === undefined || data.price === null || data.price === '') {
        updates.price = 0;
        console.log(`Fixed missing price for product: ${data.name || docSnapshot.id}`);
      }
      
      // Fix missing stock
      if (data.stock === undefined || data.stock === null || data.stock === '') {
        updates.stock = 0;
        console.log(`Fixed missing stock for product: ${data.name || docSnapshot.id}`);
      }
      
      // Fix missing imageUrl
      if (!data.imageUrl || data.imageUrl.trim() === '') {
        updates.imageUrl = 'https://via.placeholder.com/300x200/f0f0f0/666666?text=No+Image';
        console.log(`Fixed missing imageUrl for product: ${data.name || docSnapshot.id}`);
      }
      
      // Fix missing arrays
      if (!Array.isArray(data.sizes)) {
        updates.sizes = [];
        console.log(`Fixed missing sizes array for product: ${data.name || docSnapshot.id}`);
      }
      
      if (!Array.isArray(data.colors)) {
        updates.colors = [];
        console.log(`Fixed missing colors array for product: ${data.name || docSnapshot.id}`);
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'products', docSnapshot.id), updates);
        fixedCount++;
        console.log(`Updated product: ${data.name || docSnapshot.id}`);
      }
    }
    
    console.log(`✅ Product data fix completed! Fixed ${fixedCount} products.`);
  } catch (error) {
    console.error('❌ Error fixing product data:', error);
  }
}

// Run the fix
fixProductData();
