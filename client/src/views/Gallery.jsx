import React, { useState, useEffect, useCallback } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Sparkles } from 'lucide-react';

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const API_BASE_URL = (import.meta.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

  const getImageUrl = (imgPath) => {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    const uploadIndex = imgPath.indexOf('uploads/');
    const cleanPath = uploadIndex !== -1 ? imgPath.slice(uploadIndex) : imgPath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${API_BASE_URL}/${cleanPath}`;
  };

  // Fetch all public photos on mount.
  useEffect(() => {
    async function fetchPhotos() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/public/photos`);
        if (res.ok) {
          const data = await res.json();
          setPhotos(data);
        }
      } catch (err) {
        console.error('Error fetching gallery photos:', err);
      } finally {
        setLoading(false);
      }
    }

    const debounceTimer = setTimeout(() => {
      fetchPhotos();
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [API_BASE_URL]);

  // Lightbox navigation handlers
  const openLightbox = (index) => {
    setLightboxIndex(index);
    setIsZoomed(false);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setIsZoomed(false);
    document.body.style.overflow = '';
  };

  const nextPhoto = useCallback(() => {
    if (lightboxIndex === null || photos.length === 0) return;
    setLightboxIndex((prev) => (prev + 1) % photos.length);
    setIsZoomed(false);
  }, [lightboxIndex, photos.length]);

  const prevPhoto = useCallback(() => {
    if (lightboxIndex === null || photos.length === 0) return;
    setLightboxIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setIsZoomed(false);
  }, [lightboxIndex, photos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, nextPhoto, prevPhoto]);

  const activePhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className="gallery-view">
      <div className="container">
        {/* Header Section */}
        <div className="gallery-hero-header">
          <div className="gallery-hero-badge">
            <Sparkles size={14} /> Historical Visual Archives
          </div>
          <h1 className="page-title">Ancestral Photo Gallery</h1>
          <p className="page-subtitle">
            A preserved visual chronicle of vintage moments, family portraits, gatherings, and historical landmarks across generations.
          </p>
        </div>

        {/* Photos Grid / Masonry */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Gathering photographs from the archive...</p>
          </div>
        ) : photos.length > 0 ? (
          <>
            <div className="gallery-grid">
              {photos.map((photo, index) => (
                <div 
                  key={photo._id} 
                  className="gallery-card glass-card"
                  onClick={() => openLightbox(index)}
                >
                  <div className="gallery-image-wrapper">
                    <img
                      src={getImageUrl(photo.imageUrl || photo.imagePath)}
                      alt={photo.title}
                      className="gallery-image"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="glass-card empty-gallery-state">
            <Camera size={52} className="empty-state-icon" />
            <h2>No Photographs Found</h2>
            <p>
              The historical photo archive is currently being cataloged. Check back soon!
            </p>
          </div>
        )}
      </div>

      {/* Full-Screen Lightbox Modal */}
      {activePhoto && (
        <div className="lightbox-backdrop" onClick={closeLightbox}>
          <div className="lightbox-modal" onClick={(e) => e.stopPropagation()}>
            {/* Top Toolbar */}
            <div className="lightbox-top-bar">
              <div className="lightbox-counter">
                {lightboxIndex + 1} / {photos.length}
              </div>

              <div className="lightbox-controls">
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="lightbox-btn"
                  title={isZoomed ? "Zoom Out" : "Zoom In"}
                  aria-label="Toggle zoom"
                >
                  {isZoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
                </button>

                <a
                  href={getImageUrl(activePhoto.imageUrl || activePhoto.imagePath)}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="lightbox-btn"
                  title="Download Image"
                  aria-label="Download image"
                >
                  <Download size={18} />
                </a>

                <button
                  onClick={closeLightbox}
                  className="lightbox-btn close-btn"
                  title="Close (Esc)"
                  aria-label="Close lightbox"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Lightbox Content Area */}
            <div className="lightbox-main-view">
              {/* Previous Button */}
              {photos.length > 1 && (
                <button
                  onClick={prevPhoto}
                  className="lightbox-nav-btn prev"
                  title="Previous photograph (Left Arrow)"
                  aria-label="Previous photograph"
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              {/* Photo View Container */}
              <div className={`lightbox-image-container ${isZoomed ? 'zoomed' : ''}`}>
                <img
                  src={getImageUrl(activePhoto.imageUrl || activePhoto.imagePath)}
                  alt={activePhoto.title}
                  className="lightbox-image"
                />
              </div>

              {/* Next Button */}
              {photos.length > 1 && (
                <button
                  onClick={nextPhoto}
                  className="lightbox-nav-btn next"
                  title="Next photograph (Right Arrow)"
                  aria-label="Next photograph"
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
