import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, Mail, MessageSquare, Phone, CheckCircle, XCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = {
  email: "#3b82f6",
  whatsapp: "#10b981",
  sms: "#8b5cf6"
};

export default function AnalyticsDashboard() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["communicationLogs"],
    queryFn: () => base44.entities.CommunicationLog.list("-sent_at", 500),
  });

  const { data: smsLogs = [] } = useQuery({
    queryKey: ["smsLogs"],
    queryFn: () => base44.entities.SmsLog.list("-created_date", 200),
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const allLogs = [
    ...logs,
    ...smsLogs.map(sms => ({
      channel: "sms",
      sent_at: sms.created_date,
      delivery_status: sms.status === "sent" ? "delivered" : sms.status === "failed" ? "failed" : "sent",
      event_type: sms.event_type || "sms_notification"
    }))
  ];

  const todayLogs = allLogs.filter(l => new Date(l.sent_at) >= today);
  const weekLogs = allLogs.filter(l => new Date(l.sent_at) >= thisWeekStart);
  const monthLogs = allLogs.filter(l => new Date(l.sent_at) >= thisMonthStart);

  const calculateSuccessRate = (logsList) => {
    if (logsList.length === 0) return 0;
    const success = logsList.filter(l => l.delivery_status !== "failed").length;
    return Math.round((success / logsList.length) * 100);
  };

  const channelData = [
    { name: "Email", value: allLogs.filter(l => l.channel === "email").length, color: COLORS.email },
    { name: "WhatsApp", value: allLogs.filter(l => l.channel === "whatsapp").length, color: COLORS.whatsapp },
    { name: "SMS", value: allLogs.filter(l => l.channel === "sms").length, color: COLORS.sms }
  ].filter(d => d.value > 0);

  const eventCounts = allLogs.reduce((acc, log) => {
    const evt = log.event_type || "outros";
    acc[evt] = (acc[evt] || 0) + 1;
    return acc;
  }, {});

  const topEvents = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([event, count]) => ({ event, count }));

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
          <p className="text-xs text-blue-700 font-semibold mb-1">HOJE</p>
          <p className="text-3xl font-bold text-blue-900">{todayLogs.length}</p>
          <p className="text-xs text-blue-600 mt-1">
            {calculateSuccessRate(todayLogs)}% taxa de entrega
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-700 font-semibold mb-1">ESTA SEMANA</p>
          <p className="text-3xl font-bold text-green-900">{weekLogs.length}</p>
          <p className="text-xs text-green-600 mt-1">
            {calculateSuccessRate(weekLogs)}% taxa de entrega
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4">
          <p className="text-xs text-purple-700 font-semibold mb-1">ESTE MÊS</p>
          <p className="text-3xl font-bold text-purple-900">{monthLogs.length}</p>
          <p className="text-xs text-purple-600 mt-1">
            {calculateSuccessRate(monthLogs)}% taxa de entrega
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribuição por Canal */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Distribuição por Canal</h3>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-12">Sem dados</p>
          )}
        </div>

        {/* Top Eventos */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Eventos Mais Ativos</h3>
          <div className="space-y-2">
            {topEvents.length > 0 ? (
              topEvents.map((item, idx) => (
                <div key={item.event} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-700">{item.event}</span>
                  </div>
                  <span className="font-bold text-gray-900">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-8">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Status de Entrega */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Status de Entrega (Últimos 30 dias)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Entregues</p>
              <p className="font-bold text-gray-900">{allLogs.filter(l => l.delivery_status === "delivered").length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Enviados</p>
              <p className="font-bold text-gray-900">{allLogs.filter(l => l.delivery_status === "sent").length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-xs text-gray-500">Falharam</p>
              <p className="font-bold text-gray-900">{allLogs.filter(l => l.delivery_status === "failed").length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Abertos</p>
              <p className="font-bold text-gray-900">{allLogs.filter(l => l.delivery_status === "opened").length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xs text-gray-500">Clicados</p>
              <p className="font-bold text-gray-900">{allLogs.filter(l => l.delivery_status === "clicked").length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}