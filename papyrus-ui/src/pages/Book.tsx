import React, { useState, useEffect, use } from 'react';
import Button from '../components/common/Button';
import ZoomModal from '../components/zoom/ZoomModal';
import {pagesApi, type FetchPagesRequest, type PageResponse} from '../services/PagesApi';
import { useParams } from 'react-router-dom';
import { type PageModel } from '../services/models/Page';


interface ReaderState {
  totalPages: number | null;
  leftPageNumber: number;
  rightPageNumber: number;
  leftPageContent: string;
  rightPageContent: string;
  leftPageImageUrl: string | null;
  rightPageImageUrl: string | null;
  leftPageHasImage: boolean;
  rightPageHasImage: boolean;
  documentName: string;
  author?: string;
  isLoading: boolean;
  error: string | null;
  fontSize: number;
  zoomedImage: string | null; // For fullscreen zoom
}



const BookReader: React.FC = () => {
  const { documentGroupId } = useParams<{documentGroupId: string}>();
  const [pageZoomNumber, setPageToZoom] = useState<number>(0);

  const [readerState, setReaderState] = useState<ReaderState>({
    leftPageNumber: 0,
    rightPageNumber: 0,
    totalPages: null,
    leftPageContent: '',
    rightPageContent: '',
    leftPageImageUrl: null,
    rightPageImageUrl: null,
    leftPageHasImage: false,
    rightPageHasImage: false,
    documentName: 'Loading...',
    author: '',
    isLoading: true,
    error: null,
    fontSize: 14,
    zoomedImage: null,
  });

  const fetchPages = async (pageNumbers: number[], documentGroupId: string): Promise<PageResponse> => {
    try{
      const request: FetchPagesRequest = {
        documentGroupId: documentGroupId,
        pages: pageNumbers
      };

      const response = await pagesApi.getPages(request);
      
      return response;
    }catch(error){
      throw new Error("failed to get pages");
       //TODO add an error screen and some retry logic
    }
  };

 
  const loadPages = async (pageNumbers: number[], documentGroupId?: string) => {
    if(documentGroupId === undefined || documentGroupId === null)
    {
      console.error("group id is null");
    }

    setReaderState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      
      const pageResponse = await fetchPages(pageNumbers, documentGroupId!);
      if(pageResponse.pages.length > 2){
        console.error("error more than 2 pages were returned");
        //TODO add error page 
      } 
      const sortedPages = pageResponse.pages.sort((a, b) => a.pageNumber - b.pageNumber)
      
    if(pageResponse.pages.length == 1){
        const placeHolderPage: PageModel = {
          documentGroupId: documentGroupId!,
          documentName: "",
          author: "",
          content: "",
          pageNumber: sortedPages[0].pageNumber + 1,
          documentType: "",
          imageCount: 0
        }

        pageResponse.pages.push(placeHolderPage);
      }

      setReaderState(prev => ({
        ...prev,
        leftPageNumber: sortedPages[0].pageNumber,
        rightPageNumber: sortedPages[1].pageNumber,
        leftPageContent: sortedPages[0].content || '',
        rightPageContent: sortedPages[1]?.content || '',
        leftPageImageUrl: sortedPages[0].imageUrl || null,
        rightPageImageUrl: sortedPages[1]?.imageUrl || null,
        leftPageHasImage: sortedPages[0]?.imageUrl == null ? false : true,
        rightPageHasImage:  sortedPages[1]?.imageUrl == null ? false : true,
        documentName: sortedPages[0].documentName,
        author:  sortedPages[1].author,
        isLoading: false,
        totalPages: pageResponse.totalPages
      }));
    } catch (error) {
      setReaderState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load pages',
      }));
    }
  };

  const goToNextSpread = () => {
    const nextPage = readerState.leftPageNumber + 2;
    if (readerState.totalPages && nextPage <= readerState.totalPages) {
      loadPages([readerState.leftPageNumber + 2, readerState.rightPageNumber + 2], documentGroupId);
    }
  };

  const goToPreviousSpread = () => {
    const prevPage = readerState.leftPageNumber - 2;
    if (prevPage >= 1) {
      loadPages([readerState.leftPageNumber - 2, readerState.rightPageNumber - 2], documentGroupId);
    }
  };

  const goToPage = (pageNumber: number) => {
    const leftPageNumber = pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
    if (readerState.totalPages && leftPageNumber >= 1 && leftPageNumber <= readerState.totalPages) {
      //loadPages(leftPageNumber);
    }
  };

  const increaseFontSize = () => {
    setReaderState(prev => ({ 
      ...prev, 
      fontSize: Math.min(prev.fontSize + 2, 24) 
    }));
  };

  const decreaseFontSize = () => {
    setReaderState(prev => ({ 
      ...prev, 
      fontSize: Math.max(prev.fontSize - 2, 12) 
    }));
  };

  const openImageZoom = (imageUrl: string, pageNumber: number) => {
    setPageToZoom(pageNumber)
    setReaderState(prev => ({ ...prev, zoomedImage: imageUrl }));
  };

  const closeImageZoom = () => {
    setReaderState(prev => ({ ...prev, zoomedImage: null }));
  };

  useEffect(() => {
    const initializeReader = async () => {
      try {
     
        await loadPages([1, 2], documentGroupId);
      } catch (error) {
        setReaderState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize reader',
        }));
      }
    };

    initializeReader();
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Close zoom if open
      if (readerState.zoomedImage && event.key === 'Escape') {
        closeImageZoom();
        return;
      }

      // Don't navigate if zoom is open
      if (readerState.zoomedImage) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousSpread();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextSpread();
          break;
        case 'Escape':
          // Navigate back to library - implement based on your routing
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [readerState.leftPageNumber, readerState.totalPages, readerState.zoomedImage]);

  const rightPageNumber = readerState.leftPageNumber + 1;
  const hasRightPage = readerState.totalPages && rightPageNumber <= readerState.totalPages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-300/30 rounded-full blur-3xl"></div>
      </div>

      <header className="relative bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" to="/library">
                ← Library
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-amber-900 truncate max-w-md">
                  {readerState.documentName}
                </h1>
                {readerState.author && (
                  <p className="text-sm text-amber-700/80">by {readerState.author}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Font Size Controls */}
              {(!readerState.leftPageHasImage || !readerState.rightPageHasImage) && (
                <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                  <button
                    onClick={decreaseFontSize}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-amber-900 transition-all duration-200"
                    title="Decrease Font Size"
                  >
                    A-
                  </button>
                  <span className="text-sm text-amber-800 px-2 font-medium">
                    {readerState.fontSize}px
                  </span>
                  <button
                    onClick={increaseFontSize}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-amber-900 transition-all duration-200"
                    title="Increase Font Size"
                  >
                    A+
                  </button>
                </div>
              )}

              {readerState.totalPages && (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
                  <span className="text-sm text-amber-800 font-medium">
                    Pages {readerState.leftPageNumber}
                    {hasRightPage && `-${rightPageNumber}`} of {readerState.totalPages}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Reader */}
      <main className="relative flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {readerState.error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-semibold text-red-800 mb-2">Failed to Load Pages</h2>
              <p className="text-red-600 mb-6">{readerState.error}</p>
              <Button variant="primary" to="/library">Back to Library</Button>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {readerState.isLoading ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 animate-bounce">📖</div>
                  <h2 className="text-2xl font-semibold text-amber-900 mb-4">Loading Pages...</h2>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Two-Page Layout with Floating Pages */}
                  <div className="flex min-h-[700px] p-8 gap-6">
                    {/* Left Floating Page */}
                    <div className="flex-1">
                      <div className="bg-white/80 backdrop-blur-lg border border-white/30 rounded-2xl shadow-xl p-8 h-full hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                        <div className="h-full flex flex-col">
                          <div className="text-center mb-4 text-amber-700 text-sm font-medium tracking-wide">
                            Page {readerState.leftPageNumber}
                          </div>
                          
                          {readerState.leftPageHasImage ? (
                            // Show image for this page
                            <div className="flex-1 flex items-center justify-center p-2">
                              <div className="relative group cursor-pointer transform transition-transform duration-300 hover:scale-105">
                                <img 
                                  src={readerState.leftPageImageUrl || ''} 
                                  alt={`Page ${readerState.leftPageNumber}`}
                                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/20"
                                  onClick={() => openImageZoom(readerState.leftPageImageUrl || '', readerState.leftPageNumber)}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = `
                                      <div class="text-center text-amber-600 p-8 bg-white/10 rounded-lg border border-white/20">
                                        <div class="text-4xl mb-2">🖼️</div>
                                        <p class="font-medium">Image not available</p>
                                        <p class="text-sm">Page ${readerState.leftPageNumber}</p>
                                      </div>
                                    `;
                                  }}
                                />
                                <div 
                                  className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
                                  style={{ pointerEvents: 'none' }}
                                >
                                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-amber-900 font-medium">
                                    🔍 Click to zoom
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Show text content
                            <div 
                              className="flex-1 leading-relaxed text-amber-900"
                              style={{ fontSize: `${readerState.fontSize}px` }}
                            >
                              {readerState.leftPageContent.split('\n').map((paragraph, index) => (
                                <p key={index} className="mb-4 text-justify">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Floating Page */}
                    <div className="flex-1">
                      {hasRightPage ? (
                        <div className="bg-white/80 backdrop-blur-lg border border-white/30 rounded-2xl shadow-xl p-8 h-full hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                          <div className="h-full flex flex-col">
                            <div className="text-center mb-4 text-amber-700 text-sm font-medium tracking-wide">
                              Page {rightPageNumber}
                            </div>
                            
                            {readerState.rightPageHasImage ? (
                              // Show image for this page
                              <div className="flex-1 flex items-center justify-center p-2">
                                <div className="relative group cursor-pointer transform transition-transform duration-300 hover:scale-105">
                                  <img 
                                    src={readerState.rightPageImageUrl || ''} 
                                    alt={`Page ${rightPageNumber}`}
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/20"
                                    onClick={() => openImageZoom(readerState.rightPageImageUrl || '', rightPageNumber)}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement!.innerHTML = `
                                        <div class="text-center text-amber-600 p-8 bg-white/10 rounded-lg border border-white/20">
                                          <div class="text-4xl mb-2">🖼️</div>
                                          <p class="font-medium">Image not available</p>
                                          <p class="text-sm">Page ${rightPageNumber}</p>
                                        </div>
                                      `;
                                    }}
                                  />
                                  <div 
                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
                                    style={{ pointerEvents: 'none' }}
                                  >
                                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-amber-900 font-medium">
                                      🔍 Click to zoom
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Show text content
                              <div 
                                className="flex-1 leading-relaxed text-amber-900"
                                style={{ fontSize: `${readerState.fontSize}px` }}
                              >
                                {readerState.rightPageContent.split('\n').map((paragraph, index) => (
                                  <p key={index} className="mb-4 text-justify">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl p-8 h-full flex items-center justify-center">
                          <div className="text-center text-amber-500">
                            <div className="text-4xl mb-2">📖</div>
                            <p>End of book</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Navigation Controls */}
                  <div className="bg-white/10 backdrop-blur-lg px-8 py-6 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={goToPreviousSpread}
                        disabled={readerState.leftPageNumber <= 1}
                        className={`${readerState.leftPageNumber <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'} bg-white/10 backdrop-blur-sm border-white/30 transition-all duration-200`}
                      >
                        ← Previous
                      </Button>

                      {/* Enhanced Dropdown Navigation */}
                      <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-lg px-6 py-3 rounded-2xl border border-white/30 shadow-lg">
                        <span className="text-amber-800 font-medium">Go to page:</span>
                        <div className="relative">
                          <select
                            value={readerState.leftPageNumber}
                            onChange={(e) => goToPage(parseInt(e.target.value))}
                            className="appearance-none bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-2 pr-10 text-amber-900 font-medium focus:ring-2 focus:ring-amber-400/50 focus:border-white/60 transition-all cursor-pointer hover:bg-white/40"
                          >
                            {Array.from({ length: readerState.totalPages || 0 }, (_, i) => i + 1).map(page => (
                              <option key={page} value={page} className="bg-amber-50 text-amber-900">
                                Page {page}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <span className="text-amber-700 font-medium">of {readerState.totalPages}</span>
                      </div>

                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={goToNextSpread}
                        disabled={!readerState.totalPages || readerState.leftPageNumber + 1 >= readerState.totalPages}
                        className={`${!readerState.totalPages || readerState.leftPageNumber + 1 >= readerState.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'} bg-white/10 backdrop-blur-sm border-white/30 transition-all duration-200`}
                      >
                        Next →
                      </Button>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-sm text-amber-700 font-medium bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl inline-block border border-white/30">
                        💡 Use arrow keys to navigate • Click images to zoom • Hover for preview
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Fullscreen Image Zoom Modal */}
      {readerState.zoomedImage && pageZoomNumber > 0 && (
        <ZoomModal imageUrl={readerState.zoomedImage}
         onClose={closeImageZoom}
         pageNumber={pageZoomNumber}/>
      )}
    </div>
  );
};

export default BookReader;