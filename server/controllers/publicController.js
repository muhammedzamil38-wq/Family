import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import SiteContent from '../models/SiteContent.js';
import Book from '../models/Book.js';
import FamilyMember from '../models/FamilyMember.js';
import Photo from '../models/Photo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Retrieves public site-wide content: Hero layout, qualities grid, and About Us text.
 * GET /api/v1/public/site-content
 */
export async function getSiteContent(req, res) {
  try {
    const contents = await SiteContent.find({
      key: { $in: ['hero', 'qualities', 'about', 'settings'] }
    });

    // Reduce records into a clean nested JSON object
    const result = contents.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, { hero: null, qualities: [], about: null, settings: null });

    // Filter visible qualities and sort by displayOrder
    if (result.qualities && Array.isArray(result.qualities)) {
      result.qualities = result.qualities
        .filter(q => q.isVisible !== false)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }

    return res.json(result);
  } catch (error) {
    console.error('Error fetching public site content:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Lists published books in sorted order.
 * GET /api/v1/public/books
 */
export async function getPublishedBooks(req, res) {
  try {
    const books = await Book.find({ status: 'published' })
      .select('title slug description author coverPath coverAlt displayOrder createdAt')
      .sort({ displayOrder: 1, createdAt: -1 });

    return res.json(books);
  } catch (error) {
    console.error('Error fetching published books:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Retrieves a single published book's details, including its secure streaming URL.
 * GET /api/v1/public/books/:slug
 */
export async function getBookBySlug(req, res) {
  const { slug } = req.params;

  try {
    const book = await Book.findOne({ slug: slug.toLowerCase(), status: 'published' })
      .select('title slug description author coverPath coverAlt displayOrder createdAt');

    if (!book) {
      return res.status(404).json({
        message: 'Book not found',
        errors: ['The requested book does not exist or has not been published yet.']
      });
    }

    // Expose metadata and the secure endpoint link
    return res.json({
      ...book.toObject(),
      pdfUrl: `/api/v1/public/books/pdf/${book.slug}`
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Securely streams the PDF file associated with a published book.
 * GET /api/v1/public/books/pdf/:slug
 */
export async function streamBookPdf(req, res) {
  const { slug } = req.params;

  try {
    const book = await Book.findOne({ slug: slug.toLowerCase() });

    // Validate that the book exists and is published (or allow authenticated admin to view draft PDFs)
    const isAdmin = req.session && req.session.user && req.session.user.role === 'admin';
    if (!book || (book.status !== 'published' && !isAdmin)) {
      return res.status(404).json({
        message: 'Resource not found',
        errors: ['The book file is not publicly available.']
      });
    }

    // Resolve the absolute file path on disk
    // If pdfPath is stored relative to server directory, e.g. "uploads/pdfs/file.pdf"
    const relativePath = book.pdfPath;
    const absolutePath = path.resolve(__dirname, '..', relativePath);

    if (!fs.existsSync(absolutePath)) {
      console.error(`File missing on disk: ${absolutePath}`);
      return res.status(404).json({
        message: 'File not found',
        errors: ['The requested PDF document file is missing from server storage.']
      });
    }

    // Set headers to display PDF in the browser instead of triggering direct download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${book.title.replace(/"/g, '\\"')}.pdf"`);
    
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Error streaming PDF:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Retrieves visible family tree members.
 * GET /api/v1/public/family
 */
export async function getVisibleFamily(req, res) {
  try {
    const members = await FamilyMember.find({ isVisible: true })
      .select('fullName parentId relationshipLabel birthYear deathYear bio portraitPath displayOrder')
      .sort({ displayOrder: 1, fullName: 1 });

    return res.json(members);
  } catch (error) {
    console.error('Error fetching family hierarchy:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Retrieves visible vintage photos with optional filtering by decade, tag, search query.
 * GET /api/v1/public/photos
 */
export async function getPublicPhotos(req, res) {
  const { decade, tag, search } = req.query;

  try {
    const filter = { isVisible: true };

    if (decade && decade !== 'All') {
      filter.decade = decade;
    }

    if (tag) {
      filter.tags = tag;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { year: searchRegex },
        { peopleInPhoto: searchRegex },
        { tags: searchRegex }
      ];
    }

    const photos = await Photo.find(filter)
      .sort({ displayOrder: 1, year: 1, createdAt: -1 });

    return res.json(photos);
  } catch (error) {
    console.error('Error fetching public photos:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Retrieves a single visible photo with full details.
 * GET /api/v1/public/photos/:id
 */
export async function getPublicPhotoById(req, res) {
  const { id } = req.params;

  try {
    const photo = await Photo.findOne({ _id: id, isVisible: true });
    if (!photo) {
      return res.status(404).json({
        message: 'Photo not found',
        errors: ['The requested photograph was not found or is private.']
      });
    }

    return res.json(photo);
  } catch (error) {
    console.error('Error fetching photo by id:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

