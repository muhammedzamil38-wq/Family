import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, BookOpen, Users, FileText, Settings, 
  LogOut, Plus, Edit, Trash2, Globe, Eye, EyeOff, 
  Upload, AlertTriangle, Save, RefreshCw, X, ChevronRight, Check,
  Camera, Image as ImageIcon, Video, MapPin, Calendar, Tag, Search, Pin
} from 'lucide-react';
import DynamicIcon from '../components/DynamicIcon';

export default function AdminPanel() {
  const { user, logoutUser, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const API_BASE_URL = (import.meta.env.API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

  const getImageUrl = (imgPath) => {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    const uploadIndex = imgPath.indexOf('uploads/');
    const cleanPath = uploadIndex !== -1 ? imgPath.slice(uploadIndex) : imgPath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${API_BASE_URL}/${cleanPath}`;
  };

  // Navigation / Tabs State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // General CMS Data States
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [siteContent, setSiteContent] = useState(null);
  
  // Loading & Error States
  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cmsErrors, setCmsErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Modals & Forms States
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null); // null if creating, book object if editing
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // null if creating, member object if editing
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null); // null if creating, photo object if editing
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

  // Forms Reference Hooks / Controlled States
  // 1. Books Form
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [bookDisplayOrder, setBookDisplayOrder] = useState(0);
  const [bookCoverAlt, setBookCoverAlt] = useState('');
  const [bookFile, setBookFile] = useState(null);

  // 2. Family Form
  const [memberFullName, setMemberFullName] = useState('');
  const [memberParentId, setMemberParentId] = useState('');
  const [memberRelationship, setMemberRelationship] = useState('');
  const [memberBirthYear, setMemberBirthYear] = useState('');
  const [memberDeathYear, setMemberDeathYear] = useState('');
  const [memberBio, setMemberBio] = useState('');
  const [memberDisplayOrder, setMemberDisplayOrder] = useState(0);
  const [memberIsVisible, setMemberIsVisible] = useState(true);
  const [memberPortraitFile, setMemberPortraitFile] = useState(null);
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [familySearchQuery, setFamilySearchQuery] = useState('');

  // 3. Family Delete Strategy Form
  const [deleteStrategy, setDeleteStrategy] = useState('delete_branch'); // 'delete_branch' | 'move_children'
  const [reparentTargetId, setReparentTargetId] = useState('');

  // 4. Photo Gallery Form
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);

  // 5. Site Content Forms
  const [contentSubTab, setContentSubTab] = useState('hero'); // 'hero' | 'qualities' | 'about'
  // Hero Fields
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroAltText, setHeroAltText] = useState('');
  const [heroImageFile, setHeroImageFile] = useState(null);
  // About Narrative Fields
  const [aboutText, setAboutText] = useState('');
  const [originalAboutText, setOriginalAboutText] = useState(''); // Tracking changes
  // Qualities list is edited inline
  const [qualities, setQualities] = useState([]);
  const [contactContent, setContactContent] = useState({ intro: '', email: '', phone: '', location: '' });

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login');
    }
  }, [user, authLoading, navigate]);

  // Load dashboard / models content on mount or tab change
  const refreshData = async () => {
    setLoadingData(true);
    setCmsErrors([]);
    try {
      // 1. Dashboard Stats
      const statsRes = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard`, { credentials: 'include' });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Books list
      const booksRes = await fetch(`${API_BASE_URL}/api/v1/admin/books`, { credentials: 'include' });
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData);
      }

      // 3. Family list
      const familyRes = await fetch(`${API_BASE_URL}/api/v1/admin/family-members`, { credentials: 'include' });
      if (familyRes.ok) {
        const familyData = await familyRes.json();
        setFamilyMembers(familyData);
      }

      // 4. Photos list
      const photosRes = await fetch(`${API_BASE_URL}/api/v1/admin/photos`, { credentials: 'include' });
      if (photosRes.ok) {
        const photosData = await photosRes.json();
        setPhotos(photosData);
      }

      // 4. Site Content keys
      const siteKeys = ['hero', 'qualities', 'about', 'contact'];
      const fetchedContent = {};
      for (const key of siteKeys) {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/site-content/${key}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          fetchedContent[key] = data.value;
        }
      }
      setSiteContent(fetchedContent);

      // Seed Site Content Forms state
      if (fetchedContent.hero) {
        setHeroTitle(fetchedContent.hero.title || '');
        setHeroSubtitle(fetchedContent.hero.subtitle || '');
        setHeroAltText(fetchedContent.hero.altText || '');
      }
      if (fetchedContent.contact) {
        setContactContent({ intro: '', email: '', phone: '', location: '', ...fetchedContent.contact });
      }
      if (fetchedContent.about) {
        setAboutText(fetchedContent.about.text || '');
        setOriginalAboutText(fetchedContent.about.text || '');
      }
      if (fetchedContent.qualities) {
        setQualities(fetchedContent.qualities || []);
      }

    } catch (error) {
      console.error('Error loading CMS data:', error);
      setCmsErrors(['Failed to retrieve records from the server database.']);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  // Flash alerts clearing helper
  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Logout handler
  const handleLogout = async () => {
    await logoutUser();
    navigate('/admin/login');
  };

  /* =========================================================================
     Book Handlers
     ========================================================================= */
  const openBookForm = (book = null) => {
    setEditingBook(book);
    setCmsErrors([]);
    if (book) {
      setBookTitle(book.title);
      setBookAuthor(book.author || '');
      setBookDescription(book.description || '');
      setBookDisplayOrder(book.displayOrder || 0);
      setBookCoverAlt(book.coverAlt || '');
    } else {
      setBookTitle('');
      setBookAuthor('');
      setBookDescription('');
      setBookDisplayOrder(0);
      setBookCoverAlt('');
    }
    setBookFile(null);
    setShowBookModal(true);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setCmsErrors([]);
    setActionLoading(true);

    if (!bookTitle) {
      setCmsErrors(['Book title is required.']);
      setActionLoading(false);
      return;
    }
    if (!editingBook && !bookFile) {
      setCmsErrors(['You must upload a PDF document file to create a book catalog record.']);
      setActionLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', bookTitle);
    formData.append('author', bookAuthor);
    formData.append('description', bookDescription);
    formData.append('displayOrder', bookDisplayOrder);
    formData.append('coverAlt', bookCoverAlt);
    if (bookFile) {
      formData.append('pdf', bookFile);
    }

    try {
      const url = editingBook 
        ? `${API_BASE_URL}/api/v1/admin/books/${editingBook._id}`
        : `${API_BASE_URL}/api/v1/admin/books`;

      const method = editingBook ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(editingBook ? 'Book updated successfully!' : 'Book created and cataloged!');
        setShowBookModal(false);
        refreshData();
      } else {
        setCmsErrors(data.errors || [data.message || 'Book action failed']);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Network connection error processing book.']);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBookStatus = async (book) => {
    setCmsErrors([]);
    const nextStatus = book.status === 'published' ? 'ready' : 'published';
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/books/${book._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok) {
        showSuccess(`Book status updated to ${nextStatus}!`);
        refreshData();
      } else {
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Error changing book status.']);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you absolutely sure you want to delete this book? This deletes the PDF file, cover, and records permanently.')) {
      return;
    }
    setCmsErrors([]);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/books/${bookId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        showSuccess('Book deleted from storage.');
        refreshData();
      } else {
        const data = await response.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Failed to delete book from database.']);
    }
  };

  /* =========================================================================
     Family Tree Handlers
     ========================================================================= */
  const openMemberForm = (member = null) => {
    setEditingMember(member);
    setCmsErrors([]);
    setParentSearchQuery('');
    if (member) {
      setMemberFullName(member.fullName);
      setMemberParentId(member.parentId || '');
      setMemberRelationship(member.relationshipLabel || '');
      setMemberBirthYear(member.birthYear || '');
      setMemberDeathYear(member.deathYear || '');
      setMemberBio(member.bio || '');
      setMemberDisplayOrder(member.displayOrder || 0);
      setMemberIsVisible(member.isVisible);
    } else {
      setMemberFullName('');
      setMemberParentId('');
      setMemberRelationship('');
      setMemberBirthYear('');
      setMemberDeathYear('');
      setMemberBio('');
      setMemberDisplayOrder(0);
      setMemberIsVisible(true);
    }
    setMemberPortraitFile(null);
    setShowMemberModal(true);
  };

  const openMemberDetails = (member) => {
    setSelectedMember(member);
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setCmsErrors([]);
    setActionLoading(true);

    if (!memberFullName) {
      setCmsErrors(['Full name is required.']);
      setActionLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('fullName', memberFullName);
    formData.append('parentId', memberParentId);
    formData.append('relationshipLabel', memberRelationship);
    formData.append('birthYear', memberBirthYear);
    formData.append('deathYear', memberDeathYear);
    formData.append('bio', memberBio);
    formData.append('displayOrder', memberDisplayOrder);
    formData.append('isVisible', memberIsVisible);
    if (memberPortraitFile) {
      formData.append('portrait', memberPortraitFile);
    }

    try {
      const url = editingMember
        ? `${API_BASE_URL}/api/v1/admin/family-members/${editingMember._id}`
        : `${API_BASE_URL}/api/v1/admin/family-members`;

      const method = editingMember ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(editingMember ? 'Family member updated!' : 'Family member added to tree!');
        setShowMemberModal(false);
        refreshData();
      } else {
        setCmsErrors(data.errors || [data.message || 'Member action failed']);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Network error processing family member.']);
    } finally {
      setActionLoading(false);
    }
  };

  const startDeleteMember = (member) => {
    setMemberToDelete(member);
    setCmsErrors([]);
    setDeleteStrategy('delete_branch');
    setReparentTargetId('');
    setShowDeleteMemberModal(true);
  };

  const handleDeleteMemberSubmit = async (e) => {
    e.preventDefault();
    setCmsErrors([]);
    setActionLoading(true);

    try {
      let queryStr = `deleteStrategy=${deleteStrategy}`;
      if (deleteStrategy === 'move_children' && reparentTargetId) {
        queryStr += `&newParentId=${reparentTargetId}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/family-members/${memberToDelete._id}?${queryStr}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        showSuccess('Family tree member deleted.');
        setShowDeleteMemberModal(false);
        setMemberToDelete(null);
        refreshData();
      } else {
        const data = await response.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Failed to complete member deletion.']);
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================================
     Site Content Handlers
     ========================================================================= */
  const handleHeroSubmit = async (e) => {
    e.preventDefault();
    setCmsErrors([]);
    setActionLoading(true);

    const formData = new FormData();
    const heroData = {
      title: heroTitle,
      subtitle: heroSubtitle,
      altText: heroAltText
    };
    formData.append('value', JSON.stringify(heroData));
    if (heroImageFile) {
      formData.append('image', heroImageFile);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/site-content/hero`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        showSuccess('Hero section settings updated!');
        setHeroImageFile(null);
        refreshData();
      } else {
        const data = await response.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Network error saving hero settings.']);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAboutSubmit = async (e) => {
    e.preventDefault();
    setCmsErrors([]);
    setActionLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/site-content/about`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: { text: aboutText } }),
        credentials: 'include'
      });

      if (response.ok) {
        showSuccess('About Us section updated!');
        setOriginalAboutText(aboutText); // reset unsaved tracker
        refreshData();
      } else {
        const data = await response.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Network error saving narrative contents.']);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAboutCancel = () => {
    if (aboutText !== originalAboutText) {
      if (!window.confirm('You have unsaved changes in the text editor. Are you sure you want to discard them?')) {
        return;
      }
    }
    setAboutText(originalAboutText);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setCmsErrors([]);
    setActionLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/site-content/contact`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: contactContent }),
        credentials: 'include'
      });

      if (response.ok) {
        showSuccess('Contact details updated!');
        refreshData();
      } else {
        const data = await response.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Network error saving contact details.']);
    } finally {
      setActionLoading(false);
    }
  };

  // Qualities management
  const handleQualityChange = (index, field, val) => {
    const updated = [...qualities];
    updated[index][field] = val;
    setQualities(updated);
  };

  const handleQualityVisibilityToggle = (index) => {
    const updated = [...qualities];
    updated[index].isVisible = !updated[index].isVisible;
    setQualities(updated);
  };

  const addQualityCard = () => {
    const nextOrder = qualities.length + 1;
    setQualities([
      ...qualities,
      {
        id: `quality-${Date.now()}`,
        title: 'New Quality',
        description: 'Description of the quality.',
        iconName: 'Users',
        displayOrder: nextOrder,
        isVisible: true
      }
    ]);
  };

  const deleteQualityCard = (index) => {
    const updated = qualities.filter((_, i) => i !== index);
    // Renumber display orders
    updated.forEach((q, idx) => {
      q.displayOrder = idx + 1;
    });
    setQualities(updated);
  };

  const saveQualitiesList = async () => {
    setCmsErrors([]);
    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/site-content/qualities`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: qualities }),
        credentials: 'include'
      });

      if (response.ok) {
        showSuccess('Qualities grid saved successfully!');
        refreshData();
      } else {
        const data = await response.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Network error saving qualities.']);
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================================
     Photo Gallery Handlers
     ========================================================================= */
  const openPhotoForm = (photo = null) => {
    setEditingPhoto(photo);
    setCmsErrors([]);
    if (photo) {
      setPhotoPreviewUrls([getImageUrl(photo.imageUrl || photo.imagePath)]);
    } else {
      setPhotoPreviewUrls([]);
    }
    setPhotoFiles([]);
    setShowPhotoModal(true);
  };

  const handlePhotoFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const selectedFiles = editingPhoto ? files.slice(0, 1) : files;
    setPhotoFiles(selectedFiles);
    setPhotoPreviewUrls(selectedFiles.map(file => URL.createObjectURL(file)));
  };

  const handlePhotoSubmit = async (e) => {
    e.preventDefault();
    setCmsErrors([]);
    setActionLoading(true);

    const filesToUpload = editingPhoto ? photoFiles.slice(0, 1) : photoFiles;
    if (filesToUpload.length === 0) {
      setCmsErrors(['Please select at least one image file to upload.']);
      setActionLoading(false);
      return;
    }

    const uploadedMedia = [];
    const cleanupUploadedMedia = async () => {
      await Promise.all(uploadedMedia.map((media) => fetch(`${API_BASE_URL}/api/v1/admin/photos/cleanup-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: media.cloudinaryPublicId, resourceType: media.resourceType }),
        credentials: 'include'
      })));
    };

    try {
      if (editingPhoto) {
        const formData = new FormData();
        formData.append('photo', filesToUpload[0]);
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/photos/${editingPhoto._id}`, {
          method: 'PATCH', body: formData, credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error((data.errors || [data.message]).join(', '));
      } else {
        for (const file of filesToUpload) {
          const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
          const maxBytes = resourceType === 'video' ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
          if (file.size > maxBytes) {
            throw new Error(`${resourceType === 'video' ? 'Video' : 'Photo'} files must be ${resourceType === 'video' ? '100MB' : '5MB'} or smaller.`);
          }
          const signatureRes = await fetch(`${API_BASE_URL}/api/v1/admin/photos/upload-signature?resourceType=${resourceType}`, { credentials: 'include' });
          const signature = await signatureRes.json();
          if (!signatureRes.ok) throw new Error((signature.errors || [signature.message]).join(', '));

          const cloudinaryForm = new FormData();
          cloudinaryForm.append('file', file);
          cloudinaryForm.append('api_key', signature.apiKey);
          cloudinaryForm.append('timestamp', signature.timestamp);
          cloudinaryForm.append('folder', signature.folder);
          cloudinaryForm.append('signature', signature.signature);
          const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`, {
            method: 'POST', body: cloudinaryForm
          });
          const cloudinaryData = await cloudinaryRes.json();
          if (!cloudinaryRes.ok) throw new Error(cloudinaryData.error?.message || 'Cloudinary upload failed.');
          uploadedMedia.push({
            imageUrl: cloudinaryData.secure_url,
            cloudinaryPublicId: cloudinaryData.public_id,
            resourceType
          });
        }

        const recordsRes = await fetch(`${API_BASE_URL}/api/v1/admin/photos/batch-records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: uploadedMedia }),
          credentials: 'include'
        });
        const recordsData = await recordsRes.json();
        if (!recordsRes.ok) throw new Error((recordsData.errors || [recordsData.message]).join(', '));
      }

      showSuccess(editingPhoto
        ? 'Photograph updated successfully!'
        : `${filesToUpload.length} photograph${filesToUpload.length === 1 ? '' : 's'} added to the gallery!`);
      setShowPhotoModal(false);
      refreshData();
    } catch (err) {
      if (!editingPhoto && uploadedMedia.length > 0) {
        await cleanupUploadedMedia();
      }
      console.error('Error saving photo:', err);
      setCmsErrors([err.message || 'Network error saving photograph.']);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePhotoVisibility = async (photo) => {
    setCmsErrors([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/photos/${photo._id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !photo.isVisible }),
        credentials: 'include'
      });
      if (res.ok) {
        showSuccess(`Photo visibility updated!`);
        refreshData();
      } else {
        const data = await res.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Error changing photograph visibility.']);
    }
  };

  const handleTogglePhotoPinning = async (photo) => {
    setCmsErrors([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/photos/${photo._id}/pinning`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !photo.isPinned }),
        credentials: 'include'
      });
      if (res.ok) {
        showSuccess(photo.isPinned ? 'Photo unpinned.' : 'Photo pinned to the front of the gallery.');
        refreshData();
      } else {
        const data = await res.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Error changing photograph pinning.']);
    }
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotoIds((currentIds) => currentIds.includes(photoId)
      ? currentIds.filter((id) => id !== photoId)
      : [...currentIds, photoId]);
  };

  const toggleSelectAllPhotos = () => {
    setSelectedPhotoIds((currentIds) => currentIds.length === photos.length
      ? []
      : photos.map((photo) => photo._id));
  };

  const handleDeleteSelectedPhotos = async () => {
    if (selectedPhotoIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedPhotoIds.length} selected gallery item${selectedPhotoIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return;

    setCmsErrors([]);
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/photos/batch`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPhotoIds }),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.errors || [data.message]).join(', '));

      showSuccess(data.message);
      setSelectedPhotoIds([]);
      refreshData();
    } catch (err) {
      console.error(err);
      setCmsErrors([err.message || 'Failed to delete selected gallery items.']);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeletePhoto = (photo) => {
    setPhotoToDelete(photo);
    setShowDeletePhotoModal(true);
  };

  const handleDeletePhotoConfirm = async () => {
    if (!photoToDelete) return;
    setCmsErrors([]);
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/photos/${photoToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        showSuccess('Photograph deleted from gallery.');
        setShowDeletePhotoModal(false);
        setPhotoToDelete(null);
        refreshData();
      } else {
        const data = await res.json();
        setCmsErrors(data.errors || [data.message]);
      }
    } catch (err) {
      console.error(err);
      setCmsErrors(['Failed to delete photograph.']);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter list of family members for searchable parent selector
  const filteredParentsOptions = familyMembers
    .filter(m => {
      // Prevent selecting self as parent
      if (editingMember && m._id === editingMember._id) return false;
      
      // Search matching query
      if (parentSearchQuery) {
        return m.fullName.toLowerCase().includes(parentSearchQuery.toLowerCase());
      }
      return true;
    });

  const filteredFamilyMembers = familyMembers.filter((member) => {
    const parentName = familyMembers.find(m => m._id === member.parentId)?.fullName || 'None (Founder)';
    const searchText = [member.fullName, parentName, member.relationshipLabel].filter(Boolean).join(' ').toLowerCase();
    return searchText.includes(familySearchQuery.trim().toLowerCase());
  });

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* 1. Sidebar Left Rail */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <h3>Heritage Panel</h3>
          <button className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-user">
          <p className="user-name">{user?.name || 'Administrator'}</p>
          <p className="user-role">System Admin</p>
        </div>

        <nav className="sidebar-nav">
          <button 
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('photos'); setMobileMenuOpen(false); }}
            className={`sidebar-nav-item ${activeTab === 'photos' ? 'active' : ''}`}
          >
            <Camera size={18} /> Photo Gallery
          </button>
          <button 
            onClick={() => { setActiveTab('family'); setMobileMenuOpen(false); }}
            className={`sidebar-nav-item ${activeTab === 'family' ? 'active' : ''}`}
          >
            <Users size={18} /> Family Tree
          </button>
          <button 
            onClick={() => { setActiveTab('content'); setMobileMenuOpen(false); }}
            className={`sidebar-nav-item ${activeTab === 'content' ? 'active' : ''}`}
          >
            <FileText size={18} /> Site Content
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn btn-secondary logout-btn w-full">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* 2. Main CMS Workspace Area */}
      <main className="admin-content-area">
        {/* Header bar */}
        <header className="admin-content-header glass-card">
          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
            <Users size={20} />
          </button>
          <h2>
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'books' && 'Book Catalog Manager'}
            {activeTab === 'family' && 'Family Tree Builder'}
            {activeTab === 'photos' && 'Vintage Photo Gallery Manager'}
            {activeTab === 'content' && 'Site Content settings'}
          </h2>
          <div className="header-status-indicator">
            <span className="dot online"></span> Secure Session
          </div>
        </header>

        {/* Status Alerts banner */}
        {successMessage && (
          <div className="cms-alert-banner success glass-card animate-fade-in">
            <Check size={18} className="alert-icon" />
            <p>{successMessage}</p>
          </div>
        )}

        {cmsErrors.length > 0 && (
          <div className="cms-alert-banner danger glass-card">
            <AlertTriangle size={18} className="alert-icon" />
            <div className="errors-list">
              {cmsErrors.map((err, i) => <p key={i}>{err}</p>)}
            </div>
          </div>
        )}

        {loadingData ? (
          <div className="cms-loading-overlay">
            <RefreshCw size={36} className="animate-spin text-accent" />
            <p className="mt-3">Loading details from database...</p>
          </div>
        ) : (
          <div className="workspace-tab-container">
            
            {/* TAB 1: DASHBOARD OVERVIEW */}
            {activeTab === 'dashboard' && stats && (
              <div className="dashboard-grid animate-fade-in">
                {/* Metric cards */}
                <div className="metric-cards-row">
                  <div className="glass-card metric-card">
                    <BookOpen size={24} className="metric-icon" />
                    <div className="metric-info">
                      <p className="metric-label">Published Books</p>
                      <h3 className="metric-value">{stats.publishedBookCount}</h3>
                    </div>
                  </div>
                  <div className="glass-card metric-card">
                    <Camera size={24} className="metric-icon" />
                    <div className="metric-info">
                      <p className="metric-label">Historical Photos</p>
                      <h3 className="metric-value">{stats.photoCount ?? photos.length}</h3>
                    </div>
                  </div>
                  <div className="glass-card metric-card">
                    <Users size={24} className="metric-icon" />
                    <div className="metric-info">
                      <p className="metric-label">Family Members</p>
                      <h3 className="metric-value">{stats.familyMemberCount}</h3>
                    </div>
                  </div>
                  <div className="glass-card metric-card">
                    <Globe size={24} className="metric-icon" />
                    <div className="metric-info">
                      <p className="metric-label">Hero Banner Image</p>
                      <h3 className="metric-value">{stats.heroImageStatus ? 'Active' : 'Missing'}</h3>
                    </div>
                  </div>
                </div>

                <div className="dashboard-columns-row">
                  <div className="glass-card dashboard-main-card">
                    <h3>Quick Administration Actions</h3>
                    <p className="card-subtitle">Perform common content tasks without navigating nested directories.</p>
                    
                    <div className="shortcuts-grid">
                      <button onClick={() => openBookForm(null)} className="btn btn-primary shortcut-btn">
                        <Plus size={16} /> Catalog New PDF Book
                      </button>
                      <button onClick={() => openPhotoForm(null)} className="btn btn-primary shortcut-btn">
                        <Camera size={16} /> Upload Vintage Photo
                      </button>
                      <button onClick={() => openMemberForm(null)} className="btn btn-primary shortcut-btn">
                        <Plus size={16} /> Add Family Tree Member
                      </button>
                      <button onClick={() => { setActiveTab('content'); setContentSubTab('about'); }} className="btn btn-secondary shortcut-btn">
                        <Edit size={16} /> Edit About Narrative
                      </button>
                    </div>
                  </div>

                  <div className="glass-card dashboard-meta-card">
                    <h3>Site Health & Meta</h3>
                    <div className="meta-list">
                      <div className="meta-item">
                        <span className="meta-label">Last Database Sync:</span>
                        <span className="meta-val">{new Date(stats.lastContentUpdate).toLocaleString()}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Storage Backend:</span>
                        <span className="meta-val">Local Persistent Volume</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Client Theme Defaults:</span>
                        <span className="meta-val">{siteContent?.settings?.defaultTheme || 'light'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BOOK CATALOG CMS */}
            {activeTab === 'books' && (
              <div className="books-cms-view animate-fade-in">
                <div className="cms-toolbar">
                  <button onClick={() => openBookForm(null)} className="btn btn-primary">
                    <Plus size={16} /> Add New Book PDF
                  </button>
                </div>

                <div className="glass-card table-card">
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>Cover</th>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Sort Order</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {books.length > 0 ? (
                        books.map((book) => (
                          <tr key={book._id}>
                            <td>
                              <div className="table-cover-wrapper">
                                {book.coverPath ? (
                                  <img src={`${API_BASE_URL}/${book.coverPath}`} alt={book.coverAlt} className="table-cover" />
                                ) : (
                                  <div className="table-cover-fallback"><BookOpen size={16} /></div>
                                )}
                              </div>
                            </td>
                            <td><strong>{book.title}</strong><br /><small className="slug-text">/{book.slug}</small></td>
                            <td>{book.author || '—'}</td>
                            <td>{book.displayOrder}</td>
                            <td>
                              <span className={`status-badge ${book.status}`}>
                                {book.status === 'published' && 'Published'}
                                {book.status === 'ready' && 'Ready to Publish'}
                                {book.status === 'draft' && 'Draft (No Cover)'}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button 
                                  onClick={() => handleToggleBookStatus(book)} 
                                  className={`btn-icon ${book.status === 'published' ? 'unpublish' : 'publish'}`}
                                  title={book.status === 'published' ? 'Unpublish (Hide)' : 'Publish (Show)'}
                                  disabled={book.status === 'draft'}
                                >
                                  {book.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button 
                                  onClick={() => openBookForm(book)} 
                                  className="btn-icon edit" 
                                  title="Edit properties"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteBook(book._id)} 
                                  className="btn-icon delete" 
                                  title="Delete book"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="table-empty">No books uploaded yet. Click "Add New Book PDF" above to begin.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: FAMILY TREE CMS */}
            {activeTab === 'family' && (
              <div className="family-cms-view animate-fade-in">
                <div className="cms-toolbar family-cms-toolbar">
                  <div className="family-search-control">
                    <Search size={17} className="family-search-icon" />
                    <input
                      type="search"
                      className="family-search-input"
                      placeholder="Search family members..."
                      value={familySearchQuery}
                      onChange={(event) => setFamilySearchQuery(event.target.value)}
                      aria-label="Search family members"
                    />
                    {familySearchQuery && (
                      <button
                        type="button"
                        className="family-search-clear"
                        onClick={() => setFamilySearchQuery('')}
                        aria-label="Clear family member search"
                        title="Clear search"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button onClick={() => openMemberForm(null)} className="btn btn-primary family-add-btn">
                    <Plus size={16} /> Add Family Member
                  </button>
                </div>

                <div className="glass-card table-card">
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>Portrait</th>
                        <th>Full Name</th>
                        <th>Root</th>
                        <th className="desktop-member-detail">Relationship</th>
                        <th className="desktop-member-detail">Years</th>
                        <th className="desktop-member-detail">Sort Order</th>
                        <th className="desktop-member-detail">Visible</th>
                        <th className="desktop-member-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFamilyMembers.length > 0 ? (
                        filteredFamilyMembers.map((member) => {
                          const parentName = familyMembers.find(m => m._id === member.parentId)?.fullName || 'None (Founder)';

                          return (
                            <tr key={member._id} onClick={() => openMemberDetails(member)} className="member-admin-row">
                              <td>
                                <div className="table-portrait-wrapper">
                                  {member.portraitPath ? (
                                    <img src={member.portraitPath.startsWith('http://') || member.portraitPath.startsWith('https://')
                                      ? member.portraitPath
                                      : `${API_BASE_URL}/${member.portraitPath}`} alt={member.fullName} className="table-portrait" />
                                  ) : (
                                    <div className="table-portrait-fallback"><Users size={16} /></div>
                                  )}
                                </div>
                              </td>
                              <td><strong>{member.fullName}</strong></td>
                              <td><span className="parent-indicator">{parentName}</span></td>
                              <td className="desktop-member-detail"><span className="relationship-badge">{member.relationshipLabel || '—'}</span></td>
                              <td className="desktop-member-detail">
                                {[member.birthYear, member.deathYear].filter(y => y !== undefined && y !== null).join(' – ') || '—'}
                              </td>
                              <td className="desktop-member-detail">{member.displayOrder}</td>
                              <td className="desktop-member-detail">
                                {member.isVisible ? (
                                  <span className="visibility-badge visible"><Eye size={14} /> Yes</span>
                                ) : (
                                  <span className="visibility-badge hidden"><EyeOff size={14} /> No</span>
                                )}
                              </td>
                              <td className="desktop-member-actions">
                                <div className="table-actions">
                                  <button
                                    onClick={(event) => { event.stopPropagation(); openMemberForm(member); }}
                                    className="btn-icon edit"
                                    title="Edit member"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={(event) => { event.stopPropagation(); startDeleteMember(member); }}
                                    className="btn-icon delete"
                                    title="Delete member"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="8" className="table-empty">
                            {familyMembers.length > 0 ? 'No family members match your search.' : 'No family member records found. Start by adding a founding member parent.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: SITE CONTENT CONFIG */}
            {activeTab === 'content' && (
              <div className="site-content-cms animate-fade-in">
                {/* Nested tabs */}
                <div className="content-sub-tabs glass-card">
                  <button 
                    onClick={() => setContentSubTab('hero')}
                    className={`sub-tab-btn ${contentSubTab === 'hero' ? 'active' : ''}`}
                  >
                    Hero Banner
                  </button>
                  <button 
                    onClick={() => setContentSubTab('qualities')}
                    className={`sub-tab-btn ${contentSubTab === 'qualities' ? 'active' : ''}`}
                  >
                    Values & Qualities
                  </button>
                  <button 
                    onClick={() => setContentSubTab('about')}
                    className={`sub-tab-btn ${contentSubTab === 'about' ? 'active' : ''}`}
                  >
                    About Narrative
                  </button>
                  <button
                    onClick={() => setContentSubTab('contact')}
                    className={`sub-tab-btn ${contentSubTab === 'contact' ? 'active' : ''}`}
                  >
                    Contact Details
                  </button>
                </div>

                {/* Content sub-tab panels */}
                <div className="sub-tab-content-panel">
                  
                  {/* Hero Sub-tab Form */}
                  {contentSubTab === 'hero' && (
                    <form onSubmit={handleHeroSubmit} className="glass-card content-form">
                      <h3>Hero Header Settings</h3>
                      <p className="card-subtitle">Upload the home page full-width hero background and customize texts.</p>
                      
                      <div className="form-grid">
                        <div className="form-group col-span-2">
                          <label className="form-label" htmlFor="hero-title-input">Hero Title</label>
                          <input 
                            id="hero-title-input"
                            type="text" 
                            className="glass-input" 
                            value={heroTitle} 
                            onChange={(e) => setHeroTitle(e.target.value)} 
                          />
                        </div>

                        <div className="form-group col-span-2">
                          <label className="form-label" htmlFor="hero-subtitle-input">Hero Subtitle</label>
                          <textarea 
                            id="hero-subtitle-input"
                            className="glass-input" 
                            value={heroSubtitle} 
                            onChange={(e) => setHeroSubtitle(e.target.value)} 
                          />
                        </div>

                        <div className="form-group col-span-2">
                          <label className="form-label" htmlFor="hero-img-input">Hero Background Image</label>
                          <div className="file-uploader-box">
                            <Upload size={20} className="upload-icon" />
                            <p>Drag or select background image (JPEG, PNG, WEBP)</p>
                            <input 
                              id="hero-img-input"
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => setHeroImageFile(e.target.files[0])} 
                            />
                            {heroImageFile && <span className="selected-filename">Selected: {heroImageFile.name}</span>}
                          </div>
                        </div>

                        <div className="form-group col-span-2">
                          <label className="form-label" htmlFor="hero-alt-input">Image Accessibility Alt Text</label>
                          <input 
                            id="hero-alt-input"
                            type="text" 
                            className="glass-input" 
                            value={heroAltText} 
                            onChange={(e) => setHeroAltText(e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="form-actions mt-4">
                        <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                          <Save size={16} /> Save Hero Section
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Qualities Sub-tab Form */}
                  {contentSubTab === 'qualities' && (
                    <div className="glass-card qualities-editor-card">
                      <div className="section-title-row">
                        <div>
                          <h3>Qualities & Values Cards</h3>
                          <p className="card-subtitle">Add or edit qualities shown on the homepage below the hero section.</p>
                        </div>
                        <button onClick={addQualityCard} className="btn btn-secondary btn-sm">
                          <Plus size={14} /> Add Card
                        </button>
                      </div>

                      <div className="qualities-editor-list mt-4">
                        {qualities.map((quality, idx) => (
                          <div className="quality-editor-item glass-card" key={quality.id || idx}>
                            <div className="quality-item-header">
                              <h4>Quality #{idx + 1}</h4>
                              <div className="quality-item-actions">
                                <button 
                                  onClick={() => handleQualityVisibilityToggle(idx)} 
                                  className={`btn-icon ${quality.isVisible ? 'publish' : 'unpublish'}`}
                                  title={quality.isVisible ? 'Hide card' : 'Show card'}
                                >
                                  {quality.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button 
                                  onClick={() => deleteQualityCard(idx)} 
                                  className="btn-icon delete" 
                                  title="Delete card"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="quality-item-form-grid">
                              <div className="form-group">
                                <label className="form-label">Title</label>
                                <input 
                                  type="text" 
                                  className="glass-input" 
                                  value={quality.title} 
                                  onChange={(e) => handleQualityChange(idx, 'title', e.target.value)} 
                                />
                              </div>

                              <div className="form-group">
                                <label className="form-label">Icon (Lucide Name)</label>
                                <select 
                                  className="glass-input" 
                                  value={quality.iconName || 'HelpCircle'}
                                  onChange={(e) => handleQualityChange(idx, 'iconName', e.target.value)}
                                >
                                  <option value="Users">Users (Family)</option>
                                  <option value="BookOpen">BookOpen (Library)</option>
                                  <option value="History">History (Heritage)</option>
                                  <option value="Heart">Heart (Compassion)</option>
                                  <option value="Shield">Shield (Protection)</option>
                                  <option value="Milestone">Milestone (Legacy)</option>
                                  <option value="Globe">Globe (Unity)</option>
                                </select>
                              </div>

                              <div className="form-group col-span-2">
                                <label className="form-label">Short Description</label>
                                <textarea 
                                  className="glass-input" 
                                  value={quality.description}
                                  onChange={(e) => handleQualityChange(idx, 'description', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="form-actions mt-4 border-t pt-4">
                        <button onClick={saveQualitiesList} className="btn btn-primary" disabled={actionLoading}>
                          <Save size={16} /> Save Qualities Configuration
                        </button>
                      </div>
                    </div>
                  )}

                  {/* About Narrative Sub-tab Form */}
                  {contentSubTab === 'about' && (
                    <form onSubmit={handleAboutSubmit} className="glass-card about-editor-card">
                      <h3>About Us Narrative</h3>
                      <p className="card-subtitle">Edit the primary story narrative shown at the bottom of the home page.</p>
                      
                      <div className="form-group mt-3">
                        <label className="form-label" htmlFor="about-text-input">Narrative Text (Plain Text)</label>
                        <textarea 
                          id="about-text-input"
                          className="glass-input about-textarea"
                          placeholder="Write family summary narrative..."
                          value={aboutText}
                          onChange={(e) => setAboutText(e.target.value)}
                          rows={8}
                        />
                      </div>

                      {aboutText !== originalAboutText && (
                        <div className="unsaved-warning-box">
                          <AlertTriangle size={16} className="warning-icon" />
                          <span>You have unsaved changes in the text editor.</span>
                        </div>
                      )}

                      <div className="about-live-preview mt-4">
                        <h4>Live Paragraph Preview</h4>
                        <div className="preview-box">
                          {aboutText ? (
                            <p className="preview-paragraph">{aboutText}</p>
                          ) : (
                            <p className="preview-paragraph empty">No narrative story text added yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="form-actions mt-4">
                        <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                          <Save size={16} /> Save Narrative
                        </button>
                        <button type="button" onClick={handleAboutCancel} className="btn btn-secondary">
                          Cancel / Reset
                        </button>
                      </div>
                    </form>
                  )}

                  {contentSubTab === 'contact' && (
                    <form onSubmit={handleContactSubmit} className="glass-card content-form">
                      <h3>Contact Details</h3>
                      <p className="card-subtitle">These details appear on the public Contact page.</p>
                      <div className="form-grid">
                        <div className="form-group col-span-2">
                          <label className="form-label" htmlFor="contact-intro-input">Introductory Text</label>
                          <textarea
                            id="contact-intro-input"
                            className="glass-input"
                            value={contactContent.intro}
                            onChange={(e) => setContactContent({ ...contactContent, intro: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="contact-email-input">Email</label>
                          <input id="contact-email-input" type="email" className="glass-input" value={contactContent.email} onChange={(e) => setContactContent({ ...contactContent, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="contact-phone-input">Phone Number</label>
                          <input id="contact-phone-input" type="tel" className="glass-input" value={contactContent.phone} onChange={(e) => setContactContent({ ...contactContent, phone: e.target.value })} />
                        </div>
                        <div className="form-group col-span-2">
                          <label className="form-label" htmlFor="contact-location-input">Location</label>
                          <input id="contact-location-input" type="text" className="glass-input" value={contactContent.location} onChange={(e) => setContactContent({ ...contactContent, location: e.target.value })} />
                        </div>
                      </div>
                      <div className="form-actions mt-4">
                        <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                          <Save size={16} /> Save Contact Details
                        </button>
                      </div>
                    </form>
                  )}

                </div>
              </div>
            )}

            {/* TAB 5: PHOTO GALLERY CMS */}
            {activeTab === 'photos' && (
              <div className="photos-cms-view animate-fade-in">
                <div className="cms-tab-actions-header glass-card">
                  <div>
                    <h3>Vintage Photo Gallery ({photos.length})</h3>
                    <p className="card-subtitle">Manage the photographs in your family gallery.</p>
                  </div>
                  <div className="cms-actions-group">
                    {photos.length > 0 && (
                      <button onClick={toggleSelectAllPhotos} className="btn btn-secondary">
                        <Check size={16} /> {selectedPhotoIds.length === photos.length ? 'Clear Selection' : 'Select All'}
                      </button>
                    )}
                    {selectedPhotoIds.length > 0 && (
                      <button onClick={handleDeleteSelectedPhotos} className="btn btn-danger" disabled={actionLoading}>
                        <Trash2 size={16} /> Delete Selected ({selectedPhotoIds.length})
                      </button>
                    )}
                    <button onClick={() => openPhotoForm(null)} className="btn btn-primary">
                      <Plus size={16} /> Upload New Photograph
                    </button>
                  </div>
                </div>

                {photos.length > 0 ? (
                  <div className="admin-photos-grid mt-4">
                    {photos.map((photo) => (
                      <div key={photo._id} className="admin-photo-card glass-card">
                        <div className="admin-photo-thumb-wrapper">
                          <label className="admin-photo-select" title="Select gallery item">
                            <input
                              type="checkbox"
                              checked={selectedPhotoIds.includes(photo._id)}
                              onChange={() => togglePhotoSelection(photo._id)}
                              aria-label={`Select ${photo.title || 'gallery item'}`}
                            />
                          </label>
                          {(photo.resourceType || 'image') === 'video' ? (
                            <video src={getImageUrl(photo.imageUrl)} className="admin-photo-thumb" muted preload="metadata" />
                          ) : (
                            <img src={getImageUrl(photo.imageUrl || photo.imagePath)} alt="Family photograph" className="admin-photo-thumb" />
                          )}
                          {photo.isPinned && (
                            <span className="admin-photo-pinned-badge" title="Pinned to front of gallery">
                              <Pin size={13} fill="currentColor" /> Pinned
                            </span>
                          )}
                        </div>

                        <div className="admin-photo-card-actions">
                          <button
                            onClick={() => handleTogglePhotoPinning(photo)}
                            className={`btn-icon ${photo.isPinned ? 'publish' : ''}`}
                            title={photo.isPinned ? 'Unpin from front of gallery' : 'Pin to front of gallery'}
                            aria-label={photo.isPinned ? 'Unpin photo' : 'Pin photo'}
                          >
                            <Pin size={16} fill={photo.isPinned ? 'currentColor' : 'none'} />
                          </button>

                          <button
                            onClick={() => handleTogglePhotoVisibility(photo)}
                            className={`btn-icon ${photo.isVisible ? 'publish' : 'unpublish'}`}
                            title={photo.isVisible ? 'Hide from public gallery' : 'Make visible to public'}
                          >
                            {photo.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>

                          <button
                            onClick={() => openPhotoForm(photo)}
                            className="btn-icon edit"
                            title="Replace photograph"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => confirmDeletePhoto(photo)}
                            className="btn-icon delete"
                            title="Delete photograph"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card empty-cms-box mt-4">
                    <Camera size={44} className="empty-icon" />
                    <h4>No Photographs in Gallery</h4>
                    <p>Start preserving historical visual archives by uploading your first vintage family photograph.</p>
                    <button onClick={() => openPhotoForm(null)} className="btn btn-primary mt-3">
                      <Plus size={16} /> Upload First Photograph
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* =========================================================================
         MODALS & OVERLAYS
         ========================================================================= */}

      {/* 1. Add / Edit Book Modal */}
      {showBookModal && (
        <div className="modal-backdrop" onClick={() => setShowBookModal(false)}>
          <div className="glass-card cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBook ? 'Edit Book Properties' : 'Catalog New Book PDF'}</h3>
              <button className="modal-close" onClick={() => setShowBookModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleBookSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="modal-book-title-input">
                  Book Title <span className="required-star">*</span>
                </label>
                <input 
                  id="modal-book-title-input"
                  type="text" 
                  className="glass-input" 
                  value={bookTitle} 
                  onChange={(e) => setBookTitle(e.target.value)} 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-book-author-input">Author / Writer</label>
                <input 
                  id="modal-book-author-input"
                  type="text" 
                  className="glass-input" 
                  value={bookAuthor} 
                  onChange={(e) => setBookAuthor(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-book-desc-input">Description / Summary</label>
                <textarea 
                  id="modal-book-desc-input"
                  className="glass-input" 
                  value={bookDescription} 
                  onChange={(e) => setBookDescription(e.target.value)} 
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-book-order-input">Display Sort Order</label>
                  <input 
                    id="modal-book-order-input"
                    type="number" 
                    className="glass-input" 
                    value={bookDisplayOrder} 
                    onChange={(e) => setBookDisplayOrder(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-book-alt-input">Cover Accessibility Alt Text</label>
                  <input 
                    id="modal-book-alt-input"
                    type="text" 
                    className="glass-input" 
                    value={bookCoverAlt} 
                    onChange={(e) => setBookCoverAlt(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-book-pdf-input">
                  PDF Document File {!editingBook && <span className="required-star">*</span>}
                </label>
                <div className="file-uploader-box">
                  <Upload size={18} className="upload-icon" />
                  <p>Click to select PDF document file</p>
                  <input 
                    id="modal-book-pdf-input"
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => setBookFile(e.target.files[0])} 
                    required={!editingBook}
                  />
                  {bookFile && <span className="selected-filename">Selected: {bookFile.name}</span>}
                </div>
                {editingBook && <span className="help-text">Leave blank to retain the current PDF file.</span>}
              </div>

              <div className="modal-actions border-t pt-4">
                <button type="submit" className="btn btn-primary w-full" disabled={actionLoading}>
                  {actionLoading ? 'Uploading & Processing...' : editingBook ? 'Save Properties' : 'Upload Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Family Member Details Modal */}
      {selectedMember && (
        <div className="modal-backdrop" onClick={() => setSelectedMember(null)}>
          <div className="glass-card member-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMember.fullName}</h3>
              <button className="modal-close" onClick={() => setSelectedMember(null)}><X size={20} /></button>
            </div>

            <div className="member-details-content">
              <div className="member-details-portrait">
                {selectedMember.portraitPath ? (
                  <img
                    src={selectedMember.portraitPath.startsWith('http://') || selectedMember.portraitPath.startsWith('https://')
                      ? selectedMember.portraitPath
                      : `${API_BASE_URL}/${selectedMember.portraitPath}`}
                    alt={selectedMember.fullName}
                  />
                ) : <Users size={34} />}
              </div>
              <div className="member-details-fields">
                <p><strong>Root:</strong> {familyMembers.find(m => m._id === selectedMember.parentId)?.fullName || 'None (Founder)'}</p>
                <p><strong>Relationship:</strong> {selectedMember.relationshipLabel || 'Not specified'}</p>
                <p><strong>Years:</strong> {[selectedMember.birthYear, selectedMember.deathYear].filter(Boolean).join(' - ') || 'Not specified'}</p>
                <p><strong>Visibility:</strong> {selectedMember.isVisible ? 'Visible' : 'Hidden'}</p>
                <p><strong>Biography:</strong> {selectedMember.bio || 'No biography added.'}</p>
              </div>
            </div>

            <div className="modal-actions border-t pt-4 member-detail-actions">
              <button type="button" className="btn btn-primary" onClick={() => { setSelectedMember(null); openMemberForm(selectedMember); }}>
                <Edit size={16} /> Edit Member
              </button>
              <button type="button" className="btn btn-danger" onClick={() => { setSelectedMember(null); startDeleteMember(selectedMember); }}>
                <Trash2 size={16} /> Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add / Edit Family Member Modal */}
      {showMemberModal && (
        <div className="modal-backdrop" onClick={() => setShowMemberModal(false)}>
          <div className="glass-card cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMember ? 'Edit Family Member' : 'Add Family Member'}</h3>
              <button className="modal-close" onClick={() => setShowMemberModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleMemberSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label" htmlFor="modal-mem-name-input">
                  Full Name <span className="required-star">*</span>
                </label>
                <input 
                  id="modal-mem-name-input"
                  type="text" 
                  className="glass-input" 
                  value={memberFullName} 
                  onChange={(e) => setMemberFullName(e.target.value)} 
                  required
                />
              </div>

              {/* Searchable Parent Selector */}
              <div className="form-group">
                <label className="form-label" htmlFor="modal-mem-parent-input">Parent Node</label>
                <input
                  type="text"
                  placeholder="Type to search parents..."
                  className="glass-input mb-2"
                  value={parentSearchQuery}
                  onChange={(e) => setParentSearchQuery(e.target.value)}
                />
                <select
                  id="modal-mem-parent-input"
                  className="glass-input"
                  value={memberParentId}
                  onChange={(e) => setMemberParentId(e.target.value)}
                >
                  <option value="">None (Top-Level Founder Root)</option>
                  {filteredParentsOptions.map(m => (
                    <option key={m._id} value={m._id}>{m.fullName} ({m.relationshipLabel || 'Member'})</option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-mem-rel-input">Relationship Label</label>
                  <input 
                    id="modal-mem-rel-input"
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. Daughter, Founder, Son"
                    value={memberRelationship} 
                    onChange={(e) => setMemberRelationship(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-mem-order-input">Display Sort Order</label>
                  <input 
                    id="modal-mem-order-input"
                    type="number" 
                    className="glass-input" 
                    value={memberDisplayOrder} 
                    onChange={(e) => setMemberDisplayOrder(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-mem-birth-input">Birth Year</label>
                  <input 
                    id="modal-mem-birth-input"
                    type="number" 
                    className="glass-input" 
                    placeholder="e.g. 1910"
                    value={memberBirthYear} 
                    onChange={(e) => setMemberBirthYear(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-mem-death-input">Death Year (Leave blank if living)</label>
                  <input 
                    id="modal-mem-death-input"
                    type="number" 
                    className="glass-input" 
                    placeholder="e.g. 1995"
                    value={memberDeathYear} 
                    onChange={(e) => setMemberDeathYear(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-mem-bio-input">Biography</label>
                <textarea 
                  id="modal-mem-bio-input"
                  className="glass-input" 
                  value={memberBio} 
                  onChange={(e) => setMemberBio(e.target.value)} 
                />
              </div>

              <div className="form-grid align-center">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-mem-portrait-input">Portrait Image</label>
                  <div className="file-uploader-box">
                    <Upload size={16} className="upload-icon" />
                    <input 
                      id="modal-mem-portrait-input"
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setMemberPortraitFile(e.target.files[0])} 
                    />
                    {memberPortraitFile && <span className="selected-filename">Selected: {memberPortraitFile.name}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="modal-mem-visible-toggle">Tree Visibility</label>
                  <div className="toggle-switch-wrapper">
                    <input 
                      id="modal-mem-visible-toggle"
                      type="checkbox" 
                      className="toggle-checkbox" 
                      checked={memberIsVisible}
                      onChange={(e) => setMemberIsVisible(e.target.checked)}
                    />
                    <span>{memberIsVisible ? 'Show in public tree' : 'Hidden from public'}</span>
                  </div>
                </div>
              </div>

              <div className="modal-actions border-t pt-4">
                <button type="submit" className="btn btn-primary w-full" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : editingMember ? 'Save Changes' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Member Strategy Modal */}
      {showDeleteMemberModal && memberToDelete && (
        <div className="modal-backdrop" onClick={() => setShowDeleteMemberModal(false)}>
          <div className="glass-card cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Family Member: {memberToDelete.fullName}</h3>
              <button className="modal-close" onClick={() => setShowDeleteMemberModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleDeleteMemberSubmit} className="modal-form">
              <div className="delete-alert-warning-box">
                <AlertTriangle size={24} className="warning-icon" />
                <p>
                  This member has children in the family tree. You must choose a strategy for their descendants to avoid silent data loss.
                </p>
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Deletion Strategy</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      value="delete_branch" 
                      checked={deleteStrategy === 'delete_branch'} 
                      onChange={() => setDeleteStrategy('delete_branch')} 
                    />
                    <span>Delete Entire Branch (Deletes this member AND all children recursively)</span>
                  </label>
                  
                  <label className="radio-label mt-2">
                    <input 
                      type="radio" 
                      value="move_children" 
                      checked={deleteStrategy === 'move_children'} 
                      onChange={() => setDeleteStrategy('move_children')} 
                    />
                    <span>Reparent Direct Children (Move children to another parent, or promote to roots)</span>
                  </label>
                </div>
              </div>

              {deleteStrategy === 'move_children' && (
                <div className="form-group border-l pl-3 animate-fade-in">
                  <label className="form-label" htmlFor="modal-del-reparent-input">New Parent for Children</label>
                  <select 
                    id="modal-del-reparent-input"
                    className="glass-input" 
                    value={reparentTargetId} 
                    onChange={(e) => setReparentTargetId(e.target.value)}
                  >
                    <option value="">None (Promote children to Top-Level Founders)</option>
                    {familyMembers
                      .filter(m => m._id !== memberToDelete._id) // Cannot move children to the member being deleted
                      .map(m => (
                        <option key={m._id} value={m._id}>{m.fullName}</option>
                      ))
                    }
                  </select>
                </div>
              )}

              <div className="modal-actions border-t pt-4">
                <button type="submit" className="btn btn-danger w-full" disabled={actionLoading}>
                  {actionLoading ? 'Deleting...' : 'Confirm Deletion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add / Edit Photograph Modal */}
      {showPhotoModal && (
        <div className="modal-backdrop" onClick={() => setShowPhotoModal(false)}>
          <div className="glass-card cms-modal photo-cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPhoto ? 'Replace Gallery Media' : 'Upload Gallery Media'}</h3>
              <button className="modal-close" onClick={() => setShowPhotoModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handlePhotoSubmit} className="modal-form">
              {/* Photo Image Dropzone / Preview */}
              <div className="form-group">
                <label className="form-label">
                    Photo or Video {!editingPhoto && <span className="required-star">*</span>}
                </label>
                
                <div className="photo-upload-dropzone">
                  {photoPreviewUrls.length > 0 ? (
                    <div className="photo-preview-container">
                      <div className="photo-preview-grid">
                        {photoPreviewUrls.map((previewUrl, index) => (
                          photoFiles[index]?.type.startsWith('video/') ? (
                            <video key={previewUrl} src={previewUrl} className="photo-preview-image" muted controls />
                          ) : (
                            <img key={previewUrl} src={previewUrl} alt={`Preview ${index + 1}`} className="photo-preview-image" />
                          )
                        ))}
                      </div>
                      <div className="photo-preview-overlay">
                        <label htmlFor="photo-file-replace" className="btn btn-secondary btn-sm">
                          <Upload size={14} /> {editingPhoto ? 'Change Image' : 'Change Images'}
                        </label>
                        <input
                          id="photo-file-replace"
                          type="file"
                          accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo"
                          multiple={!editingPhoto}
                          onChange={handlePhotoFileChange}
                          style={{ display: 'none' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="photo-file-input" className="photo-upload-placeholder">
                      <Camera size={36} className="upload-placeholder-icon" />
                      <p className="upload-prompt">Click or drag & drop a photo or video here</p>
                      <span className="upload-subprompt">Photos: JPG, PNG, WEBP (10MB). Videos: MP4, WEBM, MOV, AVI (100MB)</span>
                      <input
                        id="photo-file-input"
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo"
                        multiple={!editingPhoto}
                        onChange={handlePhotoFileChange}
                        style={{ display: 'none' }}
                        required={!editingPhoto}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="modal-actions border-t pt-4">
                <button type="submit" className="btn btn-primary w-full" disabled={actionLoading}>
                  {actionLoading ? 'Saving Photograph...' : editingPhoto ? 'Save Changes' : 'Upload to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Photo Modal */}
      {showDeletePhotoModal && photoToDelete && (
        <div className="modal-backdrop" onClick={() => setShowDeletePhotoModal(false)}>
          <div className="glass-card cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Photograph</h3>
              <button className="modal-close" onClick={() => setShowDeletePhotoModal(false)}><X size={20} /></button>
            </div>

            <div className="modal-form">
              <div className="delete-alert-warning-box">
                <AlertTriangle size={24} className="warning-icon" />
                <p>
                  Are you sure you want to permanently delete "<strong>{photoToDelete.title}</strong>" from the archival gallery? The image file will be removed from storage.
                </p>
              </div>

              <div className="modal-actions border-t pt-4 mt-3">
                <button 
                  onClick={handleDeletePhotoConfirm} 
                  className="btn btn-danger w-full" 
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Confirm Permanent Deletion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
