import { Platform } from 'react-native';

// Use localhost for web, and your computer's IP for mobile
const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000/api'
  : 'http://192.168.68.107:3000/api';

export default API_URL;
