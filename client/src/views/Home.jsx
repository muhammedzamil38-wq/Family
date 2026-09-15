import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Users, ArrowRight, HelpCircle } from 'lucide-react';
import DynamicIcon from '../components/DynamicIcon';

export default function Home() {
  const [siteContent, setSiteContent] = useState({
    hero: {
      imagePath: '',
      altText: 'Family Heritage',
      title: 'Our Family Archive',
      subtitle: 'Preserving our history, photographs, and family connections.',
    },
    qualities: [],
    about: {
      text: ''
    }
  });
  const [featuredPhotos, setFeaturedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = (import.meta.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch site configurations
        const contentRes = await fetch(`${API_BASE_URL}/api/v1/public/site-content`);
        if (contentRes.ok) {
          const contentData = await contentRes.json();
          setSiteContent({
            hero: contentData.hero || siteContent.hero,
            qualities: contentData.qualities || [],
            about: contentData.about || siteContent.about
          });
        }

        // Fetch recent/featured photos
        const photosRes = await fetch(`${API_BASE_URL}/api/v1/public/photos`);
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          // Take first 4 photos for home preview
          setFeaturedPhotos(photosData.slice(0, 4));
        }
      } catch (err) {
        console.error('Error fetching public home content:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [API_BASE_URL]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading the archive...</p>
      </div>
    );
  }

  const { hero, qualities, about } = siteContent;

  // Resolve image URL cleanly whether relative or legacy absolute
  const getImageUrl = (imgPath) => {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    const uploadIndex = imgPath.indexOf('uploads/');
    const cleanPath = uploadIndex !== -1 ? imgPath.slice(uploadIndex) : imgPath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${API_BASE_URL}/${cleanPath}`;
  };

  const heroImageSrc = getImageUrl(hero?.imageUrl || hero?.imagePath);

  return (
    <div className="home-view">
      {/* 1. Hero Section */}
      <section 
        className="hero-section" 
        aria-label="Welcome banner"
      >
        {heroImageSrc && (
          <img
            className="hero-image"
            src={heroImageSrc}
            alt={hero?.altText || hero?.title || 'Family heritage'}
          />
        )}
        <div className="hero-overlay">
          <div className="hero-content glass-card">
            <h1 className="hero-title">{hero?.title || 'Our Family Archive'}</h1>
            <p className="hero-subtitle">{hero?.subtitle || 'Preserving our history and photographs across generations.'}</p>
          </div>
        </div>
      </section>

      <div className="container">
        {/* 2. Our Qualities Section */}
        {qualities && qualities.length > 0 && (
          <section className="qualities-section" id="qualities">
            <h2 className="section-title">Our Family Values</h2>
            <div className="qualities-grid">
              {qualities.map((quality) => (
                <div className="glass-card quality-card" key={quality.id || quality.title}>
                  <div className="quality-icon-wrapper">
                    <DynamicIcon name={quality.iconName || 'HelpCircle'} size={28} className="quality-icon" />
                  </div>
                  <h3 className="quality-title">{quality.title}</h3>
                  <p className="quality-description">{quality.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Featured Photo Gallery Section */}
        <section className="featured-section">
          <div className="section-header">
            <div>
              <h2 className="section-title text-left">Photo Gallery</h2>
              <p className="section-subtitle">Glimpses from 1980 onwards and our cherished family moments.</p>
            </div>
            <Link to="/gallery" className="view-all-link">
              View All Photos <ArrowRight size={16} />
            </Link>
          </div>

          {featuredPhotos.length > 0 ? (
            <>
              <div className="gallery-masonry-grid mt-4">
                {featuredPhotos.map((photo) => (
                  <Link to="/gallery" key={photo._id} className="glass-card gallery-photo-card">
                    <div className="photo-media-wrapper">
                      {(photo.resourceType || 'image') === 'video' ? (
                        <video src={getImageUrl(photo.imageUrl)} className="gallery-photo-img" muted preload="metadata" />
                      ) : (
                        <img src={getImageUrl(photo.imageUrl || photo.imagePath)} alt={photo.title} className="gallery-photo-img" loading="lazy" />
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              <Link to="/gallery" className="view-all-link view-all-link-mobile">
                View All Photos <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <div className="glass-card empty-featured">
              <Camera size={40} className="empty-icon" />
              <p>Our photo gallery is currently being curated.</p>
              <Link to="/gallery" className="btn btn-secondary mt-3">Open Gallery</Link>
            </div>
          )}
        </section>

        {/* 4. Family Tree Preview Section */}
        <section className="family-preview-section">
          <div className="glass-card family-preview-card">
            <div className="family-preview-content">
              <h2 className="section-title">Heritage & Family Tree</h2>
              <p className="preview-text">
                Discover our interactive family lineage. Trace connections across generations, explore biographies, and view portraits of founding members and descendants.
              </p>
              <Link to="/family" className="btn btn-primary">
                <Users size={18} /> Open Family Tree
              </Link>
            </div>
          </div>
        </section>

        {/* 5. About Us Narrative Section */}
        {about && about.text && (
          <section className="about-section" id="about">
            <h2 className="section-title">About Our Family</h2>
            <div className="glass-card about-card">
              <p className="about-text-content">
                {about.text}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
