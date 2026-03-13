import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function TelemetryCharts({ data }) {
    if (!data || data.length === 0) return <div className="text-center p-8 text-gray-500">Sem dados para relatório</div>;

    // Format date for chart
    const chartData = data.map(d => ({
        ...d,
        displayDate: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }));

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-500">Evolução da Nota de Segurança</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="displayDate" tick={{fontSize: 12}} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="avgScore" stroke="#2563eb" strokeWidth={2} dot={{r: 4}} name="Nota Média" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-500">Incidentes por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="displayDate" tick={{fontSize: 12}} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="totalIncidents" fill="#ef4444" radius={[4, 4, 0, 0]} name="Incidentes" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}