import { toast as toastActions } from '@/components/ui/toaster';

export const toast = {
  success: (message: string) => {
    toastActions.success(message);
  },
  error: (message: string) => {
    toastActions.error(message);
  }
};
