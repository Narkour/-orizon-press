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
  excerpt?: string;
  coverColor: string;
  coverAccent?: string;
  coverImage?: string;
  featured?: boolean;
  tags?: string[];
  ebook: BookFormat;
  print: BookFormat;
  reviews?: { text: string; source: string }[];
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
  {
    id: 'ajora-kandasorey',
    slug: 'ajora-kandasorey',
    name: 'Ajora Kandasorey',
    shortBio: 'Writer of literary fiction exploring faith, identity, and the human condition across the landscapes of West Africa.',
    bio: 'Ajora Kandasorey writes literary fiction at the intersection of faith, conflict, and the intimate lives of ordinary people. Their debut novel, When the Call to Prayer Fell Silent, marks the arrival of a powerful new voice in contemporary African fiction — one attuned to the quiet courage it takes to preserve one\'s humanity in extraordinary times.',
    genres: ['Literary Fiction'],
    accentColor: '#1a4a5c',
  },
  // ADD NEW PEN NAMES HERE
];

// ============================================
// BOOKS
// ============================================
export const books: Book[] = [
  {
    id: '1',
    slug: 'the-shadow-of-the-baobab',
    title: 'The Shadow of the Baobab',
    penNameId: 'ajona-penhart',
    genre: 'Historical Fiction',
    coverColor: '#8B4513',
    coverImage: '/covers/baobab.png',
    shortDescription: 'An epic historical novel spanning centuries of African history, told through the eyes of a griot keeper of ancient chronicles.',
    description: 'An epic historical novel spanning centuries of African history, told through the eyes of a griot keeper of ancient chronicles. From the rise of the Mali Empire to the arrival of European explorers, The Shadow of the Baobab weaves legend, memory, and truth into a sweeping narrative of a continent soul.',
    excerpt: 'In the shadow of a thousand-year-old baobab tree, the last griot speaks the great tale one final time before the world changes forever.',
    featured: true,
    tags: ['Historical Fiction', 'Mali Empire', 'African History', 'Epic Fiction'],
    ebook: { available: true, price: 9.99 },
    print: { available: true, price: 19.99 },
    reviews: [{ text: 'A breathtaking epic that restores Africa voice to history.', source: 'Reader Review' }],
  },
  {
    id: '2',
    slug: 'astrology-divination-everyday-life',
    title: 'Astrology, Divination, and Everyday Life',
    penNameId: 'jn-nartey',
    genre: 'Religion & Spirituality',
    coverColor: '#1a1a4e',
    coverImage: '/covers/astrology.png',
    shortDescription: 'A comprehensive exploration of astrology and divination across world cultures.',
    description: 'A comprehensive exploration of astrology and divination across world cultures — from Babylonian star-reading to Vedic Jyotish, from the I Ching to Tarot. This book bridges ancient wisdom and modern life, offering practical guidance for anyone seeking to understand the cosmic patterns that shape human experience.',
    excerpt: 'Since the dawn of consciousness, humans have gazed at the stars with wonder and sought patterns in the seemingly random events of existence.',
    featured: true,
    tags: ['Astrology', 'Divination', 'Spirituality', 'Self-Discovery'],
    ebook: { available: true, price: 8.99 },
    print: { available: true, price: 16.99 },
    reviews: [{ text: 'An authoritative and accessible guide to the world divinatory traditions.', source: 'Reader Review' }],
  },
  {
    id: '3',
    slug: 'nostradamus-prophecies-secrets',
    title: 'Nostradamus: Prophecies, Secrets, and the Fate of the World',
    penNameId: 'jojo-penwood',
    genre: 'Religion & Spirituality',
    coverColor: '#1a0a00',
    coverImage: '/covers/nostradamus.png',
    shortDescription: 'A gripping exploration of history\'s most famous prophet — his hidden heritage, Renaissance mind, and cryptic quatrains.',
    description: 'A gripping exploration of history most famous prophet — his hidden Jewish heritage, his Renaissance mind, and the cryptic quatrains that have haunted humanity for five centuries. Neither pure believer nor dismissive skeptic, this book seeks the real Nostradamus: a brilliant tormented visionary whose shadow stretches across every crisis of the modern world.',
    excerpt: 'The real story of Nostradamus is far more fascinating than either hagiography or debunking suggests.',
    featured: true,
    tags: ['Nostradamus', 'Prophecy', 'History', 'Mysticism'],
    ebook: { available: true, price: 9.99 },
    print: { available: true, price: 18.99 },
    reviews: [{ text: 'A masterful blend of history, mystery and human psychology.', source: 'Reader Review' }],
  },
  {
    id: '4',
    slug: 'messengers-from-sirius',
    title: 'Messengers from Sirius: The Dogon, the Stars, and the Science of the Ancients',
    penNameId: 'jojo-penwood',
    genre: 'African Spirituality & Consciousness',
    coverColor: '#0a0a2e',
    coverImage: '/covers/dogon.png',
    shortDescription: 'An extraordinary investigation into the Dogon people\'s ancient knowledge of the star Sirius B.',
    description: 'The Dogon people of Mali possessed detailed knowledge of Sirius B — an invisible star that Western astronomy only confirmed in the 20th century. This extraordinary investigation explores the Dogon cosmology, their cosmic mythology, and the profound questions their stellar knowledge raises about the origins of human understanding.',
    excerpt: 'Beneath the vast African skies of Mali, the Dogon people have for centuries held secrets of the stars that Western astronomy only confirmed in the twentieth century.',
    featured: true,
    tags: ['Dogon', 'African Cosmology', 'Ancient Astronomy', 'Consciousness'],
    ebook: { available: true, price: 9.99 },
    print: { available: true, price: 17.99 },
    reviews: [{ text: 'Mind-expanding. Forces you to rethink everything you thought you knew about ancient knowledge.', source: 'Reader Review' }],
  },
  {
    id: '5',
    slug: 'ancient-indigenous-african-religions',
    title: 'Ancient and Indigenous African Religions: Traditions, Practices, and Contemporary Relevance',
    penNameId: 'jn-nartey',
    genre: 'African Spirituality & Consciousness',
    coverColor: '#2d1b00',
    coverImage: '/covers/religions.png',
    shortDescription: 'A scholarly yet accessible exploration of Africa\'s profound and diverse religious traditions.',
    description: 'A scholarly yet accessible exploration of Africa profound and diverse religious traditions — from Yoruba Orisha worship and Akan spirituality to Ubuntu philosophy and ancestral veneration. This book restores dignity and intellectual depth to traditions too long dismissed, revealing their continuing relevance in the modern world.',
    excerpt: 'For millennia, the African continent has been home to some of humanity most profound and diverse religious traditions.',
    featured: false,
    tags: ['African Religion', 'Yoruba', 'Ubuntu', 'Indigenous Spirituality'],
    ebook: { available: true, price: 8.99 },
    print: { available: true, price: 17.99 },
    reviews: [{ text: 'Essential reading for anyone serious about African spiritual heritage.', source: 'Reader Review' }],
  },
  {
    id: '6',
    slug: 'when-the-call-to-prayer-fell-silent',
    title: 'When the Call to Prayer Fell Silent',
    penNameId: 'ajora-kandasorey',
    genre: 'Literary Fiction',
    coverColor: '#1a0500',
    coverImage: '/covers/prayer.png',
    shortDescription: 'A powerful, intimate novel about faith, survival, and the courage of ordinary people caught in conflict.',
    description: 'In the dusty university town of Dandari, Aishatu ordinary morning prayer is interrupted by a world unravelling. A powerful intimate novel about faith, survival, and the courage of ordinary people caught in the fires of conflict. When the call to prayer falls silent, what remains of who we are?',
    excerpt: 'The call to prayer woke her before the dream finished. Outside, the muezzin voice carried across the flat roofs of Dandari, rising and falling in the pre-dawn dark.',
    featured: false,
    tags: ['Literary Fiction', 'Faith', 'Conflict', 'African Novel'],
    ebook: { available: true, price: 8.99 },
    print: { available: true, price: 16.99 },
    reviews: [{ text: 'Quietly devastating. A novel that stays with you long after the final page.', source: 'Reader Review' }],
  },
  {
    id: '7',
    slug: 'unlocking-forces-wealth-abundance',
    title: 'Unlocking the Forces of Wealth and Abundance',
    penNameId: 'jn-nartey',
    genre: 'Self-Help & Personal Growth',
    coverColor: '#0a0a1a',
    coverImage: '/covers/wealth.png',
    shortDescription: 'Discover the hidden energetic laws behind financial success, drawing on ancient wisdom and modern psychology.',
    description: 'Discover the hidden energetic laws behind financial success. Drawing on the Law of Attraction, ancient wisdom traditions, and modern psychology, this transformative guide reveals how your thoughts, beliefs, and energetic frequency shape your financial reality — and how to consciously align with abundance, purpose, and prosperity.',
    excerpt: 'Money, at its core, is more than mere currency — it is a powerful form of energy exchange that can be understood, directed, and transformed.',
    featured: false,
    tags: ['Wealth', 'Abundance', 'Self-Help', 'Law of Attraction'],
    ebook: { available: true, price: 7.99 },
    print: { available: true, price: 15.99 },
    reviews: [{ text: 'A genuinely transformative approach to the relationship between mindset and money.', source: 'Reader Review' }],
  },
  {
    id: '8',
    slug: 'the-energy-body',
    title: 'The Energy Body: Exploring the Human Biofield',
    penNameId: 'jojo-penwood',
    genre: 'African Spirituality & Consciousness',
    coverColor: '#0d1a2e',
    coverImage: '/covers/energy-body.png',
    shortDescription: 'A comprehensive scientific and spiritual investigation of the human biofield.',
    description: 'A comprehensive scientific and spiritual investigation of the human biofield — the invisible energy field that surrounds every living being. Bridging ancient Vedic wisdom, Traditional Chinese Medicine, and cutting-edge biofield research, this book reveals the profound connections between energy, consciousness, health, and human potential.',
    excerpt: 'Every moment of your life, you are both generating and immersed in an invisible field of energy and information that extends beyond the boundaries of your physical body.',
    featured: false,
    tags: ['Biofield', 'Energy Healing', 'Consciousness', 'Human Potential'],
    ebook: { available: true, price: 8.99 },
    print: { available: true, price: 16.99 },
    reviews: [{ text: 'Brilliant synthesis of ancient wisdom and modern science.', source: 'Reader Review' }],
  },
  {
    id: '9',
    slug: 'chronicles-of-ancient-africa',
    title: 'Chronicles of Ancient Africa: A Timeless Journey',
    penNameId: 'jn-nartey',
    genre: 'African History',
    coverColor: '#3d1f00',
    coverImage: '/covers/chronicles-english.png',
    shortDescription: 'A sweeping history that restores Africa\'s rightful place at the centre of the human story.',
    description: 'From the cradle of humanity to the grandeur of ancient empires, this sweeping history restores Africa rightful place at the centre of the human story. Covering ancient Egypt, Kush, Carthage, Axum, Great Zimbabwe, and the kingdoms of West Africa, Chronicles of Ancient Africa is an essential guide to the continent extraordinary past.',
    excerpt: 'Africa story is one of resilience, innovation, and the enduring human spirit — a history that rivals any other on our planet.',
    featured: false,
    tags: ['African History', 'Ancient Civilizations', 'Egypt', 'Mali Empire'],
    ebook: { available: true, price: 7.99 },
    print: { available: true, price: 15.99 },
    reviews: [{ text: 'Beautifully written and long overdue. A landmark work of African history.', source: 'Reader Review' }],
  },
  {
    id: '10',
    slug: 'chroniques-afrique-ancienne',
    title: 'Chroniques de l\'Afrique Ancienne: Un Voyage Intemporel',
    penNameId: 'jn-nartey',
    genre: 'African History',
    coverColor: '#3d1f00',
    coverImage: '/covers/chronicles-french.png',
    shortDescription: 'L\'édition française de Chronicles of Ancient Africa — une célébration de l\'histoire africaine.',
    description: 'L\'edition française de Chronicles of Ancient Africa. De l\'aube de l\'humanité à la grandeur des empires antiques, ce livre célèbre l\'histoire extraordinaire du continent africain — ses civilisations, ses royaumes, et son héritage durable pour l\'humanité.',
    excerpt: 'L\'Afrique, souvent appelée le Berceau de l\'Humanité, présente une tapisserie historique qui rivalise avec toute autre sur notre planète.',
    featured: false,
    tags: ['Histoire Africaine', 'Civilisations Anciennes', 'Afrique'],
    ebook: { available: true, price: 7.99 },
    print: { available: true, price: 15.99 },
    reviews: [{ text: 'Une oeuvre essentielle pour comprendre l\'histoire africaine.', source: 'Lecteur' }],
  },
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
