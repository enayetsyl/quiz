'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useResetPasswordMutation } from '../hooks/use-session-query';

export const PasswordResetConfirmCard = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const { mutateAsync, isPending } = useResetPasswordMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await mutateAsync({ token, password });
    setToken('');
    setPassword('');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Paste the token from your email and choose a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="reset-token">Reset token</Label>
            <Input
              id="reset-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="paste-your-token"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Updating password…' : 'Update password'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex w-full justify-between text-sm text-muted-foreground">
        <span>Remembered your password?</span>
        <Link className="text-primary underline underline-offset-4" href="/login">
          Back to login
        </Link>
      </CardFooter>
    </Card>
  );
};
