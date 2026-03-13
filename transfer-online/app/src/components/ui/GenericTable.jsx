import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export default function GenericTable({
  columns = [],
  data = [],
  onRowClick,
  keyField = 'id',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'Nenhum registro encontrado',
  className = ''
}) {
  return (
    <div className={`rounded-lg border bg-white overflow-hidden ${className}`}>
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {columns.map((col, index) => (
              <TableHead 
                key={index} 
                className={`font-semibold ${col.className || ''}`}
                style={col.style}
              >
                {col.sortable && onSort ? (
                  <button
                    onClick={() => onSort(col.accessor)}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                  >
                    {col.header}
                    {sortColumn === col.accessor ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow 
                key={row[keyField] || rowIndex} 
                className={onRowClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : "hover:bg-gray-50"}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col, colIndex) => (
                  <TableCell key={colIndex} className={col.className || ''}>
                    {col.render ? col.render(row) : (row[col.accessor] || '-')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-end space-x-2 py-4 px-4 border-t">
          <div className="text-sm text-muted-foreground mr-4">
            Página {currentPage} de {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}