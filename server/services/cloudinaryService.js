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

export function uploadImage(buffer) {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'image'
    }, (error, result) => {
      if (error) return reject(error);
      resolve({
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id
      });
    });

    stream.end(buffer);
  });
}

export function isCloudinaryError(error) {
  return Boolean(error?.http_code || error?.name === 'AuthorizationRequiredError');
}

export function deleteImage(publicId) {
  if (!publicId) return Promise.resolve();
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
