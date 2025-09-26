import React from "react";
import type { Paginiation } from "../../services/models/Pagination";

const Pagination: React.FC<{
  pagination: Paginiation;
  onPageChange: (page: number) => void;
  loading?: boolean;
}> = ({ pagination, onPageChange, loading = false }) => {
  const { page: currentPage, size: pageSize, total: total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage || loading}
        className="px-3 py-2 text-amber-700 hover:bg-amber-100 disabled:text-amber-400 disabled:hover:bg-transparent rounded-lg transition-colors"
      >
        ← Previous
      </button>
      
      {getPageNumbers().map((pageNum, index) => (
        <React.Fragment key={index}>
          {pageNum === "..." ? (
            <span className="px-3 py-2 text-amber-600">...</span>
          ) : (
            <button
              onClick={() => onPageChange(pageNum as number)}
              disabled={loading}
              className={`px-3 py-2 rounded-lg transition-colors ${
                currentPage === pageNum
                  ? "bg-amber-500 text-white"
                  : "text-amber-700 hover:bg-amber-100 disabled:text-amber-400"
              }`}
            >
              {pageNum}
            </button>
          )}
        </React.Fragment>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage || loading}
        className="px-3 py-2 text-amber-700 hover:bg-amber-100 disabled:text-amber-400 disabled:hover:bg-transparent rounded-lg transition-colors"
      >
        Next →
      </button>
    </div>
  );
};


export default Pagination;