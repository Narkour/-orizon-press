// Owner-approved KDP Select restriction. Keep this in place until the owner
// confirms the Select term has ended; disabling auto-renewal is not enough.
export const KINDLE_URL = 'https://www.amazon.com/dp/B0F8MM4QR3'

export function isEbookPaused(slug: string): boolean {
  return slug === 'children-of-the-stars'
}

export const EBOOK_PAUSED_MESSAGE = 'This eBook is currently available exclusively on Amazon Kindle. Print availability is unchanged.'
