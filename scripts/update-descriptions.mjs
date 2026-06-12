// One-shot script — run once, then delete.
// Updates description + short_description for all 20 books in Supabase.

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// ─── Load env ────────────────────────────────────────────────────────────────
const envPath = join(__dir, '..', '.env.local')
const envText = readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)

const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

// ─── Book descriptions ────────────────────────────────────────────────────────
const books = [
  {
    slug: 'abundance-is-the-only-reality',
    description: `What if scarcity is not a fact of life but a story you've been told? In Abundance Is the Only Reality, J.N. Nartey dismantles the mental frameworks that keep prosperity at arm's length, revealing the subtle beliefs and unconscious patterns that block the natural flow of wealth and well-being. Rooted in African philosophical wisdom and modern consciousness research, this transformative guide shows you how to reclaim your birthright to a life of genuine abundance.`,
    short_description: `Dismantle scarcity thinking and reclaim your natural birthright to abundance — a transformative guide rooted in African wisdom and consciousness research.`,
  },
  {
    slug: 'the-world-in-50-years',
    description: `From climate transformation to the dawn of artificial general intelligence, the next half-century will reshape every dimension of human existence. The World in 50 Years draws on emerging science, geopolitical trends, and deep historical patterns to map the forces that will define our collective future — and the choices that will determine whether it is one we can celebrate. J.N. Nartey offers not just a forecast, but a rigorous framework for thinking clearly about what lies ahead.`,
    short_description: `A rigorous, thought-provoking forecast of the technological, environmental, and geopolitical forces that will reshape humanity over the next fifty years.`,
  },
  {
    slug: 'the-lost-kingdoms-of-africa',
    description: `Long before European maps acknowledged their existence, Africa was home to vast empires, sophisticated trade networks, and civilisations of extraordinary complexity. The Lost Kingdoms of Africa reconstructs the forgotten grandeur of these societies — from the iron cities of the Sahel to the maritime kingdoms of the East African coast — restoring their rightful place in the story of human achievement. Ajona Penhart combines meticulous scholarship with vivid storytelling to bring these worlds breathtakingly back to life.`,
    short_description: `Discover the vast empires and forgotten civilisations that shaped Africa long before European contact — a landmark work of historical restoration.`,
  },
  {
    slug: 'the-isis-transmissions',
    description: `Hidden within the oldest layers of Kemetic tradition lies a current of wisdom so potent it was deliberately suppressed — until now. The Isis Transmissions channels the sacred teachings of the great mother goddess through a modern framework, offering initiates a direct encounter with the divine feminine that underpins all creation. JOJO Penwood weaves sacred cosmology, meditative practice, and esoteric philosophy into a luminous guide for those ready to walk the path of Isis.`,
    short_description: `An initiation into the sacred wisdom of the goddess Isis — drawing from Kemetic cosmology to awaken the divine feminine and illuminate the path of the soul.`,
  },
  {
    slug: 'the-psychology-of-narcissism',
    description: `Narcissism is one of the most misunderstood forces shaping modern relationships, workplaces, and social life — and one of the most damaging. The Psychology of Narcissism goes beyond diagnosis to offer a compassionate, clear-eyed examination of how narcissistic patterns develop, how they operate, and — crucially — how to protect yourself and heal from their effects. J.N. Nartey draws on psychology, personal narratives, and practical strategies to help readers reclaim their sense of self.`,
    short_description: `A clear-eyed guide to understanding, recognising, and healing from narcissistic relationships — essential reading for anyone navigating a world shaped by ego.`,
  },
  {
    slug: 'sudan-empire-faith-and-freedom',
    description: `For millennia, the land along the upper Nile has been a crucible of civilisation — birthplace of Nubian pharaohs, crossroads of trade and religion, and theatre of struggle against colonial domination. Sudan: Empire, Faith and Freedom traces this epic arc from the ancient kingdoms of Kush and Meroe through centuries of Islamic transformation to the modern nation's turbulent quest for sovereignty. Ajona Penhart delivers a sweeping narrative that demands Sudan be understood as one of the world's great historical centres.`,
    short_description: `A sweeping history of Sudan from the ancient Nubian pharaohs to the modern nation — reclaiming one of the world's most overlooked and remarkable civilisations.`,
  },
  {
    slug: 'chronicles-of-ancient-africa',
    description: `Africa's past is not a prologue to someone else's story — it is the origin of human civilisation itself. Chronicles of Ancient Africa takes readers on a continent-wide journey through the great epochs of African history, from the earliest human communities to the golden ages of empire, trade, and intellectual achievement. J.N. Nartey weaves together archaeology, oral tradition, and historical analysis to create a chronicle that every reader of world history needs on their shelf.`,
    short_description: `An epic continent-spanning chronicle of African civilisation — from humanity's earliest origins to the golden ages of empire, scholarship, and cultural brilliance.`,
  },
  {
    slug: 'ancient-and-indigenous-african-religions',
    description: `The indigenous spiritual traditions of Africa did not disappear with colonisation — they adapted, survived, and continue to offer profound wisdom for the modern world. Ancient and Indigenous African Religions surveys the beliefs, rituals, cosmologies, and moral frameworks of Africa's diverse spiritual traditions — from the Yoruba and Akan to the Dogon and Zulu — with rigorous scholarship and deep respect. J.N. Nartey demonstrates why these traditions are not relics of the past but living systems of knowledge with urgent contemporary relevance.`,
    short_description: `A scholarly yet accessible survey of Africa's living spiritual traditions — revealing their depth, diversity, and vital relevance to the modern world.`,
  },
  {
    slug: 'the-energy-body',
    description: `Ancient African healing traditions have long mapped an invisible architecture of energy that animates and sustains the physical body — what modern science is only beginning to call the biofield. The Energy Body bridges this ancient knowing with contemporary research, offering a practical framework for understanding and working with your own energetic anatomy. JOJO Penwood guides readers through techniques for clearing, balancing, and activating the energy body for greater health, clarity, and spiritual awareness.`,
    short_description: `Bridge ancient African energy wisdom with modern biofield science — and discover practical tools for healing, balance, and spiritual expansion.`,
  },
  {
    slug: 'the-soul-of-the-land',
    description: `Land in Africa has never been merely geography — it is memory, identity, and spiritual inheritance. The Soul of the Land explores the deep relationship between African peoples and their territories across centuries of habitation, displacement, and resistance, tracing how the land itself has shaped culture, cosmology, and community. Ajona Penhart offers a moving meditation on belonging and return that resonates far beyond its historical scope.`,
    short_description: `A moving exploration of the deep spiritual and cultural bond between African peoples and their land — a history of belonging, loss, and return.`,
  },
  {
    slug: 'the-psychology-of-self-sabotage',
    description: `You have the vision, the talent, and the intention — so why does something always seem to get in the way? The Psychology of Self-Sabotage exposes the hidden mental and emotional mechanisms that cause us to undermine our own success, from procrastination and perfectionism to fear of visibility and unconscious unworthiness. With insight drawn from psychology, spirituality, and lived experience, JOJO Penwood offers a compassionate and practical path out of the patterns that hold you back.`,
    short_description: `Uncover the hidden patterns that undermine your success — and break free from self-sabotage with clarity, compassion, and proven strategies.`,
  },
  {
    slug: 'unveiling-the-cosmos',
    description: `The universe is stranger, more beautiful, and more intimately connected to human consciousness than conventional science has dared to suggest. Unveiling the Cosmos takes readers on a journey from the quantum foundations of matter to the vast structures of galactic space, exploring the surprising convergences between modern physics and ancient cosmological traditions. J.N. Nartey makes the profound accessible, inviting readers to reconsider their place in a cosmos that may be far more alive than we imagined.`,
    short_description: `A journey from quantum physics to the farthest reaches of the cosmos — revealing a universe far stranger, richer, and more alive than we were taught.`,
  },
  {
    slug: 'unlocking-the-forces-of-wealth-and-abundance',
    description: `True wealth is not built through strategy alone — it is cultivated through deep alignment between your values, your vision, and the invisible forces that govern prosperity. Unlocking the Forces of Wealth and Abundance draws on metaphysical principles, practical financial wisdom, and the ancient African understanding of reciprocity and flow to present a holistic blueprint for material and spiritual abundance. J.N. Nartey provides a step-by-step framework for rewiring your relationship with money and unlocking the life you know is possible.`,
    short_description: `A holistic blueprint for wealth that aligns metaphysical principles with practical strategy — transforming your relationship with money from the inside out.`,
  },
  {
    slug: 'the-vibrational-universe',
    description: `Everything that exists — thought, emotion, matter, and meaning — is an expression of vibration. The Vibrational Universe presents a unified framework for understanding reality as an infinite field of frequencies, in which consciousness itself is the fundamental creative force. Drawing on quantum science, ancient metaphysics, and decades of spiritual inquiry, JOJO Penwood offers readers a revolutionary lens through which to understand the nature of existence and their own power within it.`,
    short_description: `A revolutionary framework for understanding reality as vibration — and consciousness as the creative force that shapes the universe itself.`,
  },
  {
    slug: 'the-shadow-of-the-baobab',
    description: `Under the shade of an ancient baobab tree, generations of a West African family carry the weight of history — love and loss, colonisation and resistance, memory and forgetting. The Shadow of the Baobab is a lyrical, multigenerational saga that sweeps from pre-colonial village life through the upheavals of empire to the fractured landscapes of post-independence Africa. Ajona Penhart's luminous prose turns history into something felt in the bones, making this novel impossible to put down and impossible to forget.`,
    short_description: `A sweeping multigenerational saga set against the backdrop of African history — lyrical, powerful, and impossible to forget.`,
  },
  {
    slug: 'astrology-divination-everyday-life',
    description: `Long before it was a newspaper column, astrology was a profound technology for understanding time, self, and destiny. Astrology, Divination, and Everyday Life reclaims these ancient arts — from African and Kemetic astrological traditions to practical techniques of divination — and shows how they can be woven into daily life as tools of clarity, decision-making, and self-knowledge. J.N. Nartey makes these traditions approachable without diminishing their depth, offering a genuine guide for the modern seeker.`,
    short_description: `Reclaim the ancient arts of astrology and divination as practical tools for clarity, decision-making, and self-knowledge in everyday life.`,
  },
  {
    slug: 'nostradamus-prophecies-secrets',
    description: `For five centuries, the cryptic quatrains of Michel de Nostredame have fascinated, confounded, and unsettled readers across the world. Nostradamus: Prophecies, Secrets, and the Fate of the World offers a fresh interpretation of the seer's most significant visions, decoding the symbolic language of the centuries with the aid of historical context and esoteric tradition. JOJO Penwood explores not just what Nostradamus predicted, but the nature of prophecy itself — and what it means that some of it seems to be coming true.`,
    short_description: `A fresh, rigorous decoding of Nostradamus's most significant prophecies — exploring the symbols, the secrets, and what they may reveal about our future.`,
  },
  {
    slug: 'messengers-from-sirius',
    description: `The Dogon people of Mali possessed detailed astronomical knowledge of the Sirius star system centuries before modern telescopes could confirm it — a mystery that has captivated scientists and spiritual seekers alike. Messengers from Sirius investigates this extraordinary enigma, tracing the Dogon's cosmological tradition back to its ancient African roots and examining what their knowledge suggests about consciousness, contact, and the true origins of civilisation. JOJO Penwood presents a compelling case that the ancient Africans were in dialogue with something far beyond what our history books acknowledge.`,
    short_description: `Investigate the Dogon's astonishing astronomical secrets and their implications for the true origins of human civilisation — a mystery that rewrites history.`,
  },
  {
    slug: 'when-the-call-to-prayer-fell-silent',
    description: `In a city where faith and doubt, tradition and modernity collide, one family must decide what they are willing to surrender and what they cannot live without. When the Call to Prayer Fell Silent is a beautifully rendered novel about the fractures within a Muslim family across three generations — the quiet losses, the acts of love disguised as betrayal, and the silences that speak louder than any creed. Ajora Kandasorey writes with rare emotional precision, crafting a story that is both intimate and universal in its reach.`,
    short_description: `A beautifully rendered multigenerational novel about faith, family, and the silences that define us — intimate, emotionally precise, and profoundly moving.`,
  },
  {
    slug: 'chroniques-afrique-ancienne',
    description: `À travers les âges, l'Afrique a été le berceau de civilisations d'une richesse et d'une complexité extraordinaires — trop souvent ignorées ou déformées par les récits coloniaux. Chroniques de l'Afrique Ancienne retrace ce voyage intemporel à travers les grandes époques de l'histoire africaine, des premières communautés humaines aux empires glorieux du Sahel et des côtes orientales. J.N. Nartey offre au lecteur francophone une œuvre rigoureuse et captivante qui rend à l'Afrique la place centrale qui lui revient dans l'histoire de l'humanité.`,
    short_description: `Un voyage intemporel à travers les grandes civilisations africaines — une œuvre essentielle qui rend à l'Afrique la place qui lui revient dans l'histoire de l'humanité.`,
  },
]

// ─── Update each book ─────────────────────────────────────────────────────────
async function updateBook(book) {
  const url = `${SUPABASE_URL}/rest/v1/books?slug=eq.${encodeURIComponent(book.slug)}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      description: book.description,
      short_description: book.short_description,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update ${book.slug}: ${res.status} ${text}`)
  }

  return book.slug
}

async function main() {
  console.log(`Updating ${books.length} books...\n`)
  let ok = 0
  let fail = 0

  for (const book of books) {
    try {
      await updateBook(book)
      console.log(`  ✓ ${book.slug}`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${err.message}`)
      fail++
    }
  }

  console.log(`\nDone: ${ok} updated, ${fail} failed`)
}

main()
