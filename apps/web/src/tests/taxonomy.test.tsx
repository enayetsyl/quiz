import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ChapterForm,
  SubjectCreateForm
} from '@/features/taxonomy/components/taxonomy-manager';

describe('taxonomy forms', () => {
  it('prevents subject creation when code format is invalid', async () => {
    const handleCreate = vi.fn().mockResolvedValue(undefined);
    render(<SubjectCreateForm classId={6} onCreate={handleCreate} isSubmitting={false} />);

    fireEvent.change(screen.getByLabelText(/Subject name/i), {
      target: { value: 'Mathematics' }
    });
    fireEvent.change(screen.getByLabelText(/Subject code/i), {
      target: { value: 'abc' }
    });

    fireEvent.submit(screen.getByRole('button', { name: /Add subject/i }));

    expect(handleCreate).not.toHaveBeenCalled();
    expect(await screen.findByText(/two uppercase letters/i)).toBeInTheDocument();
  });

  it('guards against duplicate chapter ordinals', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ChapterForm
        mode="create"
        existingOrdinals={[1, 2]}
        onSubmit={handleSubmit}
        isSubmitting={false}
      />
    );

    fireEvent.change(screen.getByLabelText(/Chapter name/i), {
      target: { value: 'Introduction' }
    });
    fireEvent.change(screen.getByLabelText(/Ordinal/i), {
      target: { value: '1' }
    });

    fireEvent.submit(screen.getByRole('button', { name: /Add chapter/i }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });
});
