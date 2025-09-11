// Define the types for different icon path structures
type EmailIconPaths = {
  path1: string;
  path2: string;
};

type PhoneIconPaths = {
  path: string;
};

// Define the SVG paths with proper type annotations
export const SVG_PATHS: {
  email: EmailIconPaths;
  phone: PhoneIconPaths;
} = {
  email: {
    path1: "M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z",
    path2: "M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"
  },
  phone: {
    path: "M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"
  }
};

export const CLASS_OPTIONS = [
  { value: 'Class A', label: 'Class A' },
  { value: 'Class B', label: 'Class B' },
  { value: 'Class C', label: 'Class C' },
];
