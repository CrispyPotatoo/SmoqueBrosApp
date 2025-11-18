import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../components/AppDialogProvider';
import { db } from '../constants/firebaseConfig';
import { useSession } from '../context/SessionProvider';

interface ContactForm {
  name: string;
  email: string;
  message: string;
}

export default function ContactScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { showDialog } = useAppDialog();
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof ContactForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      showDialog({ title: 'Error', message: 'Please enter your name' });
      return false;
    }
    if (!form.email.trim()) {
      showDialog({ title: 'Error', message: 'Please enter your email' });
      return false;
    }
    if (!form.email.includes('@')) {
      showDialog({ title: 'Error', message: 'Please enter a valid email address' });
      return false;
    }
    if (!form.message.trim()) {
      showDialog({ title: 'Error', message: 'Please enter your message' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Save contact form submission to Firestore
      const contactData = {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        userId: session?.uid || null,
        userEmail: session?.email || null,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: 'new',
        platform: 'mobile_app',
        source: 'contact_form',
      };

      await addDoc(collection(db, 'contact_submissions'), contactData);

      console.log('✅ Contact form submitted successfully:', {
        name: form.name,
        email: form.email,
        userId: session?.uid,
      });

      showDialog({
        title: 'Message Sent!',
        message: 'Thank you for contacting us. We will get back to you soon.',
        confirmText: 'OK',
        onConfirm: () => {
          setForm({ name: '', email: '', message: '' });
          router.back();
        },
      });
    } catch (error) {
      console.error('❌ Error submitting contact form:', error);
      showDialog({ title: 'Error', message: 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+639123456789');
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:support@smoquebros.com');
  };

  const handleFacebookPress = () => {
    Linking.openURL('https://facebook.com/smoquebros');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.titleContainer}>
              <Ionicons name="mail" size={24} color="#333" style={styles.titleIcon} />
              <Text style={styles.title}>Contact Us</Text>
            </View>
            <Text style={styles.subtitle}>
              Have a question, suggestion, or concern? Reach out to us below!
            </Text>
          </View>

          {/* Contact Form */}
          <View style={styles.formContainer}>
            {/* Name Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder=""
                placeholderTextColor="#999"
              />
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder=""
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Message Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                value={form.message}
                onChangeText={(value) => handleInputChange('message', value)}
                placeholder=""
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.submitButtonText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Contact Information */}
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Contact Information</Text>
            <TouchableOpacity style={styles.contactItem}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.contactText}>RSL Building, P. Guevara Avenue, Poblacion III, Santa Cruz, Philippines</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL('mailto:smoquebros@gmail.com')}
            >
              <Ionicons name="mail-outline" size={20} color="#1e3a8a" />
              <Text style={[styles.contactText, styles.contactLink]}>smoquebros@gmail.com</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL('tel:+639176292784')}
            >
              <Ionicons name="call-outline" size={20} color="#1e3a8a" />
              <Text style={[styles.contactText, styles.contactLink]}>0917 629 2784</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL('https://www.facebook.com/profile.php?id=61552082637859')}
            >
              <Ionicons name="logo-facebook" size={20} color="#1e3a8a" />
              <Text style={[styles.contactText, styles.contactLink]}>Smoque Bros Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 30,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  messageInput: {
    height: 120,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    marginTop: 20,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  contactLink: {
    color: '#1e3a8a',
  },
});
