function readEnv(name) {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Cloudinary Upload Widget (unsigned)에 필요한 클라이언트 환경변수
 * - VITE_CLOUDINARY_CLOUD_NAME: Cloudinary Dashboard의 Cloud Name
 * - VITE_CLOUDINARY_UPLOAD_PRESET: Unsigned Upload Preset 이름
 *
 * API Key / API Secret은 프론트엔드에 넣지 않습니다.
 */
export const cloudinaryConfig = {
  cloudName: readEnv('VITE_CLOUDINARY_CLOUD_NAME'),
  uploadPreset: readEnv('VITE_CLOUDINARY_UPLOAD_PRESET'),
};

export function getCloudinaryConfigError() {
  const missing = [];

  if (!cloudinaryConfig.cloudName) {
    missing.push('VITE_CLOUDINARY_CLOUD_NAME');
  }
  if (!cloudinaryConfig.uploadPreset) {
    missing.push('VITE_CLOUDINARY_UPLOAD_PRESET');
  }

  if (missing.length === 0) return null;

  return `Cloudinary 환경변수가 없습니다: ${missing.join(', ')}. client/.env에 설정한 뒤 Vite를 재시작하세요.`;
}
