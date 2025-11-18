import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyDbbhKlZgIMxEF_V9hYEwje-S5wDkZPsEM',
  authDomain: 'smoquebros-4badf.firebaseapp.com',
  projectId: 'smoquebros-4badf',
  storageBucket: 'smoquebros-4badf.appspot.com',
  messagingSenderId: '404318315259',
  appId: '1:404318315259:web:f14c55165dafca7da6065e',
  measurementId: 'G-QMGV111J4C',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateVoopooImage() {
  try {
    console.log('Searching for Voopoo Argus XT product...');
    
    // Query for the product by name
    const q = query(collection(db, 'products'), where('name', '==', 'Voopoo Argus XT'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('Voopoo Argus XT product not found!');
      return;
    }
    
    // Update the image URL
    const newImageUrl = 'https://cdn.shopify.com/s/files/1/0274/3001/8782/products/voopoo-argus-xt-100w-kit-silver-carbon-fiber.jpg';
    
    for (const docSnapshot of querySnapshot.docs) {
      console.log(`Updating product: ${docSnapshot.data().name}`);
      
      await updateDoc(docSnapshot.ref, {
        image: newImageUrl,
        imageUrl: newImageUrl, // Update both fields for compatibility
      });
      
      console.log('✅ Successfully updated Voopoo Argus XT image!');
    }
    
  } catch (error) {
    console.error('Error updating product:', error);
  }
}

// Run the update
updateVoopooImage();
