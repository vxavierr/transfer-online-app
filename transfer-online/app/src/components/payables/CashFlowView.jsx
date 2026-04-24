import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, ArrowDownCircle, ArrowUpCircle, Activity } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatPrice = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function CashFlowView({ payables, invoices }) {
  const [viewMode, setViewMode] = useState('monthly');

  const data = useMemo(() => {
    const now = new Date();
    let intervals = [];

    if (viewMode === 'daily') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      intervals = eachDayOfInterval({ start, end }).map(d => ({
        key: format(d, 'dd/MM'),
        date: d,
        label: format(d, 'dd/MM'),
      }));
    } else if (viewMode === 'weekly') {
      const start = addMonths(now, -2);
      const weeks = eachWeekOfInterval({ start, end: addMonths(now, 1) }, { weekStartsOn: 1 });
      intervals = weeks.map(w => ({
        key: format(w, 'dd/MM'),
        date: w,
        dateEnd: endOfWeek(w, { weekStartsOn: 1 }),
        label: `Sem ${format(w, 'dd/MM')}`,
      }));
    } else {
      // Monthly: last 3 months + next 3
      for (let i = -3; i <= 3; i++) {
        const m = addMonths(now, i);
        intervals.push({
          key: format(m, 'MMM/yy', { locale: ptBR }),
          date: startOfMonth(m),
          dateEnd: endOfMonth(m),
          label: format(m, 'MMM/yy', { locale: ptBR }),
        });
      }
    }

    return intervals.map(interval => {
      let aReceber = 0;
      let aPagar = 0;

      // A Receber (invoices)
      (invoices || []).forEach(inv => {
        if (!inv.due_date) return;
        const d = parseISO(inv.due_date);
        const match = viewMode === 'daily'
          ? isSameDay(d, interval.date)
          : viewMode === 'weekly'
            ? d >= interval.date && d <= interval.dateEnd
            : d >= interval.date && d <= interval.dateEnd;
        if (match) {
          const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
          if (remaining > 0) aReceber += remaining;
        }
      });

      // A Pagar (payables)
      (payables || []).forEach(p => {
        if (p.status === 'pago' || p.status === 'cancelado') return;
        if (!p.due_date) return;
        const d = parseISO(p.due_date);
        const match = viewMode === 'daily'
          ? isSameDay(d, interval.date)
          : viewMode === 'weekly'
            ? d >= interval.date && d <= interval.dateEnd
            : d >= interval.date && d <= interval.dateEnd;
        if (match) {
          const remaining = (p.amount || 0) - (p.paid_amount || 0);
          if (remaining > 0) aPagar += remaining;
        }
      });

      return {
        name: interval.label,
        aReceber,
        aPagar,
        saldo: aReceber - aPagar,
      };
    });
  }, [payables, invoices, viewMode]);

  const totals = useMemo(() => {
    return data.reduce((acc, d) => ({
      aReceber: acc.aReceber + d.aReceber,
      aPagar: acc.aPagar + d.aPagar,
      saldo: acc.saldo + d.saldo,
    }), { aReceber: 0, aPagar: 0, saldo: 0 });
  }, [data]);

  // Accumulated balance for the line chart
  const accumulatedData = useMemo(() => {
    let acc = 0;
    return data.map(d => {
      acc += d.saldo;
      return { ...d, saldoAcumulado: acc };
    });
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowUpCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-green-700 font-medium">Total a Receber</p>
              <p className="text-xl font-bold text-green-800">{formatPrice(totals.aReceber)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowDownCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-xs text-red-700 font-medium">Total a Pagar</p>
              <p className="text-xl font-bold text-red-800">{formatPrice(totals.aPagar)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`${totals.saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className={`w-8 h-8 ${totals.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            <div>
              <p className={`text-xs font-medium ${totals.saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo Projetado</p>
              <p className={`text-xl font-bold ${totals.saldo >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>{formatPrice(totals.saldo)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Fluxo de Caixa
            </CardTitle>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatPrice(v)} />
                <Legend />
                <Bar dataKey="aReceber" name="A Receber" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aPagar" name="A Pagar" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Accumulated Balance Line */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Saldo Acumulado Projetado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accumulatedData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatPrice(v)} />
                <Line type="monotone" dataKey="saldoAcumulado" name="Saldo Acumulado" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Crossover Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cruzamento Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2 font-semibold">Período</th>
                  <th className="text-right p-2 font-semibold text-green-700">A Receber</th>
                  <th className="text-right p-2 font-semibold text-red-700">A Pagar</th>
                  <th className="text-right p-2 font-semibold text-blue-700">Saldo</th>
                  <th className="text-right p-2 font-semibold">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {accumulatedData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{row.name}</td>
                    <td className="p-2 text-right text-green-700">{formatPrice(row.aReceber)}</td>
                    <td className="p-2 text-right text-red-700">{formatPrice(row.aPagar)}</td>
                    <td className={`p-2 text-right font-semibold ${row.saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      {formatPrice(row.saldo)}
                    </td>
                    <td className={`p-2 text-right font-bold ${row.saldoAcumulado >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                      {formatPrice(row.saldoAcumulado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}