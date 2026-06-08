// ============================================
// ORIZON PRESS — CENTRAL CATALOGUE
// ============================================

export type Genre =
  // Fiction & Literature
  | 'Literary Fiction'
  | 'Romance'
  | 'Crime & Thriller'
  | 'Legal & Courtroom Drama'
  | 'Mystery'
  | 'Historical Fiction'
  | 'Science Fiction & Fantasy'
  | "Children's Fiction"
  // Non-Fiction
  | 'African History'
  | 'Biography & Memoir'
  | 'Self-Help & Personal Growth'
  | 'Education & Textbooks'
  | 'Religion & Spirituality'
  | 'Health & Wellness'
  | 'Science & Society'
  | 'True Crime'
  // Specialist
  | 'African Spirituality & Consciousness'
  | 'Christian & Faith'
  | "Children's Books"
  | 'Young Adult';

export interface GenreGroup {
  label: string;
  genres: Genre[];
}

export const genreGroups: GenreGroup[] = [
  {
    label: 'Fiction & Literature',
    genres: [
      'Literary Fiction',
      'Romance',
      'Crime & Thriller',
      'Legal & Courtroom Drama',
      'Mystery',
      'Historical Fiction',
      'Science Fiction & Fantasy',
      "Children's Fiction",
    ],
  },
  {
    label: 'Non-Fiction',
    genres: [
      'African History',
      'Biography & Memoir',
      'Self-Help & Personal Growth',
      'Education & Textbooks',
      'Religion & Spirituality',
      'Health & Wellness',
      'Science & Society',
      'True Crime',
    ],
  },
  {
    label: 'Specialist',
    genres: [
      'African Spirituality & Consciousness',
      'Christian & Faith',
      "Children's Books",
      'Young Adult',
    ],
  },
];

export interface PenName {
  id: string;
  slug: string;
  name: string;
  bio: string;
  shortBio: string;
  genres: Genre[];
  accentColor: string;
}

export interface BookFormat {
  available: boolean;
  price: number;
  fileUrl?: string;
  amazonUrl?: string;
  streetlibUrl?: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  penNameId: string;
  genre: Genre;
  description: string;
  shortDescription: string;
  coverColor: string;
  coverAccent: string;
  featured?: boolean;
  tags?: string[];
  ebook: BookFormat;
  print: BookFormat;
  reviews?: { quote: string; source: string }[];
}

// ============================================
// PEN NAMES
// ============================================
export const penNames: PenName[] = [
  {
    id: 'jn-nartey',
    slug: 'jn-nartey',
    name: 'J.N. Nartey',
    shortBio: 'Writer on African history, consciousness, and the deeper architecture of human experience.',
    bio: 'J.N. Nartey writes at the intersection of African intellectual heritage and universal consciousness. Drawing from deep research into pre-colonial African civilizations, Kemetic philosophy, and modern metaphysics, their work bridges ancient wisdom with contemporary understanding.',
    genres: ['African History', 'African Spirituality & Consciousness'],
    accentColor: '#c8911f',
  },
  {
    id: 'jojo-penwood',
    slug: 'jojo-penwood',
    name: 'JOJO Penwood',
    shortBio: 'Storyteller, spiritual guide, and explorer of the spaces between worlds.',
    bio: "JOJO Penwood is the pen name behind a growing catalog of fiction and spiritual exploration titles. With distribution across Amazon, OverDrive, Google Books, Blackwell's UK, and Barnes & Noble, JOJO's work has found readers across Europe and the Americas.",
    genres: ['Literary Fiction', 'Historical Fiction', 'African Spirituality & Consciousness'],
    accentColor: '#6b1f1f',
  },
  {
    id: 'ajona-penhart',
    slug: 'ajona-penhart',
    name: 'Ajona Penhart',
    shortBio: 'Author of Christian devotional works and educational texts rooted in faith and scholarship.',
    bio: 'Ajona Penhart writes with clarity, depth, and purpose. Their Christian titles offer readers practical spiritual guidance grounded in scripture, while their textbooks bring academic rigour to questions of faith and identity.',
    genres: ['Christian & Faith', 'Education & Textbooks', 'Self-Help & Personal Growth'],
    accentColor: '#2e5c2e',
  },
  // ADD NEW PEN NAMES HERE
];

