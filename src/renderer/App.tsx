import React from 'react';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from '@/components/layout/MainLayout';

export const App: React.FC = () => {
  return (
    <>
      <MainLayout />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1c2333',
            color: '#e6edf3',
            border: '1px solid #30363d',
            fontSize: '13px',
          },
          duration: 3000,
        }}
      />
    </>
  );
};