import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Car } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function DriverRanking({ ranking }) {
    if (!ranking || ranking.length === 0) return <div className="text-center p-8 text-gray-500">Nenhum dado de ranking disponível</div>;

    const getRankIcon = (index) => {
        switch(index) {
            case 0: return <Trophy className="w-6 h-6 text-yellow-500" />;
            case 1: return <Medal className="w-6 h-6 text-gray-400" />;
            case 2: return <Medal className="w-6 h-6 text-amber-600" />;
            default: return <span className="font-bold text-gray-500 text-lg w-6 text-center">{index + 1}</span>;
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Ranking de Segurança
            </h3>
            
            <div className="space-y-3">
                {ranking.map((driver, index) => (
                    <Card key={driver.driverId} className={`transition-all hover:shadow-md ${index === 0 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="flex-shrink-0 w-8 flex justify-center">
                                {getRankIcon(index)}
                            </div>
                            
                            <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                                <AvatarImage src={driver.photoUrl} />
                                <AvatarFallback>{driver.driverName?.[0]}</AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">{driver.driverName}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Car className="w-3 h-3" />
                                    <span>{driver.totalTrips} viagens</span>
                                    <span>•</span>
                                    <span>{driver.totalDistance} km</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">{driver.avgScore}</div>
                                <div className="text-xs text-gray-500">Nota Média</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}