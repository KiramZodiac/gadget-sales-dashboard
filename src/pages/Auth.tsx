
import React from 'react';
import AuthForm from '@/components/AuthForm';

const Auth = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Yo Biz</h1>
          <p className="text-muted-foreground mt-2">Sales dashboard for your bussiness stores</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
