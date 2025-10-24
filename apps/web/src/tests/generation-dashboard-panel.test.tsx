import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GenerationDashboardPanel } from '@/features/generation/components/generation-dashboard-panel';

import { renderWithProviders } from './test-utils';

vi.mock('@/features/taxonomy/hooks/use-taxonomy', () => ({
  useTaxonomyQuery: () => ({
    data: {
      classes: [
        {
          id: 6,
          displayName: 'Class 6',
          subjects: [
            {
              id: 'subject-1',
              classId: 6,
              name: 'Science',
              code: 'SC',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              chapters: [
                {
                  id: 'chapter-1',
                  subjectId: 'subject-1',
                  name: 'Chapter 1',
                  ordinal: 1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      ],
    },
  }),
}));

vi.mock('@/features/uploads/hooks/use-uploads', () => ({
  useChapterUploadsQuery: () => ({
    data: [
      {
        id: 'upload-1',
        chapterId: 'chapter-1',
        originalFilename: 'chapter.pdf',
        createdAt: new Date().toISOString(),
        pagesCount: 3,
        completedPages: 0,
        pdfUrl: 'https://example.com/pdf',
      },
    ],
  }),
  useRecentUpload: (uploads: unknown[]) => (uploads[0] ?? null),
}));

const startGeneration = vi.fn();
const retryPage = vi.fn();
const regeneratePage = vi.fn();

vi.mock('@/features/generation/hooks/use-generation', () => ({
  useGenerationOverviewQuery: () => ({
    data: {
      id: 'upload-1',
      chapterId: 'chapter-1',
      originalFilename: 'chapter.pdf',
      createdAt: new Date().toISOString(),
      pagesCount: 1,
      statusCounts: {
        pending: 0,
        queued: 1,
        generating: 0,
        complete: 0,
        failed: 0,
      },
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          status: 'queued',
          language: 'en',
          lastGeneratedAt: null,
          questionCount: 0,
          pngUrl: 'https://example.com/page.png',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          attempts: [
            {
              id: 'attempt-1',
              attemptNo: 1,
              model: 'gemini',
              promptVersion: 'v1',
              isSuccess: false,
              errorMessage: 'Validation failed',
              requestExcerpt: 'Prompt summary',
              responseExcerpt: null,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
    },
    isLoading: false,
  }),
  useStartGenerationMutation: () => ({ mutateAsync: startGeneration, isPending: false }),
  useRetryPageMutation: () => ({ mutateAsync: retryPage, isPending: false }),
  useRegeneratePageMutation: () => ({ mutateAsync: regeneratePage, isPending: false }),
}));

describe('GenerationDashboardPanel', () => {
  it('renders status summary and attempt details', async () => {
    renderWithProviders(<GenerationDashboardPanel />);

    await waitFor(() => {
      expect(screen.getByText('Queued')).toBeInTheDocument();
    });

    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Validation failed')).toBeInTheDocument();
    expect(screen.getByText('Prompt summary')).toBeInTheDocument();
  });
});
