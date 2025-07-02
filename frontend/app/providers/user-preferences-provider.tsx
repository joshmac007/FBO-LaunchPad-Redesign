"use client";

import React from 'react';
import { UserPreferencesProvider } from '@/app/contexts/user-preferences-context';
import { usePermissions } from '@/app/contexts/permission-context';

interface UserPreferencesProviderWrapperProps {
  children: React.ReactNode;
}

export function UserPreferencesProviderWrapper({ children }: UserPreferencesProviderWrapperProps) {
  const { user } = usePermissions();
  
  // Extract preferences from user object, with fallback to empty object
  const initialPreferences = user?.preferences || {};
  
  return (
    <UserPreferencesProvider initialPreferences={initialPreferences}>
      {children}
    </UserPreferencesProvider>
  );
}