'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { useRequestPasswordResetMutation } from '../hooks/use-session-query';

export const PasswordResetRequestCard = () => {
  const [email, setEmail] = useState('');
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const { mutateAsync, isPending } = useRequestPasswordResetMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const response = await mutateAsync({ email });
    setPreviewToken(response?.token ?? null);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Request a password reset</CardTitle>
        <CardDescription>
          Enter the email address associated with your account and we&apos;ll send a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Sending reset link…' : 'Send reset link'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        {previewToken ? (
          <div className="w-full rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Developer preview</p>
            <Separator className="mt-2" />
            <p className="mt-2 break-all">Reset token: {previewToken}</p>
          </div>
        ) : null}
        <div className="flex w-full justify-between text-sm text-muted-foreground">
          <span>Ready to sign in?</span>
          <Link className="text-primary underline underline-offset-4" href="/login">
            Back to login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