// ============================================
// BOOKS
// ============================================
export const books: Book[] = [
  {
    id: '001',
    slug: 'the-kemetic-blueprint',
    title: 'The Kemetic Blueprint',
    subtitle: 'Ancient Egyptian Wisdom for Modern Consciousness',
    penNameId: 'jn-nartey',
    genre: 'African History',
    shortDescription: 'A deep excavation of Kemetic philosophy and its relevance to the modern seeker.',
    description: 'The Kemetic Blueprint takes readers on a scholarly yet accessible journey through the foundational principles of ancient Egyptian civilization — not as mythology, but as a living, breathing system of consciousness technology.',
    coverColor: '#1a2a1a',
    coverAccent: '#c8911f',
    featured: true,
    tags: ['Kemet', 'Egypt', 'Consciousness', 'African Philosophy'],
    ebook: { available: true, price: 9.99 },
    print: { available: true, price: 19.99 },
    reviews: [{ quote: 'A groundbreaking work that restores Africa to its rightful place in intellectual history.', source: 'Reader Review' }],
  },
  {
    id: '002',
    slug: 'the-ori-frequency',
    title: 'The Ori Frequency',
    subtitle: 'Unlocking Your Personal Destiny Through Yoruba Wisdom',
    penNameId: 'jn-nartey',
    genre: 'African Spirituality & Consciousness',
    shortDescription: 'A transformative guide to understanding and activating your Ori.',
    description: 'In Yoruba cosmology, the Ori is the divine essence that each soul chooses before incarnating. The Ori Frequency translates this profound metaphysical system into practical tools for self-discovery and conscious living.',
    coverColor: '#2a1a0a',
    coverAccent: '#e8a832',
    featured: true,
    tags: ['Yoruba', 'Ori', 'Destiny', 'African Spirituality'],
    ebook: { available: true, price: 9.99 },
    print: { available: true, price: 17.99 },
  },
  {
    id: '003',
    slug: 'between-horizons',
    title: 'Between Horizons',
    subtitle: 'A Novel',
    penNameId: 'jojo-penwood',
    genre: 'Literary Fiction',
    shortDescription: 'A luminous debut novel about a woman who can see the threads that connect all human lives.',
    description: 'Between Horizons follows Adaeze, a cartographer who discovers she can map not terrain but fate — the invisible threads that run between human beings across time and distance.',
    coverColor: '#0f1a2e',
    coverAccent: '#6b8fb5',
    featured: true,
    tags: ['Literary Fiction', 'Africa', 'Magical Realism'],
    ebook: { available: true, price: 8.99 },
    print: { available: true, price: 16.99 },
    reviews: [{ quote: 'Breathtaking. A voice unlike anything in contemporary African fiction.', source: 'Reader Review' }],
  },
  {
    id: '004',
    slug: 'the-quiet-fire',
    title: 'The Quiet Fire',
    subtitle: 'Devotions for the Searching Soul',
    penNameId: 'ajona-penhart',
    genre: 'Christian & Faith',
    shortDescription: 'Thirty days of devotional readings for those navigating doubt and transition.',
    description: 'The Quiet Fire is a devotional for those who have sat with unanswered prayers and kept faith anyway. Written for the believer in the wilderness.',
    coverColor: '#1f1a2e',
    coverAccent: '#9b8fc0',
    featured: false,
    tags: ['Devotional', 'Faith', 'Christian Living'],
    ebook: { available: true, price: 7.99 },
    print: { available: true, price: 14.99 },
  },
  {
    id: '005',
    slug: 'consciousness-and-the-african-mind',
    title: 'Consciousness & the African Mind',
    subtitle: 'A Philosophical Inquiry',
    penNameId: 'jn-nartey',
    genre: 'African Spirituality & Consciousness',
    shortDescription: 'A rigorous philosophical exploration of consciousness through African intellectual traditions.',
    description: "What does it mean to think from within an African philosophical tradition? This work examines concepts of consciousness across Ubuntu, Ma'at, and Ifá and places them in dialogue with Western phenomenology.",
    coverColor: '#1e1414',
    coverAccent: '#c8911f',
    featured: false,
    tags: ['Philosophy', 'Consciousness', 'Ubuntu', 'African Studies'],
    ebook: { available: true, price: 11.99 },
    print: { available: true, price: 22.99 },
  },
  {
    id: '006',
    slug: 'the-salt-road',
    title: 'The Salt Road',
    penNameId: 'jojo-penwood',
    genre: 'Historical Fiction',
    shortDescription: 'A sweeping historical novel tracing the trans-Saharan trade routes and the civilizations they built.',
    description: 'The Salt Road follows three generations of a trading family across five centuries of West African history, from the height of the Mali Empire to the first tremors of European contact.',
    coverColor: '#2a1e0a',
    coverAccent: '#d4984a',
    featured: false,
    tags: ['Historical Fiction', 'West Africa', 'Mali Empire'],
    ebook: { available: true, price: 8.99 },
    print: { available: true, price: 18.99 },
  },
  // ADD NEW BOOKS HERE
];

// ============================================
// HELPERS
// ============================================
export const getBooksByPenName = (id: string) => books.filter(b => b.penNameId === id);
export const getBookBySlug = (slug: string) => books.find(b => b.slug === slug);
export const getPenNameById = (id: string) => penNames.find(p => p.id === id);
export const getPenNameBySlug = (slug: string) => penNames.find(p => p.slug === slug);
export const getFeaturedBooks = () => books.filter(b => b.featured);
export const getAllGenres = (): Genre[] => genreGroups.flatMap(g => g.genres);
