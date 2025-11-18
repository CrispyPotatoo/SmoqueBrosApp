import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pfwazxrrwvltxwmevmdk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmd2F6eHJyd3ZsdHh3bWV2bWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTU3MDQsImV4cCI6MjA3NTczMTcwNH0.eK-AOD9Xv1eTihs63YGcEozDf3x8A9uYOf0q8UzxuK4';

async function testUpload() {
  console.log('🔧 Testing direct upload to profile_images bucket...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Create test data
    const testUserId = 'test_user_123';
    const testData = new Uint8Array([1, 2, 3, 4, 5]);
    const fileName = `profile_${testUserId}_${Date.now()}.txt`;
    const filePath = `${testUserId}/${fileName}`;
    
    console.log('📤 Uploading test file to:', filePath);
    
    const { data, error } = await supabase.storage
      .from('profile_images')
      .upload(filePath, testData.buffer, {
        contentType: 'text/plain',
        upsert: true,
      });
    
    if (error) {
      console.error('❌ Upload failed:', error);
      console.error('   Error message:', error.message);
      console.error('   Error name:', error.name);
      
      if (error.message.includes('new row violates row-level security')) {
        console.log('\n⚠️  SOLUTION: You need to add Storage Policies!');
        console.log('   Go to: https://supabase.com/dashboard/project/pfwazxrrwvltxwmevmdk/storage/policies');
        console.log('   Click on "profile_images" bucket');
        console.log('   Add these policies:');
        console.log('   1. INSERT policy: Allow public uploads');
        console.log('   2. SELECT policy: Allow public reads');
        console.log('   3. DELETE policy: Allow authenticated users to delete their own files');
      }
      
      return;
    }
    
    console.log('✅ Upload successful!', data);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile_images')
      .getPublicUrl(filePath);
    
    console.log('✅ Public URL:', urlData.publicUrl);
    
    // Clean up
    await supabase.storage.from('profile_images').remove([filePath]);
    console.log('🧹 Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUpload();
