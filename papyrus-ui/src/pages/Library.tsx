import React, { useState, useEffect } from "react";
import Button from "../components/common/Button";
import Navbar from "../components/common/Navigation";
import type { BookDocument } from "../services/models/BookDocument";
import type { PagedResponse } from "../services/models/PagedResponse";
import { documentApi } from "../services/DocumentRetrievalService";
import Pagination from "../components/common/Pagination";
import { useLocation, useNavigate } from "react-router-dom";

const Library: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [booksData, setBooksData] = useState<PagedResponse<BookDocument>>({
    items: [],
    pagination: {
      page: 1,
      size: 12,
      total: 0,
    },
  });

  const location = useLocation();
  const userId = location.state?.userId;

  const fetchBooks = async (userId: string) => {
    setLoading(true);
    console.log(userId);
    try {
      const data = await documentApi.getBooks(userId,currentPage, pageSize);
      setBooksData(data);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };
  const fetchFilteredBooks = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);

    if (newSearchTerm.length > 3 || newSearchTerm.length === 0) {
      try {
        setLoading(true);
        const data = await documentApi.getBooks(
          userId,
          currentPage,
          pageSize,
          newSearchTerm
        );
        setBooksData(data);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if(userId === undefined || userId === null){
      navigate("/login");
    }
    fetchBooks(userId);
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, sortBy]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const BookCard = ({ book }: { book: BookDocument }) => (
    <div className="group relative bg-white/60 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-4 hover:shadow-xl hover:shadow-amber-200/20 transition-all duration-300 hover:-translate-y-1">
      {/* Book Cover */}
      <div className="relative mb-4 overflow-hidden rounded-xl">
        {book.frontCoverImageUrl ? (
          <img
            src={book.frontCoverImageUrl}
            alt={book.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <div className="text-4xl mb-2">📄</div>
              <div className="text-amber-800 text-sm font-medium">No Cover</div>
            </div>
          </div>
        )}

        {/* New badge for recently added books */}
        {(() => {
          const daysAgo = Math.floor(
            (new Date().getTime() - new Date(book.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return (
            daysAgo <= 3 && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                New
              </div>
            )
          );
        })()}
      </div>

      {/* Book Info */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-amber-900 line-clamp-2 leading-tight mb-1">
            {book.name}
          </h3>
          {book.author ? (
            <p className="text-amber-700/80 text-sm">by {book.author}</p>
          ) : (
            <p className="text-amber-600/60 text-sm italic">
              No author specified
            </p>
          )}
        </div>

        {/* Book Stats */}
        <div className="flex items-center justify-between text-xs text-amber-700">
          <span className="bg-amber-100 px-2 py-1 rounded-full">
            {book.totalPages} pages
          </span>
          <span>Added {getTimeAgo(book.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            to="/reader"
            params={{ id: book.documentGroupId }}
            state={{ name: book.name, author: book.author, userId: userId }}
          >
            Read
          </Button>
          <button className="px-3 py-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors">
            ⋮
          </button>
        </div>
      </div>
    </div>
  );

  const BookListItem = ({ book }: { book: BookDocument }) => (
    <div className="bg-white/60 backdrop-blur-sm border border-amber-200/50 rounded-xl p-4 flex items-center gap-4 hover:shadow-lg hover:shadow-amber-200/20 transition-all duration-300 h-24">
      {/* Cover Thumbnail */}
      {book.frontCoverImageUrl ? (
        <img
          src={book.frontCoverImageUrl}
          alt={book.name}
          className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-20 bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center rounded-lg flex-shrink-0">
          <div className="text-xl">📄</div>
        </div>
      )}

      {/* Book Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-amber-900 truncate">{book.name}</h3>
        {book.author ? (
          <p className="text-amber-700/80 text-sm truncate">by {book.author}</p>
        ) : (
          <p className="text-amber-600/60 text-sm italic">
            No author specified
          </p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
            {book.totalPages} pages
          </span>
          <span className="text-xs text-amber-600 truncate">
            Added {formatDate(book.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="primary" size="sm">
          Read
        </Button>
        <button className="px-3 py-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors">
          ⋮
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Navigation */}
      <Navbar
        rightContent={
          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" to="/"
            state={{userId: userId}}
            >
              Home
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-amber-950">My Library</h1>
            <Button variant="primary" to="/upload" state={{userId: userId}}>
              + Add New Book
            </Button>
          </div>
          <p className="text-amber-800/80">
            Manage your personal collection of documents and books
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/40 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search books or authors..."
                className="w-full pl-10 pr-4 py-3 bg-white/60 border border-amber-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-amber-900 placeholder-amber-600"
                value={searchTerm}
                onChange={(e) => fetchFilteredBooks(e)}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600">
                🔍
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Page Size */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                disabled={loading}
                className="px-4 py-3 bg-white/60 border border-amber-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-amber-900"
              >
                <option value={12}>12 per page</option>
                <option value={24}>24 per page</option>
                <option value={48}>48 per page</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                disabled={loading}
                className="px-4 py-3 bg-white/60 border border-amber-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-amber-900"
              >
                <option value="recent">Recently Added</option>
                <option value="title">Title A-Z</option>
                <option value="pages">Page Count</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex bg-white/60 border border-amber-200/50 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  disabled={loading}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-amber-500 text-white"
                      : "text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  ⊞
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  disabled={loading}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-amber-500 text-white"
                      : "text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  ☰
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Books Grid/List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-amber-900">
              {loading ? (
                "Loading..."
              ) : (
                <>Books ({booksData.pagination.total.toLocaleString()} total)</>
              )}
            </h2>

            {!loading && booksData.pagination.total > 0 && (
              <div className="text-sm text-amber-700">
                Showing{" "}
                {(booksData.pagination.page - 1) * booksData.pagination.size +
                  1}{" "}
                -{" "}
                {Math.min(
                  booksData.pagination.page * booksData.pagination.size,
                  booksData.pagination.total
                )}{" "}
                of {booksData.pagination.total.toLocaleString()}
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-amber-700">Loading your books...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && booksData.items.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-amber-900 mb-2">
                No books found
              </h3>
              <p className="text-amber-700/80 mb-6">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Start building your library by uploading your first book"}
              </p>
              {!searchTerm && (
                <Button variant="primary" to="/upload">
                  Upload Your First Book
                </Button>
              )}
            </div>
          )}

          {/* Books Display */}
          {!loading && booksData.items.length > 0 && (
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-4"
                }
              >
                {booksData.items.map((book) =>
                  viewMode === "grid" ? (
                    <BookCard key={book.documentGroupId} book={book} />
                  ) : (
                    <BookListItem key={book.documentGroupId} book={book} />
                  )
                )}
              </div>

              {/* Pagination */}
              <Pagination
                pagination={booksData.pagination}
                onPageChange={setCurrentPage}
                loading={loading}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default Library;
