import React, { useState, useEffect } from 'react';
import Button from '../components/common/Button';

interface PageData {
  documentGroupId: string;
  documentName: string;
  author: string;
  content: string;
  pageNumber: number;
  documentType: string;
  createdAt: string;
  updatedAt: string;
}

interface ReaderState {
  currentPage: number;
  totalPages: number | null;
  leftPageContent: string;
  rightPageContent: string;
  documentName: string;
  author: string;
  isLoading: boolean;
  error: string | null;
  fontSize: number;
}

const BookReader: React.FC = () => {
  const documentGroupId = "123e4567-e89b-12d3-a456-426614174000";
  
  const [readerState, setReaderState] = useState<ReaderState>({
    currentPage: 1,
    totalPages: null,
    leftPageContent: '',
    rightPageContent: '',
    documentName: 'Loading...',
    author: '',
    isLoading: true,
    error: null,
    fontSize: 16,
  });

  // English story content
  const getEnglishPageContent = (pageNumber: number): string => {
    const englishPages = [
      "Chapter One: The London Train\n\nThe morning fog lifted slowly from the Thames as Elizabeth hurried through the cobblestone streets of Victorian London. Her leather boots clicked against the wet stones, echoing off the narrow alleyways that led to Paddington Station.\n\nShe clutched the telegram tightly in her gloved hand - news from her sister Margaret in Yorkshire had arrived unexpectedly. Their grandmother's estate needed immediate attention, and Elizabeth was the only family member available to travel north.\n\nThe great steam engine whistled loudly as she approached Platform 9, sending clouds of white vapor into the crisp November air.",
      
      "Elizabeth found her compartment and settled by the window, watching London's sprawling cityscape gradually give way to rolling green countryside. The rhythmic clacking of the train wheels on the tracks was oddly comforting.\n\nA gentleman in a dark coat and top hat sat across from her, reading The Times newspaper. She noticed the headlines spoke of industrial progress and social reform - topics that had become increasingly important in Queen Victoria's England.\n\nAs the train pulled into a small station, Elizabeth thought about her childhood visits to Grandmother's house. The old manor held so many memories of summer afternoons and winter evenings.",
      
      "Chapter Two: Yorkshire Manor\n\nThe carriage ride from the station took Elizabeth through the Yorkshire Dales, where sheep grazed peacefully on the hillsides and dry stone walls divided the landscape into neat parcels. The driver, a friendly man named Thomas, pointed out landmarks along the way.\n\n'That's Thornfield Manor up ahead, miss,' he said, gesturing toward a grand stone building nestled among ancient oak trees. 'Your grandmother was well-loved in these parts. Always had a kind word and helping hand for anyone in need.'\n\nElizabeth felt a mixture of sadness and anticipation as they approached the impressive Georgian facade.",
      
      "Margaret was waiting at the front door, her face showing the strain of recent weeks. The sisters embraced warmly, sharing their grief and the overwhelming task that lay ahead.\n\n'I've been through most of Grandmother's papers,' Margaret explained as they walked through the grand entrance hall. 'There are so many documents to sort - deeds, letters, photographs dating back decades.'\n\nThe house felt different without their grandmother's presence. Dust motes danced in the afternoon sunlight streaming through the tall windows, and the familiar scent of lavender and old books filled the air.\n\n'We'll need to decide what to do with the estate,' Margaret continued.",
      
      "Chapter Three: Hidden Discoveries\n\nWhile sorting through their grandmother's belongings in the library, Elizabeth discovered a hidden compartment in the old writing desk. Inside was a collection of letters tied with a faded blue ribbon and a small leather journal.\n\nThe letters were addressed to their grandmother from someone named William, written in elegant script and dated from the 1840s. As Elizabeth read them by the flickering candlelight, she realized they were love letters from a man she had never heard mentioned in family conversations.\n\nThe journal contained her grandmother's own thoughts and reflections from her youth - dreams of travel and observations about Victorian society.",
      
      "Margaret joined her sister by the fireplace as Elizabeth shared her discoveries. Together, they read through the correspondence and journal entries, piecing together a story of their grandmother's secret romance with William, a young architect who had designed several buildings in the nearby village.\n\n'Look at this,' Margaret whispered, pointing to a passage in the journal. 'She writes about having to choose between following her heart and fulfilling family obligations. She chose duty over love.'\n\nElizabeth felt a deep connection to her grandmother's words. The struggles between personal desires and societal expectations seemed timeless, relevant even in their modern world."
    ];
    
    return englishPages[pageNumber - 1] || "The End\n\nThank you for reading this story of family, duty, and hidden histories. Elizabeth and Margaret learned that understanding the past can illuminate the path forward, and that every family has stories waiting to be discovered.";
  };

  // Mock API call
  const fetchPage = async (pageNumber: number): Promise<PageData> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      documentGroupId,
      documentName: "The Yorkshire Inheritance",
      author: "Catherine Elizabeth Thornton",
      content: getEnglishPageContent(pageNumber),
      pageNumber,
      documentType: "PDF",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const getTotalPages = async (): Promise<number> => {
    return 6;
  };

  const loadPages = async (leftPageNumber: number) => {
    setReaderState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const leftPagePromise = fetchPage(leftPageNumber);
      const rightPageNumber = leftPageNumber + 1;
      const rightPagePromise = rightPageNumber <= (readerState.totalPages || 0) 
        ? fetchPage(rightPageNumber) 
        : null;

      const [leftPageData, rightPageData] = await Promise.all([
        leftPagePromise,
        rightPagePromise
      ]);
      
      setReaderState(prev => ({
        ...prev,
        currentPage: leftPageNumber,
        leftPageContent: leftPageData.content,
        rightPageContent: rightPageData?.content || '',
        documentName: leftPageData.documentName,
        author: leftPageData.author,
        isLoading: false,
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
    const nextPage = readerState.currentPage + 2;
    if (readerState.totalPages && nextPage <= readerState.totalPages) {
      loadPages(nextPage);
    }
  };

  const goToPreviousSpread = () => {
    const prevPage = readerState.currentPage - 2;
    if (prevPage >= 1) {
      loadPages(prevPage);
    }
  };

  const goToPage = (pageNumber: number) => {
    const leftPageNumber = pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
    if (readerState.totalPages && leftPageNumber >= 1 && leftPageNumber <= readerState.totalPages) {
      loadPages(leftPageNumber);
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

  useEffect(() => {
    const initializeReader = async () => {
      try {
        const totalPages = await getTotalPages();
        setReaderState(prev => ({ ...prev, totalPages }));
        await loadPages(1);
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
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousSpread();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextSpread();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [readerState.currentPage, readerState.totalPages]);

  const rightPageNumber = readerState.currentPage + 1;
  const hasRightPage = readerState.totalPages && rightPageNumber <= readerState.totalPages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100">
      {/* Header */}
      <header className="bg-amber-900/20 backdrop-blur-sm border-b border-amber-300/50 sticky top-0 z-10">
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
                  <p className="text-sm text-amber-700">by {readerState.author}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={decreaseFontSize}
                className="p-2 rounded-lg bg-amber-200/50 hover:bg-amber-200/70 text-amber-900 transition-all"
                title="Decrease Font Size"
              >
                A-
              </button>
              <span className="text-sm text-amber-800 px-2">
                {readerState.fontSize}px
              </span>
              <button
                onClick={increaseFontSize}
                className="p-2 rounded-lg bg-amber-200/50 hover:bg-amber-200/70 text-amber-900 transition-all"
                title="Increase Font Size"
              >
                A+
              </button>

              {readerState.totalPages && (
                <div className="ml-4 text-sm text-amber-700">
                  Pages {readerState.currentPage}
                  {hasRightPage && `-${rightPageNumber}`} of {readerState.totalPages}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Reader */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {readerState.error ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-semibold text-red-800 mb-2">Failed to Load Pages</h2>
              <p className="text-red-600 mb-6">{readerState.error}</p>
              <Button variant="primary" to="/library">Back to Library</Button>
            </div>
          ) : (
            <div className="bg-amber-50/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-amber-300/50 overflow-hidden">
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
                  {/* Two-Page Layout */}
                  <div className="flex min-h-[700px]">
                    {/* Left Page */}
                    <div className="flex-1 bg-orange-50/90 p-8 border-r border-amber-200/50">
                      <div className="h-full flex flex-col">
                        <div className="text-center mb-4 text-amber-700 text-sm font-medium">
                          Page {readerState.currentPage}
                        </div>
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
                      </div>
                    </div>

                    {/* Right Page */}
                    <div className="flex-1 bg-orange-50/90 p-8">
                      <div className="h-full flex flex-col">
                        {hasRightPage ? (
                          <>
                            <div className="text-center mb-4 text-amber-700 text-sm font-medium">
                              Page {rightPageNumber}
                            </div>
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
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-amber-500">
                            <div className="text-center">
                              <div className="text-4xl mb-2">📖</div>
                              <p>End of book</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Controls */}
                  <div className="bg-amber-100/70 px-8 py-6 border-t border-amber-200/50">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={goToPreviousSpread}
                        disabled={readerState.currentPage <= 1}
                        className={readerState.currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        ← Previous
                      </Button>

                      <div className="flex items-center space-x-4">
                        <span className="text-amber-800">Go to page:</span>
                        <input
                          type="number"
                          min={1}
                          max={readerState.totalPages || 1}
                          value={readerState.currentPage}
                          onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2 rounded-lg border border-amber-300 bg-white/80 text-center focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        />
                        <span className="text-amber-700">of {readerState.totalPages}</span>
                      </div>

                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={goToNextSpread}
                        disabled={!readerState.totalPages || readerState.currentPage + 1 >= readerState.totalPages}
                        className={!readerState.totalPages || readerState.currentPage + 1 >= readerState.totalPages ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        Next →
                      </Button>
                    </div>

                    <div className="mt-4 text-center text-sm text-amber-700">
                      <p>💡 Use arrow keys to navigate • Press Escape to return to library</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BookReader;