import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Lightbulb } from 'lucide-react';

export default function DriverFeedback({ feedback }) {
    if (!feedback || feedback.length === 0) return null;

    return (
        <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
                <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Dicas de Condução
                </h4>
                <ul className="space-y-2">
                    {feedback.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                            {tip}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}