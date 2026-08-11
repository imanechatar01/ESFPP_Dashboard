// frontend/src/pages/forgot-password.jsx
import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export function ForgotPassword({ navigate }) {
  return (
    <AuthLayout>
      <ForgotPasswordForm navigate={navigate} />
    </AuthLayout>
  );
}