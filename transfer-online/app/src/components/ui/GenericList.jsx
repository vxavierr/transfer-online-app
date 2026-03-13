import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Loader2 } from 'lucide-react';
import GenericTable from '@/components/ui/GenericTable';
import { Pagination } from '@/components/ui/Pagination';

export default function GenericList({
  title,
  subtitle,
  data = [],
  columns = [],
  isLoading = false,
  onAdd,
  onEdit,
  onDelete,
  onSearch,
  searchTerm,
  setSearchTerm,
  itemsPerPage = 10,
  addButtonLabel = "Adicionar"
}) {
  const [currentPage, setCurrentPage] = useState(1);

  // Client-side filtering if onSearch is not provided
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    if (onSearch) return true; // Server-side filtering handled by parent
    
    // Simple deep search
    const searchLower = searchTerm.toLowerCase();
    return Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
          {onAdd && (
            <Button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {addButtonLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                if (onSearch) onSearch(e.target.value);
              }}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <GenericTable
              columns={[
                ...columns,
                (onEdit || onDelete) && {
                  header: 'Ações',
                  align: 'right',
                  render: (item) => (
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                          Editar
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="ghost" size="sm" onClick={() => onDelete(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          Excluir
                        </Button>
                      )}
                    </div>
                  )
                }
              ].filter(Boolean)}
              data={paginatedData}
              emptyMessage="Nenhum registro encontrado."
            />
            
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}