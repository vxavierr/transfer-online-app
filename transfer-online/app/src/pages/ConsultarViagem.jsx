import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Loader2, Calendar, Clock, MapPin, User, Phone, Bus, Plane, AlertTriangle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function ConsultarViagem() {
    const [nameQuery, setNameQuery] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]); // Alterado para array
    const [error, setError] = useState(null);

    const handleNameChange = async (e) => {
        const value = e.target.value;
        setNameQuery(value);
        
        if (value.length >= 3) {
            try {
                const response = await base44.functions.invoke('getPassengerNamesForAutocomplete', { query: value });
                setSuggestions(response.data.names || []);
            } catch (err) {
                console.error("Erro ao buscar sugestões:", err);
            }
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionClick = (name) => {
        setNameQuery(name);
        setSuggestions([]);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!nameQuery || !identifier) {
            setError("Por favor, preencha o nome e o documento ou telefone.");
            return;
        }

        setIsSearching(true);
        setError(null);
        setResults([]); // Limpa resultados anteriores

        try {
            const response = await base44.functions.invoke('consultarViagem', { 
                name: nameQuery, 
                identifier: identifier 
            });

            if (response.data.found && response.data.results.length > 0) {
                setResults(response.data.results); // Define o array de resultados
            } else {
                setError(response.data.message || "Nenhuma viagem encontrada. Verifique os dados e tente novamente.");
            }
        } catch (err) {
            console.error("Erro na consulta:", err);
            setError("Ocorreu um erro ao consultar sua viagem. Tente novamente mais tarde.");
        } finally {
            setIsSearching(false);
        }
    };

    // Formata a data ignorando timezone para exibição correta
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [year, month, day] = cleanDate.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto space-y-8">
                <div>
                    <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar ao site
                    </Link>
                </div>
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Search className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Consultar Viagem</h1>
                    <p className="mt-2 text-gray-600">
                        Encontre os detalhes do seu transfer usando seu nome e telefone ou documento.
                    </p>
                </div>

                <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Seus Dados</CardTitle>
                        <CardDescription>Preencha os campos abaixo para localizar seu agendamento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <Input
                                    type="text"
                                    placeholder="Digite seu nome..."
                                    value={nameQuery}
                                    onChange={handleNameChange}
                                    className="bg-white"
                                />
                                {suggestions.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                                        {suggestions.map((name, idx) => (
                                            <div
                                                key={idx}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                                onClick={() => handleSuggestionClick(name)}
                                            >
                                                {name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone ou Documento (RG/CPF)</label>
                                <Input
                                    type="text"
                                    placeholder="Ex: 11999999999 ou CPF sem pontos"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="bg-white"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Para sua segurança e privacidade, solicitamos uma segunda identificação (telefone ou documento).
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6" disabled={isSearching}>
                                {isSearching ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Buscando...
                                    </>
                                ) : (
                                    "Buscar Viagem"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Iterate over results to display each trip */}
                {results.length > 0 && (
                    <div className="space-y-6">
                        {results.map((resultItem, index) => (
                            <Card key={index} className="shadow-2xl border-t-4 border-t-blue-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <CardHeader className="bg-gray-50 border-b border-gray-100">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl text-blue-800">{resultItem.eventName}</CardTitle>
                                            <p className="text-sm text-gray-500 mt-1">Passageiro: {resultItem.passengerName}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${resultItem.trip.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                                                  resultItem.trip.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {resultItem.trip.status === 'confirmed' ? 'Confirmado' : resultItem.trip.status}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center text-sm text-gray-500 mb-1">
                                                <Calendar className="w-4 h-4 mr-1" /> Data
                                            </div>
                                            <p className="font-semibold text-gray-900">{formatDate(resultItem.trip.date)}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center text-sm text-gray-500 mb-1">
                                                <Clock className="w-4 h-4 mr-1" /> Horário
                                            </div>
                                            <p className="font-semibold text-gray-900">
                                                {resultItem.trip.isGrouped && resultItem.trip.groupDepartureText 
                                                    ? <span className="text-blue-600 text-sm">{resultItem.trip.groupDepartureText}</span>
                                                    : resultItem.trip.time}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 border-t border-gray-100 pt-4">
                                        <div>
                                            <div className="flex items-center text-sm text-gray-500 mb-1">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div> Origem
                                            </div>
                                            <p className="font-medium text-gray-900 ml-4">{resultItem.trip.origin}</p>
                                        </div>

                                        {resultItem.trip.stops && resultItem.trip.stops.length > 0 && (
                                            <div className="ml-4 pl-4 border-l-2 border-gray-100 space-y-2">
                                                {resultItem.trip.stops.map((stop, i) => (
                                                    <div key={i}>
                                                        <p className="text-xs text-gray-400 uppercase">Parada {i + 1}</p>
                                                        <p className="text-sm text-gray-700">{stop.address || stop.notes}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex items-center text-sm text-gray-500 mb-1">
                                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div> Destino
                                            </div>
                                            <p className="font-medium text-gray-900 ml-4">{resultItem.trip.destination}</p>
                                        </div>
                                    </div>

                                    {resultItem.trip.isGrouped && (
                                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm">
                                            <p className="text-yellow-800 font-medium flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" /> Transfer Compartilhado
                                            </p>
                                            <p className="text-yellow-700 mt-1 text-xs">
                                                Agrupado com outros voos. Aguarde o receptivo.
                                            </p>
                                            {resultItem.trip.groupFlights.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {resultItem.trip.groupFlights.map(f => (
                                                        <span key={f} className="bg-white/50 px-1.5 py-0.5 rounded text-[10px] font-semibold text-yellow-800 border border-yellow-200">
                                                            Voo {f}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Bus className="w-5 h-5 text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold">Veículo</p>
                                                <p className="text-sm font-medium text-gray-900">{resultItem.trip.vehicleInfo}</p>
                                            </div>
                                        </div>
                                        
                                        {resultItem.trip.coordinatorContact ? (
                                            <div className="flex items-start gap-3 pt-2 border-t border-gray-200/50">
                                                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold">Coordenação / Suporte</p>
                                                    <p className="text-sm font-medium text-gray-900">{resultItem.trip.coordinatorContact.name}</p>
                                                    <p className="text-xs text-gray-600">{resultItem.trip.coordinatorContact.phone}</p>
                                                </div>
                                            </div>
                                        ) : resultItem.trip.driverName && (
                                            <div className="flex items-start gap-3 pt-2 border-t border-gray-200/50">
                                                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold">Motorista</p>
                                                    <p className="text-sm font-medium text-gray-900">{resultItem.trip.driverName}</p>
                                                    {resultItem.trip.driverPhone && (
                                                        <p className="text-xs text-gray-600">{resultItem.trip.driverPhone}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {resultItem.trip.qrCodeUrl && (
                                        <div className="text-center pt-4">
                                            <p className="text-xs text-gray-500 mb-2">Apresente este código para embarcar</p>
                                            <img src={resultItem.trip.qrCodeUrl} alt="QR Code" className="w-32 h-32 mx-auto border p-1 rounded-lg" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}