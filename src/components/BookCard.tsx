import { Link } from 'react-router-dom'
import type { Book } from '../data/catalogue'
import { getPenNameById } from '../data/catalogue'

export default function BookCard({ book, index = 0 }: { book: Book; index?: number }) {
  const penName = getPenNameById(book.penNameId)
  const delay = Math.min(index * 0.07, 0.5)

  return (
    <Link to={`/books/${book.slug}`} className="book-card fade-up" style={{ animationDelay: `${delay}s` }}>
      <div className="book-cover" style={{ background: book.coverColor }}>
        <div className="book-cover__inner">
          {/* Corner decorations */}
          <span style={{ position:'absolute', top:12, left:12, width:18, height:18,
            borderTop:`1px solid ${book.coverAccent}`, borderLeft:`1px solid ${book.coverAccent}`, opacity:0.7 }} />
          <span style={{ position:'absolute', bottom:12, right:12, width:18, height:18,
            borderBottom:`1px solid ${book.coverAccent}`, borderRight:`1px solid ${book.coverAccent}`, opacity:0.7 }} />
          {/* Divider */}
          <span style={{ display:'block', width:28, height:1, background:book.coverAccent, marginBottom:12, opacity:0.9 }} />
          <span className="book-cover__title">{book.title}</span>
          {book.subtitle && (
            <span style={{ fontFamily:'var(--font-display)', fontSize:'0.7rem', color:'rgba(244,239,230,0.55)',
              marginTop:'0.4rem', fontStyle:'italic', display:'block', position:'relative', zIndex:1 }}>
              {book.subtitle}
            </span>
          )}
          <span className="book-cover__author">{penName?.name}</span>
          {/* Light gradient overlay */}
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.07) 0, transparent 60%)', pointerEvents:'none' }} />
        </div>
      </div>
      <div className="book-info">
        <span className="book-genre">{book.genre}</span>
        <h3 className="book-title">{book.title}</h3>
        {book.ebook.available && (
          <span className="book-price">from ${book.ebook.price.toFixed(2)}</span>
        )}
      </div>
    </Link>
  )
}
