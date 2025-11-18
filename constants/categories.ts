export interface Category {
  id: string;
  name: string;
  icon: any;
}

export const CATEGORIES: Category[] = [
  { id: '1', name: 'BBQ Platters', icon: 'box' },
  { id: '2', name: 'Sandwiches', icon: 'layers' },
  { id: '3', name: 'Side Dishes', icon: 'grid' },
  { id: '4', name: 'Sauces', icon: 'droplet' },
  { id: '5', name: 'Meats by the Pound', icon: 'package' },
  { id: '6', name: 'Drinks', icon: 'coffee' },
];
