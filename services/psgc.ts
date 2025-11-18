// PSGC API Service for Philippine Standard Geographic Code
// Provides provinces, cities, and barangays with fallback data for Santa Cruz, Laguna

export interface Province {
  code: string;
  name: string;
}

export interface City {
  code: string;
  name: string;
  provinceCode: string;
}

export interface Barangay {
  code: string;
  name: string;
  cityCode: string;
}

const API_BASE_URL = 'https://psgc.gitlab.io/api';

// Hardcoded fallback barangays for Santa Cruz, Laguna
const SANTA_CRUZ_LAGUNA_BARANGAYS: Barangay[] = [
  { code: '043424001', name: 'Alipit', cityCode: '043424' },
  { code: '043424002', name: 'Bagumbayan', cityCode: '043424' },
  { code: '043424003', name: 'Balinacon', cityCode: '043424' },
  { code: '043424004', name: 'Bambang', cityCode: '043424' },
  { code: '043424005', name: 'Bubukal', cityCode: '043424' },
  { code: '043424006', name: 'Calios', cityCode: '043424' },
  { code: '043424007', name: 'Duhat', cityCode: '043424' },
  { code: '043424008', name: 'Gatid', cityCode: '043424' },
  { code: '043424009', name: 'Jasaan', cityCode: '043424' },
  { code: '043424010', name: 'Labuin', cityCode: '043424' },
  { code: '043424011', name: 'Malinao', cityCode: '043424' },
  { code: '043424012', name: 'Oogong', cityCode: '043424' },
  { code: '043424013', name: 'Pagsawitan', cityCode: '043424' },
  { code: '043424014', name: 'Palasan', cityCode: '043424' },
  { code: '043424015', name: 'Patimbao', cityCode: '043424' },
  { code: '043424016', name: 'Poblacion I', cityCode: '043424' },
  { code: '043424017', name: 'Poblacion II', cityCode: '043424' },
  { code: '043424018', name: 'Poblacion III', cityCode: '043424' },
  { code: '043424019', name: 'Poblacion IV', cityCode: '043424' },
  { code: '043424020', name: 'Poblacion V', cityCode: '043424' },
  { code: '043424021', name: 'Santisima Cruz', cityCode: '043424' },
  { code: '043424022', name: 'Santo Angel Central', cityCode: '043424' },
  { code: '043424023', name: 'Santo Angel Norte', cityCode: '043424' },
  { code: '043424024', name: 'Santo Angel Sur', cityCode: '043424' },
].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Fetch all provinces from PSGC API
 */
export const getProvinces = async (): Promise<Province[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/provinces/`);
    if (!response.ok) throw new Error('Failed to fetch provinces');
    
    const data = await response.json();
    return data.map((item: any) => ({
      code: item.code,
      name: item.name,
    })).sort((a: Province, b: Province) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching provinces:', error);
    // Return Laguna as fallback
    return [{ code: '0434', name: 'Laguna' }];
  }
};

/**
 * Fetch cities/municipalities for a specific province
 */
export const getCitiesByProvince = async (provinceCode: string): Promise<City[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/provinces/${provinceCode}/cities-municipalities/`);
    if (!response.ok) throw new Error('Failed to fetch cities');
    
    const data = await response.json();
    return data.map((item: any) => ({
      code: item.code,
      name: item.name,
      provinceCode: provinceCode,
    })).sort((a: City, b: City) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching cities:', error);
    // Return Santa Cruz as fallback if Laguna province
    if (provinceCode === '0434') {
      return [{ code: '043424', name: 'Santa Cruz', provinceCode: '0434' }];
    }
    return [];
  }
};

/**
 * Fetch barangays for a specific city/municipality
 * Falls back to Santa Cruz, Laguna barangays if API fails
 */
export const getBarangaysByCity = async (cityCode: string): Promise<Barangay[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cities-municipalities/${cityCode}/barangays/`);
    if (!response.ok) {
      // If API fails and it's Santa Cruz, Laguna, return hardcoded data
      if (cityCode === '043424') {
        console.log('⚠️ PSGC API failed, using hardcoded Santa Cruz barangays');
        return SANTA_CRUZ_LAGUNA_BARANGAYS;
      }
      throw new Error('Failed to fetch barangays');
    }
    
    const data = await response.json();
    const barangays = data.map((item: any) => ({
      code: item.code,
      name: item.name,
      cityCode: cityCode,
    })).sort((a: Barangay, b: Barangay) => a.name.localeCompare(b.name));
    
    return barangays;
  } catch (error) {
    console.error('Error fetching barangays:', error);
    
    // Fallback to hardcoded Santa Cruz, Laguna barangays
    if (cityCode === '043424') {
      console.log('⚠️ Using hardcoded Santa Cruz, Laguna barangays as fallback');
      return SANTA_CRUZ_LAGUNA_BARANGAYS;
    }
    
    // For other cities, return empty array
    return [];
  }
};

/**
 * Get Santa Cruz, Laguna barangays directly (for testing or offline use)
 */
export const getSantaCruzBarangays = (): Barangay[] => {
  return SANTA_CRUZ_LAGUNA_BARANGAYS;
};
