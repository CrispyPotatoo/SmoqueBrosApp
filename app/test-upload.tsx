import { supabase } from '@/constants/supabaseConfig';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppDialog } from '../components/AppDialogProvider';

export default function TestUploadScreen() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState('');
  const { showDialog } = useAppDialog();

  const testSupabaseConnection = async () => {
    setTesting(true);
    setResult('Testing...');

    try {
      console.log('🧪 Test 1: Checking Supabase client...');
      setResult('Test 1: Checking client...');
      
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      console.log('✅ Supabase client exists');

      console.log('🧪 Test 2: Listing buckets...');
      setResult('Test 2: Listing buckets...');
      
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Buckets error:', bucketsError);
        setResult(`❌ Buckets error: ${bucketsError.message}`);
        showDialog({
          title: 'Error',
          message: `Failed to list buckets: ${bucketsError.message}`,
        });
        return;
      }

      console.log('✅ Buckets:', buckets?.map(b => b.name).join(', '));
      setResult(`✅ Buckets found: ${buckets?.map(b => b.name).join(', ')}`);

      const kycBucket = buckets?.find(b => b.name === 'kyc-documents');
      if (!kycBucket) {
        setResult('❌ kyc-documents bucket not found!');
        showDialog({ title: 'Error', message: 'kyc-documents bucket not found' });
        return;
      }

      console.log('🧪 Test 3: Testing upload...');
      setResult('Test 3: Testing upload...');

      const testContent = 'Test file content';
      const testPath = `test/test_${Date.now()}.txt`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(testPath, testContent, {
          contentType: 'text/plain',
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        setResult(`❌ Upload failed: ${uploadError.message}`);
        showDialog({
          title: 'Upload Error',
          message: uploadError.message,
        });
        return;
      }

      console.log('✅ Upload successful:', uploadData);
      setResult('✅ All tests passed! Upload works!');
      showDialog({
        title: 'Success',
        message: 'Supabase connection and upload working!',
      });

      // Clean up
      await supabase.storage.from('kyc-documents').remove([testPath]);

    } catch (error: any) {
      console.error('❌ Test failed:', error);
      setResult(`❌ Error: ${error.message}`);
      showDialog({
        title: 'Test Failed',
        message: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Upload Test</Text>
      
      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={testSupabaseConnection}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Run Test'}
        </Text>
      </TouchableOpacity>

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>What this tests:</Text>
        <Text style={styles.instructionsText}>
          1. Supabase client initialization{'\n'}
          2. Bucket access{'\n'}
          3. File upload capability{'\n'}
          {'\n'}
          If this works, the issue is with image blob conversion.{'\n'}
          If this fails, the issue is with Supabase connection/policies.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  instructions: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
