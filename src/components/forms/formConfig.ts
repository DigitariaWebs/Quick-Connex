// Define the types for different icon path structures
type EmailIconPaths = {
  path1: string;
  path2: string;
};

type PhoneIconPaths = {
  path: string;
};

type LockIconPaths = {
  path: string;
};

// Define the SVG paths with proper type annotations
export const SVG_PATHS: {
  email: EmailIconPaths;
  phone: PhoneIconPaths;
  lock: LockIconPaths;
} = {
  email: {
    path1: "M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z",
    path2: "M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"
  },
  phone: {
    path: "M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"
  },
  lock: {
    path: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
  }
};

export const CIUSSS_OPTIONS = [
  { value: '01', label: 'CISSS du Bas-Saint-Laurent' },
  { value: '02', label: 'CIUSSS du Saguenay–Lac-Saint-Jean' },
  { value: '03', label: 'CIUSSS de la Capitale-Nationale' },
  { value: '04', label: 'CIUSSS de la Mauricie-et-du-Centre-du-Québec' },
  { value: '05', label: 'CIUSSS de l\'Estrie – Centre hospitalier universitaire de Sherbrooke' },
  { value: '06-1', label: 'CIUSSS de l\'Est-de-l\'Île-de-Montréal' },
  { value: '06-2', label: 'CIUSSS de l\'Ouest-de-l\'Île-de-Montréal' },
  { value: '06-3', label: 'CIUSSS du Centre-Ouest-de-l\'Île-de-Montréal' },
  { value: '06-4', label: 'CIUSSS du Centre-Sud-de-l\'Île-de-Montréal' },
  { value: '06-5', label: 'CIUSSS du Nord-de-l\'Île-de-Montréal' },
  { value: '07', label: 'CISSS de l\'Outaouais' },
  { value: '08', label: 'CISSS de l\'Abitibi-Témiscamingue' },
  { value: '09', label: 'CISSS de la Côte-Nord' },
  { value: '11-1', label: 'CISSS de la Gaspésie' },
  { value: '11-2', label: 'CISSS des Îles' },
  { value: '12', label: 'CISSS de Chaudière-Appalaches' },
  { value: '13', label: 'CISSS de Laval' },
  { value: '14', label: 'CISSS de Lanaudière' },
  { value: '15', label: 'CISSS des Laurentides' },
  { value: '16-1', label: 'CISSS de la Montérégie-Centre' },
  { value: '16-2', label: 'CISSS de la Montérégie-Est' },
  { value: '16-3', label: 'CISSS de la Montérégie-Ouest' },
];
