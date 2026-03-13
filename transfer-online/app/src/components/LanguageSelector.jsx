import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function LanguageSelector({ isCollapsed = false }) {
  const { language, changeLanguage } = useLanguage();

  const languages = [
    { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }
  ];

  return (
    <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center w-full' : ''}`}>
      {!isCollapsed && <Globe className="w-4 h-4 text-gray-500" />}
      <Select value={language} onValueChange={changeLanguage}>
        <SelectTrigger className={`${isCollapsed ? 'w-full px-1 justify-center border-0 bg-transparent shadow-none' : 'w-[180px]'}`}>
          {isCollapsed ? (
             <span className="text-xl leading-none">{languages.find(l => l.code === language)?.flag}</span>
          ) : (
             <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}