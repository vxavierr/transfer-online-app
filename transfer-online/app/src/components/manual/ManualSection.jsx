import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ManualSection({ title, children }) {
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}