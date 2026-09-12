import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Book from '../models/Book.js';
import FamilyMember from '../models/FamilyMember.js';
import SiteContent from '../models/SiteContent.js';
import AuditLog from '../models/AuditLog.js';
import Photo from '../models/Photo.js';
import { generatePdfCover } from '../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate a clean URL slug from a title string
function createSlug(title) {
  return title
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-')            // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')        // Remove non-word characters
    .replace(/\-\-+/g, '-')          // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')              // Trim hyphen from start
    .replace(/-+$/, '');             // Trim hyphen from end
}

// Helper to write audit logs
async function logAdminAction(actorId, action, entityType, entityId, details) {
  try {
    const log = new AuditLog({
      actorId,
      action,
      entityType,
      entityId,
      details: typeof details === 'string' ? details : JSON.stringify(details)
    });
    await log.save();
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Returns summary stats for the CMS Dashboard.
 * GET /api/v1/admin/dashboard
 */
export async function getDashboardStats(req, res) {
  try {
    const publishedBookCount = await Book.countDocuments({ status: 'published' });
    const draftBookCount = await Book.countDocuments({ status: { $ne: 'published' } });
    const familyMemberCount = await FamilyMember.countDocuments();
    const photoCount = await Photo.countDocuments();
    
    const hero = await SiteContent.findOne({ key: 'hero' });
    const heroImageStatus = !!(hero && hero.value && hero.value.imagePath);

    // Retrieve last update dates from all major schemas
    const lastBook = await Book.findOne().sort({ updatedAt: -1 }).select('updatedAt');
    const lastMember = await FamilyMember.findOne().sort({ updatedAt: -1 }).select('updatedAt');
    const lastContent = await SiteContent.findOne().sort({ updatedAt: -1 }).select('updatedAt');
    const lastPhoto = await Photo.findOne().sort({ updatedAt: -1 }).select('updatedAt');

    const updateDates = [
      lastBook?.updatedAt,
      lastMember?.updatedAt,
      lastContent?.updatedAt,
      lastPhoto?.updatedAt
    ].filter(Boolean);

    const lastContentUpdate = updateDates.length > 0 
      ? new Date(Math.max(...updateDates.map(d => d.getTime()))) 
      : new Date();

    return res.json({
      publishedBookCount,
      draftBookCount,
      familyMemberCount,
      photoCount,
      heroImageStatus,
      lastContentUpdate
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/* =========================================================================
   Book Catalog Management
   ========================================================================= */

/**
 * Lists all books.
 * GET /api/v1/admin/books
 */
export async function getAllBooks(req, res) {
  try {
    const books = await Book.find().sort({ displayOrder: 1, createdAt: -1 });
    return res.json(books);
  } catch (error) {
    console.error('Error fetching CMS books:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Uploads a book PDF and creates a record.
 * POST /api/v1/admin/books
 */
export async function createBook(req, res) {
  const { title, author, description, displayOrder, coverAlt } = req.body;

  if (!title) {
    // Cleanup uploaded PDF file if validation failed
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      message: 'Validation error',
      errors: ['Book title is a required field.']
    });
  }

  if (!req.file) {
    return res.status(400).json({
      message: 'Validation error',
      errors: ['A PDF document file is required.']
    });
  }

  try {
    // Generate initial unique slug
    let baseSlug = createSlug(title) || 'book';
    let slug = baseSlug;
    let counter = 1;
    while (await Book.exists({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const relativePdfPath = req.file.path.replace(/\\/g, '/'); // Normalize paths
    
    // Save preliminary draft
    const book = new Book({
      title,
      slug,
      author: author || '',
      description: description || '',
      displayOrder: parseInt(displayOrder) || 0,
      coverAlt: coverAlt || `Cover of ${title}`,
      pdfPath: relativePdfPath,
      coverPath: '', // Filled in below
      status: 'draft'
    });

    // Try extracting page one thumbnail
    const coversDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'covers');
    try {
      const coverFilePath = await generatePdfCover(relativePdfPath, coversDir, slug);
      // Store relative path, e.g. "uploads/covers/book-slug.png"
      book.coverPath = coverFilePath.replace(/\\/g, '/');
      book.status = 'ready'; // Cover extracted successfully
    } catch (err) {
      console.error('Failed to generate PDF thumbnail during book upload:', err);
      // Status remains 'draft' if generation failed
    }

    await book.save();

    await logAdminAction(
      req.session.user.id,
      'CREATE_BOOK',
      'Book',
      book._id,
      { title: book.title, slug: book.slug, coverStatus: book.status }
    );

    return res.status(201).json({
      message: 'Book created successfully',
      book
    });
  } catch (error) {
    console.error('Error creating book:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Updates an existing book metadata and handles PDF file replacements.
 * PATCH /api/v1/admin/books/:id
 */
export async function updateBook(req, res) {
  const { id } = req.params;
  const { title, author, description, displayOrder, coverAlt, status } = req.body;

  try {
    const book = await Book.findById(id);
    if (!book) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        message: 'Book not found',
        errors: ['The specified book does not exist.']
      });
    }

    // Handle title & slug updates
    if (title && title !== book.title) {
      let baseSlug = createSlug(title) || 'book';
      let slug = baseSlug;
      let counter = 1;
      while (await Book.exists({ slug, _id: { $ne: id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      book.title = title;
      book.slug = slug;
    }

    // Update optional strings & display orders
    if (author !== undefined) book.author = author;
    if (description !== undefined) book.description = description;
    if (displayOrder !== undefined) book.displayOrder = parseInt(displayOrder) || 0;
    if (coverAlt !== undefined) book.coverAlt = coverAlt;

    // Handle replacement file uploads
    if (req.file) {
      // Delete old PDF and cover
      const oldPdfPath = path.resolve(__dirname, '..', book.pdfPath);
      const oldCoverPath = book.coverPath ? path.resolve(__dirname, '..', book.coverPath) : null;
      
      if (fs.existsSync(oldPdfPath)) fs.unlinkSync(oldPdfPath);
      if (oldCoverPath && fs.existsSync(oldCoverPath)) fs.unlinkSync(oldCoverPath);

      const relativePdfPath = req.file.path.replace(/\\/g, '/');
      book.pdfPath = relativePdfPath;
      book.status = 'draft'; // Reset back to draft until cover is generated

      // Regenerate cover
      const coversDir = path.join(process.env.UPLOAD_DIR || 'uploads', 'covers');
      try {
        const coverFilePath = await generatePdfCover(relativePdfPath, coversDir, book.slug);
        book.coverPath = coverFilePath.replace(/\\/g, '/');
        book.status = 'ready';
      } catch (err) {
        console.error('PDF cover regeneration failed on replacement upload:', err);
      }
    }

    // Handle status change explicitly
    if (status) {
      if (status === 'published') {
        if (!book.coverPath || book.status === 'draft') {
          return res.status(400).json({
            message: 'Publishing forbidden',
            errors: ['A book cannot be published without a successfully generated cover thumbnail.']
          });
        }
      }
      book.status = status;
    }

    await book.save();

    await logAdminAction(
      req.session.user.id,
      'UPDATE_BOOK',
      'Book',
      book._id,
      { title: book.title, status: book.status }
    );

    return res.json({
      message: 'Book updated successfully',
      book
    });
  } catch (error) {
    console.error('Error updating book:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Publishes or unpublishes a book status.
 * PATCH /api/v1/admin/books/:id/status
 */
export async function updateBookStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['draft', 'ready', 'published'].includes(status)) {
    return res.status(400).json({
      message: 'Validation error',
      errors: ['Invalid status value. Must be "draft", "ready", or "published".']
    });
  }

  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({
        message: 'Book not found',
        errors: ['The specified book does not exist.']
      });
    }

    if (status === 'published' && (!book.coverPath || book.coverPath === '')) {
      return res.status(400).json({
        message: 'Publishing forbidden',
        errors: ['A book cannot be published without a successfully generated cover thumbnail.']
      });
    }

    book.status = status;
    await book.save();

    await logAdminAction(
      req.session.user.id,
      status === 'published' ? 'PUBLISH_BOOK' : 'UNPUBLISH_BOOK',
      'Book',
      book._id,
      { title: book.title }
    );

    return res.json({
      message: `Book successfully marked as ${status}`,
      book
    });
  } catch (error) {
    console.error('Error changing book status:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Deletes a book and its files from the storage volume.
 * DELETE /api/v1/admin/books/:id
 */
export async function deleteBook(req, res) {
  const { id } = req.params;

  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({
        message: 'Book not found',
        errors: ['The specified book does not exist.']
      });
    }

    // Resolve files absolute paths
    const absolutePdfPath = path.resolve(__dirname, '..', book.pdfPath);
    const absoluteCoverPath = book.coverPath ? path.resolve(__dirname, '..', book.coverPath) : null;

    // Delete PDF
    if (fs.existsSync(absolutePdfPath)) {
      fs.unlinkSync(absolutePdfPath);
    }
    // Delete Cover Image
    if (absoluteCoverPath && fs.existsSync(absoluteCoverPath)) {
      fs.unlinkSync(absoluteCoverPath);
    }

    await Book.findByIdAndDelete(id);

    await logAdminAction(
      req.session.user.id,
      'DELETE_BOOK',
      'Book',
      id,
      { title: book.title }
    );

    return res.json({
      message: 'Book and its uploaded file assets deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/* =========================================================================
   Family Members Tree Management
   ========================================================================= */

// Recursive checker to detect cycle parent assignment
async function isDescendant(memberId, potentialParentId) {
  if (!potentialParentId) return false;
  
  let currentParentId = potentialParentId;
  while (currentParentId) {
    if (currentParentId.toString() === memberId.toString()) {
      return true; // We found the member in the parenting chain: cyclic!
    }
    const currentMember = await FamilyMember.findById(currentParentId).select('parentId');
    if (!currentMember) break;
    currentParentId = currentMember.parentId;
  }
  return false;
}

// Recursive helper to delete a family member and all their descendants (along with their portrait images)
async function deleteMemberAndDescendants(memberId) {
  const member = await FamilyMember.findById(memberId);
  if (!member) return;

  // Find all direct children
  const children = await FamilyMember.find({ parentId: memberId });
  for (const child of children) {
    await deleteMemberAndDescendants(child._id);
  }

  // Delete local portrait asset
  if (member.portraitPath) {
    const portraitAbsPath = path.resolve(__dirname, '..', member.portraitPath);
    if (fs.existsSync(portraitAbsPath)) {
      fs.unlinkSync(portraitAbsPath);
    }
  }

  // Delete DB record
  await FamilyMember.findByIdAndDelete(memberId);
}

/**
 * Lists all family members.
 * GET /api/v1/admin/family-members
 */
export async function getAllFamilyMembers(req, res) {
  try {
    const members = await FamilyMember.find().sort({ displayOrder: 1, fullName: 1 });
    return res.json(members);
  } catch (error) {
    console.error('Error listing family members:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Creates a new family member record.
 * POST /api/v1/admin/family-members
 */
export async function createFamilyMember(req, res) {
  const { fullName, parentId, relationshipLabel, birthYear, deathYear, bio, displayOrder, isVisible } = req.body;

  if (!fullName) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      message: 'Validation error',
      errors: ['Full name is a required field.']
    });
  }

  try {
    // Validate parent ID if supplied
    let dbParentId = null;
    if (parentId && parentId !== 'null' && parentId !== '') {
      const parentExists = await FamilyMember.findById(parentId);
      if (!parentExists) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: 'Validation error',
          errors: ['The selected parent record does not exist.']
        });
      }
      dbParentId = parentId;
    }

    const portraitPath = req.file ? `uploads/images/${path.basename(req.file.path)}` : '';

    const member = new FamilyMember({
      fullName,
      parentId: dbParentId,
      relationshipLabel: relationshipLabel || '',
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      deathYear: deathYear ? parseInt(deathYear) : undefined,
      bio: bio || '',
      portraitPath,
      displayOrder: parseInt(displayOrder) || 0,
      isVisible: isVisible === undefined ? true : isVisible === 'true' || isVisible === true
    });

    await member.save();

    await logAdminAction(
      req.session.user.id,
      'CREATE_MEMBER',
      'FamilyMember',
      member._id,
      { fullName: member.fullName }
    );

    return res.status(201).json({
      message: 'Family member created successfully',
      member
    });
  } catch (error) {
    console.error('Error creating family member:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Updates family member properties and checks for ancestor hierarchy cycles.
 * PATCH /api/v1/admin/family-members/:id
 */
export async function updateFamilyMember(req, res) {
  const { id } = req.params;
  const { fullName, parentId, relationshipLabel, birthYear, deathYear, bio, displayOrder, isVisible } = req.body;

  try {
    const member = await FamilyMember.findById(id);
    if (!member) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        message: 'Family member not found',
        errors: ['The specified family member does not exist.']
      });
    }

    // Process parent ID updates and perform cycle checks
    if (parentId !== undefined) {
      let nextParentId = null;
      if (parentId && parentId !== 'null' && parentId !== '') {
        nextParentId = parentId;

        // 1. Prevent self-parenting
        if (nextParentId.toString() === id.toString()) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({
            message: 'Cycle detected',
            errors: ['A family member cannot be set as their own parent.']
          });
        }

        // 2. Prevent ancestor cycles (making a descendant the parent of an ancestor)
        const causesCycle = await isDescendant(id, nextParentId);
        if (causesCycle) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({
            message: 'Cycle detected',
            errors: ['Cannot assign a descendant as a parent. This creates a loop in the family tree.']
          });
        }

        // Verify parent exists
        const parentExists = await FamilyMember.findById(nextParentId);
        if (!parentExists) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({
            message: 'Validation error',
            errors: ['The selected parent record does not exist.']
          });
        }
      }
      member.parentId = nextParentId;
    }

    // Update optional strings and parameters
    if (fullName) member.fullName = fullName;
    if (relationshipLabel !== undefined) member.relationshipLabel = relationshipLabel;
    if (birthYear !== undefined) member.birthYear = birthYear ? parseInt(birthYear) : undefined;
    if (deathYear !== undefined) member.deathYear = deathYear ? parseInt(deathYear) : undefined;
    if (bio !== undefined) member.bio = bio;
    if (displayOrder !== undefined) member.displayOrder = parseInt(displayOrder) || 0;
    
    if (isVisible !== undefined) {
      member.isVisible = isVisible === 'true' || isVisible === true;
    }

    // Handle portrait replacements
    if (req.file) {
      const serverRoot = path.resolve(__dirname, '..');
      const oldPortraitPath = member.portraitPath ? path.join(serverRoot, member.portraitPath) : null;
      if (oldPortraitPath && fs.existsSync(oldPortraitPath)) {
        try { fs.unlinkSync(oldPortraitPath); } catch (e) {}
      }
      member.portraitPath = `uploads/images/${path.basename(req.file.path)}`;
    }

    await member.save();

    await logAdminAction(
      req.session.user.id,
      'UPDATE_MEMBER',
      'FamilyMember',
      member._id,
      { fullName: member.fullName }
    );

    return res.json({
      message: 'Family member updated successfully',
      member
    });
  } catch (error) {
    console.error('Error updating family member:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Handles family member deletion based on selected strategy for direct children.
 * DELETE /api/v1/admin/family-members/:id
 */
export async function deleteFamilyMember(req, res) {
  const { id } = req.params;
  const { deleteStrategy, newParentId } = req.query; // 'delete_branch', 'move_children', 'promote_to_roots'

  try {
    const member = await FamilyMember.findById(id);
    if (!member) {
      return res.status(404).json({
        message: 'Member not found',
        errors: ['The specified family member does not exist.']
      });
    }

    // Check for direct children
    const directChildren = await FamilyMember.find({ parentId: id });

    if (directChildren.length > 0) {
      if (!deleteStrategy || !['delete_branch', 'move_children'].includes(deleteStrategy)) {
        return res.status(400).json({
          message: 'Branch handling required',
          errors: ['This member has children. You must specify a deleteStrategy: "delete_branch" (delete whole sub-tree) or "move_children" (reparent children).']
        });
      }

      if (deleteStrategy === 'delete_branch') {
        // Recursively delete this member and all descendants
        await deleteMemberAndDescendants(id);
        
        await logAdminAction(
          req.session.user.id,
          'DELETE_BRANCH',
          'FamilyMember',
          id,
          { fullName: member.fullName }
        );

        return res.json({
          message: 'Member and their entire branch (descendants) deleted successfully.'
        });
      }

      if (deleteStrategy === 'move_children') {
        let targetParentId = null;

        // Move children can move them to another parent, or promote to roots if targetParentId is null/empty
        if (newParentId && newParentId !== 'null' && newParentId !== '') {
          // Validate target parent exists and is NOT a descendant of the children or the current member
          if (newParentId.toString() === id.toString()) {
            return res.status(400).json({
              message: 'Invalid reparenting',
              errors: ['Cannot move children to the member being deleted.']
            });
          }
          const targetExists = await FamilyMember.findById(newParentId);
          if (!targetExists) {
            return res.status(400).json({
              message: 'Validation error',
              errors: ['The new parent record selected for children does not exist.']
            });
          }

          // Ensure target parent is not a descendant of this deleted member (which would create a floating cycle!)
          const isTargetDescendant = await isDescendant(id, newParentId);
          if (isTargetDescendant) {
            return res.status(400).json({
              message: 'Cycle detected',
              errors: ['Cannot move children to a descendant of the member being deleted.']
            });
          }
          targetParentId = newParentId;
        }

        // Reparent direct children
        await FamilyMember.updateMany({ parentId: id }, { parentId: targetParentId });
      }
    }

    // Safe deletion of single member (and their portrait asset)
    if (member.portraitPath) {
      const portraitAbsPath = path.resolve(__dirname, '..', member.portraitPath);
      if (fs.existsSync(portraitAbsPath)) {
        fs.unlinkSync(portraitAbsPath);
      }
    }

    await FamilyMember.findByIdAndDelete(id);

    await logAdminAction(
      req.session.user.id,
      'DELETE_MEMBER',
      'FamilyMember',
      id,
      { fullName: member.fullName }
    );

    return res.json({
      message: 'Family member deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting family member:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/* =========================================================================
   Site Content Management
   ========================================================================= */

/**
 * Fetches the siteContent value for a key.
 * GET /api/v1/admin/site-content/:key
 */
export async function getAdminSiteContent(req, res) {
  const { key } = req.params;

  try {
    const record = await SiteContent.findOne({ key });
    if (!record) {
      return res.status(404).json({
        message: 'Site content not found',
        errors: [`No site content record matches key: "${key}"`]
      });
    }
    return res.json(record);
  } catch (error) {
    console.error('Error fetching admin site content:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Updates siteContent. If Hero and an image file is attached, replaces the hero image.
 * PATCH /api/v1/admin/site-content/:key
 */
export async function updateAdminSiteContent(req, res) {
  const { key } = req.params;

  try {
    let record = await SiteContent.findOne({ key });
    if (!record) {
      record = new SiteContent({ key, value: {} });
    }

    // Parse body value
    let newValue = req.body.value;
    if (typeof newValue === 'string') {
      try {
        newValue = JSON.parse(newValue);
      } catch (err) {
        // Treat as normal string or keep as is
      }
    }

    if (key === 'hero') {
      // Validate hero structure
      const heroData = newValue || {};
      
      // If a file is uploaded, replace the old hero image path
      if (req.file) {
        const serverRoot = path.resolve(__dirname, '..');
        const oldImagePath = record.value && record.value.imagePath 
          ? path.join(serverRoot, record.value.imagePath) 
          : null;
        
        if (oldImagePath && fs.existsSync(oldImagePath)) {
          try { fs.unlinkSync(oldImagePath); } catch (e) {}
        }
        
        heroData.imagePath = `uploads/images/${path.basename(req.file.path)}`;
      } else if (heroData.imagePath) {
        // If imagePath was passed in payload, ensure it's normalized to relative
        const base = path.basename(heroData.imagePath);
        heroData.imagePath = heroData.imagePath.includes('uploads/images/') 
          ? `uploads/images/${base}` 
          : heroData.imagePath;
      } else if (record.value && record.value.imagePath) {
        // Keep the old hero image if no new one was uploaded
        const base = path.basename(record.value.imagePath);
        heroData.imagePath = record.value.imagePath.includes('uploads/images/') 
          ? `uploads/images/${base}` 
          : record.value.imagePath;
      }
      
      record.value = {
        imagePath: heroData.imagePath || '',
        altText: heroData.altText || '',
        title: heroData.title || '',
        subtitle: heroData.subtitle || '',
        ctaLabel: heroData.ctaLabel || '',
        ctaDestination: heroData.ctaDestination || '/gallery'
      };
    } else if (key === 'qualities') {
      // Expects an array of quality cards
      if (!Array.isArray(newValue)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: 'Validation error',
          errors: ['Qualities content must be an array.']
        });
      }
      record.value = newValue;
    } else if (key === 'about') {
      // Expects { text: "..." }
      const aboutData = newValue || {};
      record.value = {
        text: aboutData.text || ''
      };
    } else {
      // Settings or other custom config
      record.value = newValue;
    }

    record.updatedBy = req.session.user.id;
    await record.save();

    await logAdminAction(
      req.session.user.id,
      'UPDATE_CONTENT',
      'SiteContent',
      record._id,
      { key }
    );

    return res.json({
      message: `Site content configuration for "${key}" updated successfully.`,
      content: record
    });
  } catch (error) {
    console.error('Error updating site content:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/* =========================================================================
   Photo Gallery Management (CMS)
   ========================================================================= */

/**
 * Lists all vintage photos for the CMS with ordering.
 * GET /api/v1/admin/photos
 */
export async function getAllPhotos(req, res) {
  try {
    const photos = await Photo.find().sort({ displayOrder: 1, createdAt: -1 });
    return res.json(photos);
  } catch (error) {
    console.error('Error fetching admin photos:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Creates a new photo gallery record with image upload.
 * POST /api/v1/admin/photos
 */
export async function createPhoto(req, res) {
  const {
    title,
    description,
    year,
    decade,
    location,
    peopleInPhoto,
    tags,
    displayOrder,
    isFeatured,
    isVisible
  } = req.body;

  if (!req.file) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: ['A photograph image file is required.']
    });
  }

  try {
    // Relative image path for client serving
    const relativeImagePath = `uploads/photos/${path.basename(req.file.path)}`;

    // Parse array fields (either passed as JSON strings or comma-separated strings)
    let parsedPeople = [];
    if (peopleInPhoto) {
      if (Array.isArray(peopleInPhoto)) {
        parsedPeople = peopleInPhoto;
      } else {
        try {
          parsedPeople = JSON.parse(peopleInPhoto);
        } catch {
          parsedPeople = peopleInPhoto.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    let parsedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          parsedTags = tags.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    const photo = new Photo({
      title: title && title.trim() ? title.trim() : 'Photograph',
      description: description ? description.trim() : '',
      imagePath: relativeImagePath,
      year: year ? year.trim() : '',
      decade: decade ? decade.trim() : 'Unspecified',
      location: location ? location.trim() : '',
      peopleInPhoto: parsedPeople,
      tags: parsedTags,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isVisible: isVisible === undefined ? true : (isVisible === 'true' || isVisible === true)
    });

    await photo.save();

    await logAdminAction(
      req.session.user.id,
      'CREATE_PHOTO',
      'Photo',
      photo._id,
      { title: photo.title, year: photo.year }
    );

    return res.status(201).json({
      message: 'Photograph uploaded and added to the gallery successfully.',
      photo
    });
  } catch (error) {
    console.error('Error creating photo record:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Updates a photo gallery record with optional image replacement.
 * PATCH /api/v1/admin/photos/:id
 */
export async function updatePhoto(req, res) {
  const { id } = req.params;
  const {
    title,
    description,
    year,
    decade,
    location,
    peopleInPhoto,
    tags,
    displayOrder,
    isFeatured,
    isVisible
  } = req.body;

  try {
    const photo = await Photo.findById(id);
    if (!photo) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        message: 'Photo not found',
        errors: [`No photograph found with ID: ${id}`]
      });
    }

    if (title && title.trim()) photo.title = title.trim();
    if (description !== undefined) photo.description = description ? description.trim() : '';
    if (year !== undefined) photo.year = year ? year.trim() : '';
    if (decade !== undefined) photo.decade = decade ? decade.trim() : 'Unspecified';
    if (location !== undefined) photo.location = location ? location.trim() : '';
    if (displayOrder !== undefined) photo.displayOrder = parseInt(displayOrder, 10) || 0;
    if (isFeatured !== undefined) photo.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isVisible !== undefined) photo.isVisible = isVisible === 'true' || isVisible === true;

    if (peopleInPhoto !== undefined) {
      if (Array.isArray(peopleInPhoto)) {
        photo.peopleInPhoto = peopleInPhoto;
      } else {
        try {
          photo.peopleInPhoto = JSON.parse(peopleInPhoto);
        } catch {
          photo.peopleInPhoto = peopleInPhoto.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        photo.tags = tags;
      } else {
        try {
          photo.tags = JSON.parse(tags);
        } catch {
          photo.tags = tags.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    // Handle new photo image upload replacement
    if (req.file) {
      const serverRoot = path.resolve(__dirname, '..');
      const oldAbsolutePath = path.join(serverRoot, photo.imagePath);
      if (fs.existsSync(oldAbsolutePath)) {
        try {
          fs.unlinkSync(oldAbsolutePath);
        } catch (e) {
          console.warn('Could not remove old photo file:', e.message);
        }
      }
      photo.imagePath = `uploads/photos/${path.basename(req.file.path)}`;
    }

    await photo.save();

    await logAdminAction(
      req.session.user.id,
      'UPDATE_PHOTO',
      'Photo',
      photo._id,
      { title: photo.title }
    );

    return res.json({
      message: 'Photograph details updated successfully.',
      photo
    });
  } catch (error) {
    console.error('Error updating photo record:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Quick toggle for photo visibility.
 * PATCH /api/v1/admin/photos/:id/visibility
 */
export async function updatePhotoVisibility(req, res) {
  const { id } = req.params;
  const { isVisible } = req.body;

  try {
    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({
        message: 'Photo not found',
        errors: [`No photograph found with ID: ${id}`]
      });
    }

    photo.isVisible = isVisible === true || isVisible === 'true';
    await photo.save();

    return res.json({
      message: `Photo visibility set to ${photo.isVisible ? 'Visible' : 'Hidden'}.`,
      photo
    });
  } catch (error) {
    console.error('Error toggling photo visibility:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

/**
 * Deletes a photograph record and removes file from disk.
 * DELETE /api/v1/admin/photos/:id
 */
export async function deletePhoto(req, res) {
  const { id } = req.params;

  try {
    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({
        message: 'Photo not found',
        errors: [`No photograph found with ID: ${id}`]
      });
    }

    // Unlink image file from disk
    const serverRoot = path.resolve(__dirname, '..');
    const absoluteImagePath = path.join(serverRoot, photo.imagePath);
    if (fs.existsSync(absoluteImagePath)) {
      try {
        fs.unlinkSync(absoluteImagePath);
      } catch (e) {
        console.warn('Could not delete photo image file:', e.message);
      }
    }

    await Photo.findByIdAndDelete(id);

    await logAdminAction(
      req.session.user.id,
      'DELETE_PHOTO',
      'Photo',
      id,
      { title: photo.title }
    );

    return res.json({
      message: 'Photograph deleted from gallery successfully.'
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return res.status(500).json({
      message: 'Internal server error',
      errors: [error.message]
    });
  }
}

