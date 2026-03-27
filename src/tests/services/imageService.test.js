/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadImage, handlePasteEvent } from '../../services/imageService';

vi.mock('../../utils/errorHandler', () => ({
  reportError: vi.fn(),
}));

function createMockFile(type = 'image/png', size = 1000) {
  return { type, size, name: 'test.png' };
}

function setupImageMocks(imgWidth = 200, imgHeight = 150) {
  const mockReader = {
    readAsDataURL: vi.fn(),
    onload: null,
    onerror: null,
  };

  const mockImg = {
    onload: null,
    onerror: null,
    width: imgWidth,
    height: imgHeight,
    src: '',
  };

  vi.stubGlobal(
    'FileReader',
    vi.fn(() => mockReader)
  );
  vi.stubGlobal(
    'Image',
    vi.fn(() => mockImg)
  );

  return { mockReader, mockImg };
}

describe('imageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('uploadImage', () => {
    // Triggers FileReader + Image onload callbacks and returns the upload result
    async function uploadWithDimensions(w, h, file) {
      const { mockReader, mockImg } = setupImageMocks(w, h);
      const promise = uploadImage(file || createMockFile(), 'user1');
      mockReader.onload({ target: { result: 'data:image/png;base64,abc' } });
      mockImg.onload();
      return promise;
    }

    it('converts and returns image data for small images', async () => {
      const result = await uploadWithDimensions(200, 150);
      expect(result.url).toBe('data:image/jpeg;base64,mock'); // from global toDataURL mock in setup.js
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
      expect(result.type).toBe('image/png');
      expect(typeof result.size).toBe('number');
    });

    it('resizes landscape images exceeding max dimensions', async () => {
      const result = await uploadWithDimensions(800, 400);
      expect(result.width).toBe(400);
      expect(result.height).toBe(200);
    });

    it('resizes portrait images exceeding max dimensions', async () => {
      const result = await uploadWithDimensions(300, 800);
      expect(result.width).toBe(150);
      expect(result.height).toBe(400);
    });

    it('does not resize images within max dimensions', async () => {
      const result = await uploadWithDimensions(100, 100);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('rejects non-image files', async () => {
      setupImageMocks();
      await expect(uploadImage(createMockFile('application/pdf'), 'user1')).rejects.toThrow(
        'File must be an image'
      );
    });

    it('rejects files over 1MB', async () => {
      setupImageMocks();
      await expect(
        uploadImage(createMockFile('image/png', 2 * 1024 * 1024), 'user1')
      ).rejects.toThrow('Image must be smaller than 1MB');
    });

    it('rejects on FileReader error', async () => {
      const { mockReader } = setupImageMocks();
      const promise = uploadImage(createMockFile(), 'user1');
      mockReader.onerror();
      await expect(promise).rejects.toThrow('Failed to read file');
    });

    it('rejects on Image load error', async () => {
      const { mockReader, mockImg } = setupImageMocks();
      const promise = uploadImage(createMockFile(), 'user1');
      mockReader.onload({ target: { result: 'data:image/png;base64,abc' } });
      mockImg.onerror();
      await expect(promise).rejects.toThrow('Failed to load image');
    });
  });

  describe('handlePasteEvent', () => {
    it('returns blob when clipboard contains an image', async () => {
      const mockBlob = new Blob([''], { type: 'image/png' });
      const event = {
        clipboardData: {
          items: [{ type: 'image/png', getAsFile: () => mockBlob }],
        },
      };
      expect(await handlePasteEvent(event)).toBe(mockBlob);
    });

    it('returns null when clipboard has no image', async () => {
      const event = {
        clipboardData: {
          items: [{ type: 'text/plain', getAsFile: () => null }],
        },
      };
      expect(await handlePasteEvent(event)).toBeNull();
    });

    it('returns null for empty clipboard', async () => {
      expect(await handlePasteEvent({ clipboardData: { items: [] } })).toBeNull();
    });

    it('returns null when clipboardData is undefined', async () => {
      expect(await handlePasteEvent({})).toBeNull();
    });

    it('skips image items that return null from getAsFile', async () => {
      const event = {
        clipboardData: {
          items: [{ type: 'image/png', getAsFile: () => null }],
        },
      };
      expect(await handlePasteEvent(event)).toBeNull();
    });

    it('returns first image when multiple items present', async () => {
      const mockBlob = new Blob([''], { type: 'image/jpeg' });
      const event = {
        clipboardData: {
          items: [
            { type: 'text/html', getAsFile: () => null },
            { type: 'image/jpeg', getAsFile: () => mockBlob },
          ],
        },
      };
      expect(await handlePasteEvent(event)).toBe(mockBlob);
    });
  });
});
