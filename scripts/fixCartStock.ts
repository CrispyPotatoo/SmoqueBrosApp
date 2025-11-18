import { db } from '../constants/firebaseConfig';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Script to fix stock values in existing cart items
 * This updates all cart items with the correct stock from the products collection
 */

async function fixCartStock() {
  try {
    console.log('🔧 Starting cart stock fix...\n');

    // Get all cart documents (user carts)
    const cartsRef = collection(db, 'carts');
    const cartsSnapshot = await getDocs(cartsRef);

    console.log(`📦 Found ${cartsSnapshot.size} user carts\n`);

    let totalItemsFixed = 0;
    let totalItemsProcessed = 0;

    // Loop through each user's cart
    for (const cartDoc of cartsSnapshot.docs) {
      const userId = cartDoc.id;
      console.log(`\n👤 Processing cart for user: ${userId}`);

      // Get items subcollection for this user
      const itemsRef = collection(db, 'carts', userId, 'items');
      const itemsSnapshot = await getDocs(itemsRef);

      console.log(`   📋 Found ${itemsSnapshot.size} items in cart`);

      // Loop through each cart item
      for (const itemDoc of itemsSnapshot.docs) {
        totalItemsProcessed++;
        const itemData = itemDoc.data();
        const productId = itemData.product_id;

        if (!productId) {
          console.log(`   ⚠️  Item ${itemDoc.id} has no product_id, skipping`);
          continue;
        }

        // Get the product from products collection
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);

        if (!productDoc.exists()) {
          console.log(`   ⚠️  Product ${productId} not found, skipping`);
          continue;
        }

        const productData = productDoc.data();
        const correctStock = productData.stock || 0;
        const currentStock = itemData.stock || 0;

        // Update if stock is different
        if (currentStock !== correctStock) {
          const itemRef = doc(db, 'carts', userId, 'items', itemDoc.id);
          await updateDoc(itemRef, {
            stock: correctStock
          });

          console.log(`   ✅ Updated "${itemData.name}": ${currentStock} → ${correctStock}`);
          totalItemsFixed++;
        } else {
          console.log(`   ✓ "${itemData.name}" already has correct stock: ${correctStock}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Cart stock fix completed!`);
    console.log(`📊 Total items processed: ${totalItemsProcessed}`);
    console.log(`🔧 Total items fixed: ${totalItemsFixed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error fixing cart stock:', error);
    throw error;
  }
}

// Run the script
fixCartStock()
  .then(() => {
    console.log('\n✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
