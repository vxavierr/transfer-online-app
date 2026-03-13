import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, ChevronLeft, ChevronRight, User, Truck, Clock, AlertCircle, Loader2 } from "lucide-react";
import { format, addDays, subDays, parseISO, isSameDay, isWithinInterval, addMinutes, startOfDay, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

export default function DriverScheduleDialog({ 
    isOpen, 
    onClose, 
    drivers = [], 
    allTrips = [], 
    selectedTrip = null, 
    onAssignDriver 
}) {
    // Initialize date with selected trip date or today
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Update date when dialog opens with a selected trip
    React.useEffect(() => {
        if (isOpen && selectedTrip?.date) {
            const tripDate = parseISO(selectedTrip.date.includes('T') ? selectedTrip.date : `${selectedTrip.date}T12:00:00`);
            setCurrentDate(tripDate);
        } else if (isOpen) {
            setCurrentDate(new Date());
        }
    }, [isOpen, selectedTrip]);

    const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
    const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));

    // State for fetched trips and dynamic drivers list
    const [fetchedTrips, setFetchedTrips] = useState([]);
    const [driversInfo, setDriversInfo] = useState([]);
    const [dynamicDrivers, setDynamicDrivers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch trips from backend when date changes
    React.useEffect(() => {
        if (!isOpen) return;

        const fetchSchedule = async () => {
            setIsLoading(true);
            try {
                const dateStr = format(currentDate, 'yyyy-MM-dd');
                
                // Fetch ALL trips for the day to discover all drivers
                const response = await base44.functions.invoke('getDriverSchedule', {
                    date: dateStr,
                    fetch_all_drivers: true 
                });

                if (response.data && response.data.trips) {
                    const trips = response.data.trips;
                    setFetchedTrips(trips);
                    if (response.data.drivers_info) {
                        setDriversInfo(response.data.drivers_info);
                    }
                    
                    // Extract unique drivers from trips that are NOT in the initial props
                    const propDriverIds = new Set(drivers.map(d => d.id));
                    const discoveredDrivers = [];
                    const processedIds = new Set();

                    trips.forEach(t => {
                        if (t.driver_id && !propDriverIds.has(t.driver_id) && !processedIds.has(t.driver_id)) {
                            // Found a new driver!
                            processedIds.add(t.driver_id);
                            discoveredDrivers.push({
                                id: t.driver_id,
                                name: t.driver_name || `Motorista ${t.driver_id}`, // Fallback
                                type: t.driver_id.startsWith('casual') ? 'casual' : 'unknown'
                            });
                        }
                    });
                    
                    if (discoveredDrivers.length > 0) {
                        setDynamicDrivers(discoveredDrivers);
                    } else {
                        setDynamicDrivers([]);
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar agenda:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedule();
    }, [currentDate, isOpen]); // Removed 'drivers' dependency to avoid re-fetch loops if props change

    // Combine props drivers with dynamically discovered drivers
    const allDisplayDrivers = React.useMemo(() => {
        return [
            ...drivers,
            ...dynamicDrivers
        ].sort((a, b) => a.name.localeCompare(b.name));
    }, [drivers, dynamicDrivers]);
    
    const dayTrips = fetchedTrips;

    const getRodizioRestriction = (date, plate) => {
        if (!plate || plate.length < 2) return null;
        // Remove non-numeric chars to get last digit safely
        const numericPlate = plate.replace(/\D/g, '');
        if (numericPlate.length === 0) return null;
        
        const lastDigit = parseInt(numericPlate.slice(-1));
        const dayOfWeek = format(date, 'EEEE', { locale: ptBR }).toLowerCase();

        let restrictedDigits = [];
        // Normalizing day names just in case
        if (dayOfWeek.includes('segunda')) restrictedDigits = [1, 2];
        else if (dayOfWeek.includes('terça')) restrictedDigits = [3, 4];
        else if (dayOfWeek.includes('quarta')) restrictedDigits = [5, 6];
        else if (dayOfWeek.includes('quinta')) restrictedDigits = [7, 8];
        else if (dayOfWeek.includes('sexta')) restrictedDigits = [9, 0];
        else return null; // Weekend

        return {
            plate: plate,
            restricted: restrictedDigits.includes(lastDigit),
            dayOfWeek: dayOfWeek,
            restrictedDigits: restrictedDigits
        };
    };

    const rodizioInfo = useMemo(() => {
        const info = {};
        allDisplayDrivers.forEach(driver => {
            // Prioritize assigned trips that have a plate
            const tripWithPlate = dayTrips.find(t => t.driver_id === driver.id && t.vehicle_plate);
            
            let plateToUse = null;
            if (tripWithPlate?.vehicle_plate) {
                plateToUse = tripWithPlate.vehicle_plate;
            } else {
                // Fallback to default vehicle for the driver
                const driverInfo = driversInfo.find(d => d.id === driver.id);
                if (driverInfo?.default_plate) {
                    plateToUse = driverInfo.default_plate;
                }
            }

            if (plateToUse) {
                info[driver.id] = getRodizioRestriction(currentDate, plateToUse);
            }
        });
        return info;
    }, [allDisplayDrivers, dayTrips, currentDate, driversInfo]);

    // Check for overlap if a trip is selected
    const checkOverlap = (driverId) => {
        if (!selectedTrip) return false;
        
        const driverTrips = dayTrips.filter(t => t.driver_id === driverId);
        if (driverTrips.length === 0) return false;

        const tripStart = parseISO(`${selectedTrip.date}T${selectedTrip.start_time}`);
        // Assume 1 hour duration if not specified
        const duration = selectedTrip.duration_minutes || 60; 
        const tripEnd = addMinutes(tripStart, duration);

        return driverTrips.some(t => {
            const tStart = parseISO(`${t.date}T${t.start_time}`);
            const tDuration = t.duration_minutes || 60;
            const tEnd = addMinutes(tStart, tDuration);

            return isWithinInterval(tripStart, { start: tStart, end: tEnd }) ||
                   isWithinInterval(tripEnd, { start: tStart, end: tEnd }) ||
                   isWithinInterval(tStart, { start: tripStart, end: tripEnd });
        });
    };

    // Calculate position and width for a trip block (0-24h mapped to 0-100%)
    const getTripStyle = (trip) => {
        if (!trip.start_time) return { left: '0%', width: '0%' };
        
        const [hours, minutes] = trip.start_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const duration = trip.duration_minutes || 60; // Default 1h
        
        const startPercent = (startMinutes / 1440) * 100;
        const widthPercent = (duration / 1440) * 100;
        
        return {
            left: `${startPercent}%`,
            width: `${Math.max(widthPercent, 2)}%` // Min 2% width to be visible
        };
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] w-[1000px] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b bg-gray-50/80">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                Agenda de Motoristas
                            </DialogTitle>
                            <DialogDescription>
                                {selectedTrip ? (
                                    <span>
                                        Atribuindo viagem: <strong>{selectedTrip.name}</strong> ({selectedTrip.start_time})
                                    </span>
                                ) : (
                                    "Consulte a disponibilidade da frota"
                                )}
                            </DialogDescription>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white p-1 rounded-md border shadow-sm">
                            <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8">
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="font-medium min-w-[140px] text-center text-sm">
                                {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col bg-white relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    )}
                    {/* Time Ruler */}
                    <div className="flex border-b h-8 text-[10px] text-gray-400 bg-gray-50 flex-shrink-0">
                        <div className="w-48 flex-shrink-0 border-r px-2 flex items-center">Motorista</div>
                        <div className="flex-1 relative">
                            {Array.from({ length: 25 }).map((_, i) => (
                                <div key={i} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: `${(i / 24) * 100}%` }}>
                                    <span className="pl-1 pt-1 block">{i}h</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="divide-y">
                            {allDisplayDrivers.map(driver => {
                                const driverTrips = dayTrips.filter(t => t.driver_id === driver.id);
                                const hasOverlap = checkOverlap(driver.id);
                                const isAssignedToSelected = selectedTrip?.driver_id === driver.id;

                                return (
                                    <div 
                                        key={driver.id} 
                                        className={cn(
                                            "flex h-16 group transition-colors",
                                            selectedTrip ? "cursor-pointer hover:bg-blue-50" : "",
                                            hasOverlap ? "bg-red-50/30 hover:bg-red-50" : "",
                                            isAssignedToSelected ? "bg-green-50" : ""
                                        )}
                                        onClick={() => {
                                            if (selectedTrip && onAssignDriver) {
                                                if (hasOverlap) {
                                                    if (!confirm("Este motorista já tem uma viagem neste horário. Deseja atribuir mesmo assim?")) return;
                                                }
                                                onAssignDriver(driver.id);
                                            }
                                        }}
                                    >
                                        {/* Driver Info Column */}
                                        <div className="w-48 flex-shrink-0 border-r p-2 flex flex-col justify-center text-xs">
                                            <div className="font-bold text-gray-800 truncate flex items-center gap-1 flex-wrap">
                                                {isAssignedToSelected && <Truck className="w-3 h-3 text-green-600" />}
                                                {driver.name}
                                                {rodizioInfo[driver.id] && (
                                                    <Badge className={`text-[9px] px-1 h-4 ${rodizioInfo[driver.id].restricted ? 'bg-red-500 hover:bg-red-600 text-white border-red-600' : 'bg-green-100 hover:bg-green-200 text-green-800 border-green-200'}`}>
                                                        {rodizioInfo[driver.id].restricted ? `🚫 ${rodizioInfo[driver.id].plate}` : `✓ ${rodizioInfo[driver.id].plate}`}
                                                    </Badge>
                                                )}
                                            </div>
                                            {hasOverlap && selectedTrip && (
                                                <div className="text-red-600 flex items-center gap-1 mt-1 font-semibold">
                                                    <AlertCircle className="w-3 h-3" /> Ocupado
                                                </div>
                                            )}
                                            {!hasOverlap && selectedTrip && (
                                                <div className="text-blue-600 flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Truck className="w-3 h-3" /> Atribuir
                                                </div>
                                            )}
                                        </div>

                                        {/* Timeline Column */}
                                        <div className="flex-1 relative h-full">
                                            {/* Grid Lines */}
                                            {Array.from({ length: 25 }).map((_, i) => (
                                                <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(i / 24) * 100}%` }} />
                                            ))}

                                            {/* Selected Trip Ghost (Preview) */}
                                            {selectedTrip && !hasOverlap && !isAssignedToSelected && (
                                                <div 
                                                    className="absolute top-2 bottom-2 bg-blue-500/20 border border-blue-500/50 rounded-md z-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                                    style={getTripStyle(selectedTrip)}
                                                />
                                            )}

                                            {/* Existing Trips */}
                                            {driverTrips.map(trip => (
                                                <div
                                                    key={trip.id}
                                                    className={cn(
                                                        "absolute top-2 bottom-2 rounded-md border text-[10px] flex items-center px-1 overflow-hidden whitespace-nowrap z-10 shadow-sm",
                                                        trip.id === selectedTrip?.id ? "bg-green-100 border-green-400 text-green-800 ring-2 ring-green-500" : "bg-blue-100 border-blue-300 text-blue-800"
                                                    )}
                                                    style={getTripStyle(trip)}
                                                    title={`${trip.start_time} - ${trip.name} (${trip.origin} -> ${trip.destination})`}
                                                >
                                                    <span className="font-bold mr-1">{trip.start_time}</span>
                                                    {trip.trip_code && <span className="font-mono mr-1">[{trip.trip_code}]</span>}
                                                    {trip.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {allDisplayDrivers.length === 0 && (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    Nenhum motorista encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="text-xs text-gray-500 flex gap-4">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div> Viagem Existente</div>
                        {selectedTrip && <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-400 rounded"></div> Viagem Atual</div>}
                        {selectedTrip && <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div> Conflito de Horário</div>}
                    </div>
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}