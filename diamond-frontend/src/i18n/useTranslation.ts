'use client';
import { useContext } from 'react';
import { I18nContext } from './context';
export const useTranslation = () => useContext(I18nContext);
