/**
 * Função utilitária para obter a data/hora atual no fuso horário de Brasília (GMT-3)
 * Retorna um objeto Date já ajustado para America/Sao_Paulo
 */
export function getBrasiliaTime() {
  const now = new Date();
  const brasiliaTimeString = now.toLocaleString('en-US', { 
    timeZone: 'America/Sao_Paulo' 
  });
  return new Date(brasiliaTimeString);
}

/**
 * Adiciona minutos a uma data no fuso de Brasília
 */
export function addMinutesToBrasiliaTime(minutes) {
  const brasiliaTime = getBrasiliaTime();
  brasiliaTime.setMinutes(brasiliaTime.getMinutes() + minutes);
  return brasiliaTime;
}

/**
 * Formata uma data para ISO string mantendo o contexto de Brasília
 */
export function toBrasiliaISO(date) {
  return date.toISOString();
}

// Endpoint de teste (opcional)
Deno.serve((req) => {
  try {
    const brasiliaTime = getBrasiliaTime();
    
    return Response.json({
      success: true,
      current_brasilia_time: brasiliaTime.toISOString(),
      formatted: brasiliaTime.toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'full',
        timeStyle: 'long'
      }),
      timezone_info: {
        name: 'America/Sao_Paulo',
        offset: 'GMT-3'
      }
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});