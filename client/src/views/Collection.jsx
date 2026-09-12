import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Search, Filter, ExternalLink, X, Grid, List, 
  FileText, User, Calendar, ArrowUpDown, Download, Bookmark, 
  Sparkles, Eye, Share2, Check 
} from 'lucide-react';

export default function Collection() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('order'); // 'order' | 'title-asc' | 'title-desc' | 'author'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [copiedLink, setCopiedLink] = useState(false);

  const { bookSlug } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = (import.meta.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

  // Fetch published books on mount
  useEffect(() => {
    async function fetchBooks() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/public/books`);
        if (res.ok) {
          const data = await res.json();
          setBooks(data);
        }
      } catch (err) {
        console.error('Error fetching public books:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, [API_BASE_URL]);

  // Synchronize modal state with URL parameter :bookSlug
  useEffect(() => {
    if (bookSlug && books.length > 0) {
      const book = books.find(b => b.slug === bookSlug.toLowerCase());
      if (book) {
        setSelectedBook(book);
        document.body.style.overflow = 'hidden';
      } else {
        navigate('/collection');
      }
    } else {
      setSelectedBook(null);
      document.body.style.overflow = '';
    }
  }, [bookSlug, books, navigate]);

  // Filter and sort the collection items
  const filteredAndSortedBooks = useMemo(() => {
    let result = [...books];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        b.title.toLowerCase().includes(q) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
      if (sortBy === 'author') return (a.author || '').localeCompare(b.author || '');
      // Default: displayOrder, then newest
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

    return result;
  }, [books, searchQuery, sortBy]);

  const handleOpenPdf = (slug) => {
    window.open(`${API_BASE_URL}/api/v1/public/books/pdf/${slug}`, '_blank');
  };

  const handleCloseModal = () => {
    setSelectedBook(null);
    document.body.style.overflow = '';
    navigate('/collection');
  };

  const handleShare = () => {
    if (!selectedBook) return;
    const url = `${window.location.origin}/collection/${selectedBook.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Unlocking the family archive catalog...</p>
      </div>
    );
  }

  return (
    <div className="collection-view">
      <div className="container">
        {/* Header Hero Section */}
        <div className="collection-hero-header">
          <div className="collection-hero-badge">
            <Sparkles size={14} /> Preserved Digital Library
          </div>
          <h1 className="page-title">The Family Archives & Library</h1>
          <p className="page-subtitle">
            An expansive digital repository of rare family books, historical manuscripts, ancestral records, and preserved memoirs.
          </p>
        </div>

        {/* Search, Filter & Toolbar */}
        <div className="collection-toolbar glass-card">
          {/* Search Box */}
          <div className="collection-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by book title, author, or historical subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="collection-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="collection-toolbar-right">
            {/* Sort Dropdown */}
            <div className="collection-sort-control">
              <ArrowUpDown size={15} className="sort-icon" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="collection-select"
                aria-label="Sort books by"
              >
                <option value="order">Curated Order</option>
                <option value="title-asc">Title (A → Z)</option>
                <option value="title-desc">Title (Z → A)</option>
                <option value="author">Author Name</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="view-mode-toggles">
              <button
                onClick={() => setViewMode('grid')}
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                title="Grid View"
                aria-label="Grid view"
              >
                <Grid size={17} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                title="Detailed List View"
                aria-label="List view"
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="collection-count-row">
          <span>
            Displaying <strong>{filteredAndSortedBooks.length}</strong> {filteredAndSortedBooks.length === 1 ? 'archival document' : 'archival documents'}
          </span>
          {searchQuery && (
            <span className="search-query-tag">
              Matching: <em>"{searchQuery}"</em>
            </span>
          )}
        </div>

        {/* Books List / Grid */}
        {filteredAndSortedBooks.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="books-grid">
              {filteredAndSortedBooks.map((book) => (
                <div
                  key={book._id}
                  onClick={() => navigate(`/collection/${book.slug}`)}
                  className="glass-card book-card"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/collection/${book.slug}`); }}
                >
                  <div className="book-card-cover-wrapper">
                    <img
                      src={`${API_BASE_URL}/${book.coverPath}`}
                      alt={book.coverAlt || `Cover page of ${book.title}`}
                      className="book-card-cover"
                      loading="lazy"
                    />
                    <div className="book-card-overlay">
                      <button className="btn btn-primary btn-sm">
                        <Eye size={14} /> View Document
                      </button>
                    </div>
                    <span className="book-format-badge">
                      <FileText size={11} /> PDF Archive
                    </span>
                  </div>

                  <div className="book-card-meta">
                    <h3 className="book-card-title">{book.title}</h3>
                    {book.author && (
                      <p className="book-card-author">
                        <User size={13} className="inline-icon" /> {book.author}
                      </p>
                    )}
                    {book.description && (
                      <p className="book-card-snippet">
                        {book.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="books-list-view">
              {filteredAndSortedBooks.map((book) => (
                <div
                  key={book._id}
                  onClick={() => navigate(`/collection/${book.slug}`)}
                  className="glass-card book-list-item"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/collection/${book.slug}`); }}
                >
                  <div className="book-list-thumb-wrapper">
                    <img
                      src={`${API_BASE_URL}/${book.coverPath}`}
                      alt={book.coverAlt || book.title}
                      className="book-list-thumb"
                      loading="lazy"
                    />
                  </div>

                  <div className="book-list-content">
                    <div className="book-list-header">
                      <h3 className="book-list-title">{book.title}</h3>
                      <span className="book-format-badge list-badge">
                        <FileText size={11} /> PDF Document
                      </span>
                    </div>

                    {book.author && (
                      <p className="book-list-author">
                        <strong>Author / Archivist:</strong> {book.author}
                      </p>
                    )}

                    {book.description && (
                      <p className="book-list-description">
                        {book.description}
                      </p>
                    )}
                  </div>

                  <div className="book-list-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPdf(book.slug);
                      }}
                      className="btn btn-primary btn-sm"
                      title="Read PDF in browser"
                    >
                      Read PDF <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="glass-card empty-collection-state">
            <BookOpen size={52} className="empty-state-icon" />
            <h2>No Documents Found</h2>
            <p>
              {searchQuery
                ? `No books or records match "${searchQuery}". Try searching for another keyword or author.`
                : 'The library archive is currently being prepared. Check back soon for new historical publications.'}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Book Details Modal */}
      {selectedBook && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div 
            className="glass-card book-modal-content" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-book-title"
          >
            <button 
              onClick={handleCloseModal} 
              className="modal-close-btn" 
              aria-label="Close details"
              title="Close modal"
            >
              <X size={20} />
            </button>

            <div className="book-modal-layout">
              {/* Cover Column */}
              <div className="modal-cover-column">
                <div className="modal-cover-frame">
                  <img 
                    src={`${API_BASE_URL}/${selectedBook.coverPath}`} 
                    alt={selectedBook.coverAlt || `Cover page of ${selectedBook.title}`} 
                    className="modal-cover-image"
                  />
                </div>
              </div>

              {/* Info Column */}
              <div className="modal-info-column">
                <div className="modal-badge-row">
                  <span className="modal-type-badge">
                    <Bookmark size={12} /> Archival Publication
                  </span>
                  <span className="modal-format-badge">
                    <FileText size={12} /> Digital PDF
                  </span>
                </div>

                <h2 id="modal-book-title" className="modal-book-title">
                  {selectedBook.title}
                </h2>

                {selectedBook.author && (
                  <p className="modal-book-author">
                    Authored / Preserved by: <strong>{selectedBook.author}</strong>
                  </p>
                )}

                <div className="modal-divider"></div>

                <div className="modal-description-wrapper">
                  <h4 className="modal-section-heading">About this Document</h4>
                  <p className="modal-book-description">
                    {selectedBook.description || 'No additional historical notes have been added for this catalog entry.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="modal-actions">
                  <button 
                    onClick={() => handleOpenPdf(selectedBook.slug)} 
                    className="btn btn-primary open-pdf-btn"
                  >
                    Open PDF Document <ExternalLink size={16} />
                  </button>

                  <button
                    onClick={handleShare}
                    className="btn btn-secondary share-btn"
                    title="Copy direct share link"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={16} style={{ color: 'var(--success)' }} /> Link Copied!
                      </>
                    ) : (
                      <>
                        <Share2 size={16} /> Share Link
                      </>
                    )}
                  </button>

                  <button 
                    onClick={handleCloseModal} 
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
