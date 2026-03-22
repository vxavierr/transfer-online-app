import React from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookOpen, Building2, FileText, Layers3, Users } from 'lucide-react';
import ManualPdfButton from '@/components/manual/ManualPdfButton';
import UserManualRoleView from '@/components/manual/UserManualRoleView';
import { executiveManualByLanguage } from '@/components/manual/manualData';
import { roleManualOrder, roleManuals } from '@/components/manual/userManualData';

const roleLabels = {
  admin: 'Administrador',
  corporate: 'Cliente Corporativo',
  supplier: 'Fornecedor',
  driver: 'Motorista'
};

export default function ManualArquitetonico() {
  const location = useLocation();
  const requestedRole = new URLSearchParams(location.search).get('role');
  const [userRole, setUserRole] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me()
      .then((user) => {
        if (user?.role === 'admin') {
          setUserRole('admin');
          return;
        }

        if (user?.driver_id) {
          setUserRole('driver');
          return;
        }

        if (user?.supplier_id) {
          setUserRole('supplier');
          return;
        }

        setUserRole('corporate');
      })
      .catch(() => {
        setUserRole(null);
      });
  }, []);

  const availableRoles = userRole === 'admin'
    ? roleManualOrder
    : roleManualOrder.filter((role) => role === (userRole || requestedRole));

  const initialRole = userRole === 'admin'
    ? (roleManualOrder.includes(requestedRole) ? requestedRole : 'admin')
    : (availableRoles[0] || 'corporate');

  const [selectedRole, setSelectedRole] = React.useState(initialRole);

  React.useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);

  const isAdminView = userRole === 'admin' || selectedRole === 'admin';
  const [manualLanguage, setManualLanguage] = React.useState('pt');
  const executiveManual = executiveManualByLanguage[manualLanguage] || executiveManualByLanguage.pt;

  const handleRoleChange = (role) => {
    if (!availableRoles.includes(role)) return;
    setSelectedRole(role);
    const url = new URL(window.location.href);
    url.searchParams.set('role', role);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden border-0 shadow-xl">
          <CardContent className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 p-8 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Central de Ajuda e Manual do Usuário</h1>
                    <p className="mt-1 text-sm text-blue-100">
                      Conteúdo organizado por perfil para explicar os menus e as funções principais da plataforma.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableRoles.map((role) => (
                    <Badge key={role} className="bg-white/15 text-white hover:bg-white/15">{roleLabels[role]}</Badge>
                  ))}
                </div>

                <p className="max-w-3xl text-sm leading-6 text-blue-100">
                  {isAdminView
                    ? 'Use as abas abaixo para abrir o manual do perfil desejado. Os links de ajuda dos menus agora apontam para esta central com o conteúdo correspondente.'
                    : 'Este manual foi filtrado para exibir apenas as orientações do seu perfil de acesso.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdminView && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase text-gray-500">Perfis atendidos</p><p className="mt-2 font-semibold text-gray-900">4 frentes</p></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase text-gray-500">Menus documentados</p><p className="mt-2 font-semibold text-gray-900">{Object.values(roleManuals).reduce((acc, role) => acc + role.menus.length, 0)} blocos</p></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase text-gray-500">Versão executiva</p><p className="mt-2 font-semibold text-gray-900">{executiveManual.manualMeta.version}</p></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-5"><p className="text-xs uppercase text-gray-500">Atualização</p><p className="mt-2 font-semibold text-gray-900">{executiveManual.manualMeta.updateDateLabel}</p></CardContent></Card>
          </div>
        )}

        <Tabs value={selectedRole} onValueChange={handleRoleChange} className="space-y-6">
          {availableRoles.length > 1 && (
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-4">
              {availableRoles.map((role) => (
                <TabsTrigger
                  key={role}
                  value={role}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  {roleLabels[role]}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {availableRoles.map((role) => (
            <TabsContent key={role} value={role} className="mt-0">
              <UserManualRoleView manual={roleManuals[role]} />
            </TabsContent>
          ))}
        </Tabs>

        {isAdminView && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl text-gray-900">{manualLanguage === 'en' ? 'Platform executive overview' : 'Visão executiva da plataforma'}</CardTitle>
                  <p className="mt-2 text-sm text-gray-500">
                    {manualLanguage === 'en'
                      ? 'High-level summary for management, architecture, and institutional onboarding.'
                      : 'Resumo macro para gestão, arquitetura e onboarding institucional.'}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
                    <Button type="button" variant={manualLanguage === 'pt' ? 'default' : 'ghost'} size="sm" onClick={() => setManualLanguage('pt')} className="h-8 px-3">
                      PT
                    </Button>
                    <Button type="button" variant={manualLanguage === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => setManualLanguage('en')} className="h-8 px-3">
                      EN
                    </Button>
                  </div>
                  <ManualPdfButton language={manualLanguage} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700"><Layers3 className="h-4 w-4 text-blue-600" /> {manualLanguage === 'en' ? 'Layers' : 'Camadas'}</div>
                  <p className="text-3xl font-bold text-gray-900">{executiveManual.architectureLayers.length}</p>
                  <p className="mt-2 text-sm text-gray-500">{manualLanguage === 'en' ? 'Main structural blocks.' : 'Blocos estruturais principais.'}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700"><Building2 className="h-4 w-4 text-green-600" /> {manualLanguage === 'en' ? 'Modules' : 'Módulos'}</div>
                  <p className="text-3xl font-bold text-gray-900">{executiveManual.businessModules.length}</p>
                  <p className="mt-2 text-sm text-gray-500">{manualLanguage === 'en' ? 'Operational and business fronts.' : 'Frentes operacionais e de negócio.'}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700"><Users className="h-4 w-4 text-purple-600" /> {manualLanguage === 'en' ? 'Key entities' : 'Entidades-chave'}</div>
                  <p className="text-3xl font-bold text-gray-900">{executiveManual.keyEntities.length}</p>
                  <p className="mt-2 text-sm text-gray-500">{manualLanguage === 'en' ? 'Critical data references.' : 'Referências críticas de dados.'}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {executiveManual.architectureLayers.map((layer) => (
                  <div key={layer.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <h3 className="font-semibold text-gray-900">{layer.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{layer.description}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <div className="grid grid-cols-1 bg-gray-50 md:grid-cols-[240px_1fr]">
                  <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 md:border-b-0 md:border-r">{manualLanguage === 'en' ? 'Module' : 'Módulo'}</div>
                  <div className="px-4 py-3 text-sm font-semibold text-gray-700">{manualLanguage === 'en' ? 'Function' : 'Função'}</div>
                </div>
                {executiveManual.businessModules.map(([title, description]) => (
                  <div key={title} className="grid grid-cols-1 border-t border-gray-200 bg-white md:grid-cols-[240px_1fr]">
                    <div className="px-4 py-3 text-sm font-semibold text-gray-900 md:border-r border-gray-200">{title}</div>
                    <div className="px-4 py-3 text-sm text-gray-700">{description}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  {manualLanguage === 'en' ? 'Institutional reference' : 'Referência institucional'}
                </div>
                {executiveManual.manualMeta.purpose}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}