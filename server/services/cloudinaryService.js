import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function configureCloudinary() {
  if (configured) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
  configured = true;
}

export function uploadMedia(buffer, resourceType = 'image') {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: resourceType
    }, (error, result) => {
      if (error) return reject(error);
      resolve({
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        resourceType
      });
    });

    stream.end(buffer);
  });
}

export function uploadImage(buffer) {
  return uploadMedia(buffer, 'image');
}

export function getUploadSignature(resourceType = 'image') {
  configureCloudinary();
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'family-gallery';
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, CLOUDINARY_API_SECRET);

  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    folder,
    resourceType,
    timestamp,
    signature
  };
}

export function isCloudinaryError(error) {
  return Boolean(error?.http_code || error?.name === 'AuthorizationRequiredError');
}

export function deleteMedia(publicId, resourceType = 'image') {
  if (!publicId) return Promise.resolve();
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export function deleteImage(publicId) {
  return deleteMedia(publicId, 'image');
}
