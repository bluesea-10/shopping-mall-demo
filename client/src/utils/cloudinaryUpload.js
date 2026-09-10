import {
  cloudinaryConfig,
  getCloudinaryConfigError,
} from '../config/cloudinary';

let scriptPromise = null;

function loadCloudinaryScript() {
  if (window.cloudinary?.createUploadWidget) {
    return Promise.resolve(window.cloudinary);
  }

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-cloudinary-upload-widget]'
    );

    if (existing) {
      existing.addEventListener('load', () => resolve(window.cloudinary), {
        once: true,
      });
      existing.addEventListener(
        'error',
        () =>
          reject(new Error('Cloudinary 위젯 스크립트를 불러오지 못했습니다.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.async = true;
    script.dataset.cloudinaryUploadWidget = 'true';
    script.onload = () => resolve(window.cloudinary);
    script.onerror = () =>
      reject(new Error('Cloudinary 위젯 스크립트를 불러오지 못했습니다.'));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export async function openCloudinaryUploadWidget({ onSuccess, onError } = {}) {
  const configError = getCloudinaryConfigError();
  if (configError) {
    const error = new Error(configError);
    onError?.(error);
    throw error;
  }

  const { cloudName, uploadPreset } = cloudinaryConfig;
  const cloudinary = await loadCloudinaryScript();

  const widget = cloudinary.createUploadWidget(
    {
      cloudName,
      uploadPreset,
      sources: ['local', 'url', 'camera'],
      multiple: false,
      maxFiles: 1,
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      folding: false,
      styles: {
        palette: {
          window: '#FFFFFF',
          windowBorder: '#DDDDDD',
          tabIcon: '#111111',
          menuIcons: '#555555',
          textDark: '#111111',
          textLight: '#FFFFFF',
          link: '#111111',
          action: '#111111',
          inactiveTabIcon: '#999999',
          error: '#C0392B',
          inProgress: '#111111',
          complete: '#15803D',
          sourceBg: '#F7F7F7',
        },
      },
    },
    (error, result) => {
      if (error) {
        onError?.(error);
        return;
      }

      if (result?.event === 'success') {
        const imageUrl = result.info?.secure_url || result.info?.url || '';
        if (imageUrl) onSuccess?.(imageUrl, result.info);
      }
    }
  );

  widget.open();
  return widget;
}
