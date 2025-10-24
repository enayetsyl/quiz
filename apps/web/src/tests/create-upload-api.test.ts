import { describe, expect, it, beforeEach, vi } from 'vitest';

const post = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post,
  },
}));

import { createUpload } from '../features/uploads/api/create-upload';

import type { UploadResponse } from '@quizgen/shared';

describe('createUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits classification metadata and file via FormData', async () => {
    const file = new File(['%PDF-1.4'], 'sample.pdf', { type: 'application/pdf' });
    const upload: UploadResponse = {
      id: 'upload-1',
      classId: 6,
      subjectId: 'subject-1',
      chapterId: 'chapter-1',
      originalFilename: 'sample.pdf',
      mimeType: 'application/pdf',
      pagesCount: 2,
      createdAt: new Date().toISOString(),
      pdfUrl: 'https://example.com/pdf',
      pages: [],
    };

    post.mockResolvedValue({ data: { success: true, data: upload } });

    const result = await createUpload({
      classId: 6,
      subjectId: 'subject-1',
      chapterId: 'chapter-1',
      file,
    });

    expect(post).toHaveBeenCalledTimes(1);
    const [, formData, config] = post.mock.calls[0] as [unknown, FormData, { withSuccessToast?: boolean | string }];

    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('classId')).toBe('6');
    expect(formData.get('subjectId')).toBe('subject-1');
    expect(formData.get('chapterId')).toBe('chapter-1');
    expect(formData.get('file')).toBeInstanceOf(File);
    expect(config?.withSuccessToast).toBeTruthy();
    expect(result).toEqual(upload);
  });
});

