import { createClient } from '@supabase/supabase-js';

// Your Supabase credentials
const SUPABASE_URL = 'https://pfwazxrrwvltxwmevmdk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmd2F6eHJyd3ZsdHh3bWV2bWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTU3MDQsImV4cCI6MjA3NTczMTcwNH0.eK-AOD9Xv1eTihs63YGcEozDf3x8A9uYOf0q8UzxuK4';

async function testConnection() {
  console.log('🔧 Testing Supabase connection...');
  console.log('📍 URL:', SUPABASE_URL);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Test 1: List buckets
    console.log('\n📦 Test 1: Listing storage buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    console.log('✅ Buckets found:', buckets?.map(b => b.name));
    
    // Test 2: Check if profile_images bucket exists
    const profileBucket = buckets?.find(b => b.name === 'profile_images');
    if (profileBucket) {
      console.log('✅ profile_images bucket exists!');
      console.log('   - Public:', profileBucket.public);
      console.log('   - ID:', profileBucket.id);
    } else {
      console.log('❌ profile_images bucket NOT found!');
      console.log('   Please create it in Supabase Dashboard:');
      console.log('   1. Go to https://supabase.com/dashboard/project/pfwazxrrwvltxwmevmdk/storage/buckets');
      console.log('   2. Click "New bucket"');
      console.log('   3. Name: profile_images');
      console.log('   4. Make it PUBLIC');
    }
    
    // Test 3: Try to upload a test file (if bucket exists)
    if (profileBucket) {
      console.log('\n📤 Test 3: Uploading test file...');
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const { data, error } = await supabase.storage
        .from('profile_images')
        .upload('test/test.txt', testData.buffer, {
          contentType: 'text/plain',
          upsert: true,
        });
      
      if (error) {
        console.error('❌ Upload error:', error);
      } else {
        console.log('✅ Upload successful!', data);
        
        // Clean up test file
        await supabase.storage.from('profile_images').remove(['test/test.txt']);
        console.log('🧹 Test file cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testConnection();
