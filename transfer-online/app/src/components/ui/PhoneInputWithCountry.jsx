import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COUNTRY_CODES = [
  { code: '+55', country: 'BR', label: '🇧🇷 +55' },
  { code: '+1', country: 'US', label: '🇺🇸 +1' },
  { code: '+351', country: 'PT', label: '🇵🇹 +351' },
  { code: '+258', country: 'MZ', label: '🇲🇿 +258' },
  { code: '+244', country: 'AO', label: '🇦🇴 +244' },
  { code: '+238', country: 'CV', label: '🇨🇻 +238' },
  { code: '+44', country: 'GB', label: '🇬🇧 +44' },
  { code: '+34', country: 'ES', label: '🇪🇸 +34' },
  { code: '+33', country: 'FR', label: '🇫🇷 +33' },
  { code: '+49', country: 'DE', label: '🇩🇪 +49' },
  { code: '+39', country: 'IT', label: '🇮🇹 +39' },
  { code: '+54', country: 'AR', label: '🇦🇷 +54' },
  { code: '+598', country: 'UY', label: '🇺🇾 +598' },
  { code: '+56', country: 'CL', label: '🇨🇱 +56' },
  { code: '+57', country: 'CO', label: '🇨🇴 +57' },
  { code: '+52', country: 'MX', label: '🇲🇽 +52' },
  { code: '+51', country: 'PE', label: '🇵🇪 +51' },
  { code: '+595', country: 'PY', label: '🇵🇾 +595' },
  { code: '+591', country: 'BO', label: '🇧🇴 +591' },
  { code: '+593', country: 'EC', label: '🇪🇨 +593' },
  { code: '+58', country: 'VE', label: '🇻🇪 +58' },
  { code: '+507', country: 'PA', label: '🇵🇦 +507' },
  { code: '+506', country: 'CR', label: '🇨🇷 +506' },
  { code: '+27', country: 'ZA', label: '🇿🇦 +27' },
  { code: '+86', country: 'CN', label: '🇨🇳 +86' },
  { code: '+81', country: 'JP', label: '🇯🇵 +81' },
  { code: '+91', country: 'IN', label: '🇮🇳 +91' },
  { code: '+61', country: 'AU', label: '🇦🇺 +61' },
  { code: '+7', country: 'RU', label: '🇷🇺 +7' },
  { code: '+32', country: 'BE', label: '🇧🇪 +32' },
  { code: '+31', country: 'NL', label: '🇳🇱 +31' },
  { code: '+41', country: 'CH', label: '🇨🇭 +41' },
  { code: '+43', country: 'AT', label: '🇦🇹 +43' },
  { code: '+46', country: 'SE', label: '🇸🇪 +46' },
  { code: '+47', country: 'NO', label: '🇳🇴 +47' },
  { code: '+45', country: 'DK', label: '🇩🇰 +45' },
  { code: '+358', country: 'FI', label: '🇫🇮 +358' },
  { code: '+353', country: 'IE', label: '🇮🇪 +353' },
  { code: '+30', country: 'GR', label: '🇬🇷 +30' },
  { code: '+90', country: 'TR', label: '🇹🇷 +90' },
  { code: '+972', country: 'IL', label: '🇮🇱 +972' },
  { code: '+971', country: 'AE', label: '🇦🇪 +971' },
  { code: '+20', country: 'EG', label: '🇪🇬 +20' },
  { code: '+60', country: 'MY', label: '🇲🇾 +60' },
  { code: '+62', country: 'ID', label: '🇮🇩 +62' },
  { code: '+63', country: 'PH', label: '🇵🇭 +63' },
  { code: '+65', country: 'SG', label: '🇸🇬 +65' },
  { code: '+66', country: 'TH', label: '🇹🇭 +66' },
  { code: '+84', country: 'VN', label: '🇻🇳 +84' },
];

export default function PhoneInputWithCountry({ 
  value, 
  onChange, 
  id, 
  required = false, 
  disabled = false, 
  placeholder = "(00) 00000-0000",
  className = "" 
}) {
  const [countryCode, setCountryCode] = useState('+55');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Initialize from value prop
  useEffect(() => {
    if (!value) {
      setPhoneNumber('');
      return;
    }

    // Check if value starts with any known country code
    const foundCountry = COUNTRY_CODES.find(c => value.startsWith(c.code));
    
    if (foundCountry) {
      setCountryCode(foundCountry.code);
      // Remove country code from display number
      const rawNumber = value.substring(foundCountry.code.length);
      // Format for display if needed (simple formatting for BR)
      setPhoneNumber(formatDisplayNumber(rawNumber, foundCountry.code));
    } else {
      // Fallback: assume it's a raw number without country code or unknown format
      // If it looks like a BR number but no +55, keep +55 default
      // Just clean formatting
      setPhoneNumber(value);
    }
  }, [value]);

  const formatDisplayNumber = (number, code) => {
    if (!number) return '';
    // Remove non-digits
    const clean = number.replace(/\D/g, '');
    
    if (code === '+55') {
      // Format BR: (XX) XXXXX-XXXX
      if (clean.length <= 10) {
        return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else {
        return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
    }
    
    return clean;
  };

  const handleCountryChange = (newCode) => {
    setCountryCode(newCode);
    updateParent(newCode, phoneNumber);
  };

  const handlePhoneChange = (e) => {
    let newValue = e.target.value;
    
    // Only allow digits and formatting chars for input
    // But for state, we might want to keep it cleaner or just raw
    // Let's keep user input but filter for E.164 construction
    
    setPhoneNumber(newValue);
    updateParent(countryCode, newValue);
  };

  const updateParent = (code, number) => {
    // Clean number for E.164
    const cleanNumber = number.replace(/\D/g, '');
    if (!cleanNumber) {
      onChange('');
      return;
    }
    onChange(`${code}${cleanNumber}`);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select
        value={countryCode}
        onValueChange={handleCountryChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[110px] flex-shrink-0 bg-white">
          <SelectValue placeholder="País" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              {country.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        id={id}
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="flex-1 bg-white"
      />
    </div>
  );
}