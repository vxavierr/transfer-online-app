import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PassengerSearchSelect({
  value, // current passenger_identifier
  onSelect, // (passengerIdentifier, passengerName) => void
  placeholder,
  className
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Fetch all service requests to get passenger data
  const { data: serviceRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['allServiceRequests'],
    queryFn: () => base44.entities.ServiceRequest.list('created_date', 1000), // Fetch up to 1000 requests
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all clients to get client names
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['allClients'],
    queryFn: () => base44.entities.Client.list(),
    staleTime: 5 * 60 * 1000,
  });

  const passengers = useMemo(() => {
    const uniquePassengers = {};

    // Process service requests to find unique passengers
    serviceRequests.forEach(req => {
      const identifier = req.passenger_email || req.passenger_phone;
      if (identifier && !uniquePassengers[identifier]) {
        const client = clients.find(c => c.id === req.client_id);
        uniquePassengers[identifier] = {
          identifier: identifier,
          name: req.passenger_name || 'Desconhecido',
          clientName: client?.name || 'Cliente Geral',
        };
      }
    });

    // Deduplicate and convert to array for Command component
    return Object.values(uniquePassengers);
  }, [serviceRequests, clients]);

  const selectedPassenger = passengers.find(p => p.identifier === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between overflow-hidden text-ellipsis", className)}
        >
          {selectedPassenger ? (
            <span className="block truncate">
              {selectedPassenger.name} ({selectedPassenger.clientName}) - {selectedPassenger.identifier}
            </span>
          ) : (
            placeholder || "Selecione um passageiro..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar passageiro..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList>
            {isLoadingRequests || isLoadingClients ? (
              <CommandItem className="flex justify-center py-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
              </CommandItem>
            ) : (
              <> 
                <CommandEmpty>Nenhum passageiro encontrado.</CommandEmpty>
                <CommandGroup>
                  {passengers
                    .filter(p => 
                      p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.identifier.toLowerCase().includes(search.toLowerCase()) ||
                      p.clientName.toLowerCase().includes(search.toLowerCase())
                    )
                    .map(passenger => (
                      <CommandItem
                        key={passenger.identifier}
                        value={passenger.identifier}
                        onSelect={(currentIdentifier) => {
                            const selected = passengers.find(p => p.identifier === currentIdentifier);
                            if (selected) {
                                onSelect(selected.identifier, selected.name);
                            }
                            setOpen(false);
                            setSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === passenger.identifier ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-medium truncate">{passenger.name}</span>
                            <span className="text-xs text-gray-500 truncate">{passenger.clientName} - {passenger.identifier}</span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}