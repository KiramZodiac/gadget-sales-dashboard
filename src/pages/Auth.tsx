'use client';

import React from 'react';
import { motion } from 'framer-motion';
import AuthForm from '@/components/AuthForm';
import { Sparkles } from 'lucide-react';

const Auth = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 md:p-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center mb-3">
            <Sparkles className="text-blue-600 dark:text-blue-400 w-6 h-6 mr-2" />
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Yo Biz</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Streamline your sales with Yobiz
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Your business data is encrypted for maximum security
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <AuthForm />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
