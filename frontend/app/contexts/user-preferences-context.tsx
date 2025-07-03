"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserPreferences, userPreferencesSchema } from '@/app/schemas/user-preferences.schema';
import { updateUserPreferences } from '@/app/services/user-service';
import { useToast } from '@/hooks/use-toast';

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

interface UserPreferencesProviderProps {
  children: ReactNode;
  initialPreferences?: Partial<UserPreferences>;
}

export function UserPreferencesProvider({ children, initialPreferences = {} }: UserPreferencesProviderProps) {
  const { toast } = useToast();
  
  // Initialize preferences with defaults from schema and merge with initial preferences
  const defaultPreferences = userPreferencesSchema.parse({});
  const [preferences, setPreferences] = useState<UserPreferences>({
    ...defaultPreferences,
    ...initialPreferences,
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    setIsLoading(true);
    try {
      // Optimistically update local state
      const newPreferences = { ...preferences, ...updates };
      setPreferences(newPreferences);

      // Update on server
      const response = await updateUserPreferences(updates);
      
      // Update local state with server response to ensure consistency
      if (response.preferences) {
        setPreferences(response.preferences);
      }
      
    } catch (error) {
      // Revert optimistic update on error
      setPreferences(preferences);
      
      console.error('Failed to update user preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: UserPreferencesContextType = {
    preferences,
    updatePreferences,
    isLoading,
  };

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}