import React, { useState, useEffect, useRef } from "react";
import Button from "../components/common/Button";
import ZoomModal from "../components/zoom/ZoomModal";
import {
  pagesApi,
  type FetchPageRequest,
  type FetchPagesRequest,
} from "../services/PageService";
import { useParams } from "react-router-dom";
import type { PageModel } from "../services/models/Page";
import type { Bookmark } from "../services/models/Bookmark";
import { bookmarkApi } from "../services/BookmarkService";

interface ReaderState {
  totalPages: number | null;
  leftPageNumber: number;
  rightPageNumber: number;
  documentName: string;
  author?: string;
  isLoading: boolean;
  error: string | null;
  fontSize: number;
  zoomedImage: string | null;
  scale: number;
}

// PDF.js types
interface PDFDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPage>;
}

interface PDFPage {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (context: PDFRenderContext) => { promise: Promise<void> };
  getTextContent: () => Promise<PDFTextContent>;
}

interface PDFViewport {
  width: number;
  height: number;
  transform: number[];
}

interface PDFTextContent {
  items: PDFTextItem[];
  styles: Record<string, { fontFamily?: string }>;
}

interface PDFTextItem {
  str: string;
  transform: number[];
  fontName: string;
}

interface TextElement {
  element: HTMLDivElement;
  text: string;
  index: number;
  pageNumber: number;
}

interface PDFRenderContext {
  canvasContext: CanvasRenderingContext2D;
  viewport: PDFViewport;
}

declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (options: { data: ArrayBuffer }) => {
        promise: Promise<PDFDocument>;
      };
      GlobalWorkerOptions: {
        workerSrc: string;
      };
      Util: {
        transform: (transform1: number[], transform2: number[]) => number[];
      };
    };
  }
}

const BookReader: React.FC = () => {
  const { documentGroupId } = useParams<{ documentGroupId: string }>();
  const [pageZoomNumber, setPageToZoom] = useState<number>(0);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftTextLayerRef = useRef<HTMLDivElement>(null);
  const rightTextLayerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const readingTimeoutRef = useRef<number | null>(null);

  const [readerState, setReaderState] = useState<ReaderState>({
    leftPageNumber: 1,
    rightPageNumber: 2,
    totalPages: null,
    documentName: "Loading...",
    author: "",
    isLoading: true,
    error: null,
    fontSize: 14,
    zoomedImage: null,
    scale: 1.0,
  });

  // Load PDF.js when component mounts
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const fetchPages = async (documentGroupId: string): Promise<ArrayBuffer> => {
    try {
      const request: FetchPagesRequest = {
        documentGroupId: documentGroupId,
      };

      const response = await pagesApi.getPages(request);
      return response;
    } catch (error) {
      throw new Error("Failed to get PDF document");
    }
  };

  const fetchBookmark = async (
    documentGroupId: string
  ): Promise<Bookmark> => {
    try {
      const bookmark = await bookmarkApi.getBookmark(documentGroupId)
      if(bookmark == undefined){
        console.log('here');
        const response: Bookmark = {
            documentGroupId: documentGroupId,
            page: 1,
            createdAt:new Date(Date.now()),
            id: "temp"
        };
        return response;

      }
      return bookmark;
    } catch (error) {
      throw new Error(`Failed to get bookmark for ${documentGroupId}`);
    }
  };

  const renderTextLayer = async (
    pdf: PDFDocument,
    pageNumber: number,
    textLayer: HTMLDivElement,
    viewport: PDFViewport
  ): Promise<TextElement[]> => {
    if (!textLayer || pageNumber > pdf.numPages || pageNumber < 1) return [];

    try {
      const page = await pdf.getPage(pageNumber);

      // Clear previous text layer
      textLayer.innerHTML = "";
      textLayer.style.width = viewport.width + "px";
      textLayer.style.height = viewport.height + "px";

      const textContent = await page.getTextContent();
      const elements: TextElement[] = [];

      textContent.items.forEach((textItem: PDFTextItem, index: number) => {
        const tx = window.pdfjsLib.Util.transform(
          window.pdfjsLib.Util.transform(
            viewport.transform,
            textItem.transform
          ),
          [1, 0, 0, -1, 0, 0]
        );

        const style = textContent.styles[textItem.fontName];
        const angle = Math.atan2(tx[1], tx[0]);
        const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

        const textDiv = document.createElement("div");
        textDiv.textContent = textItem.str;
        textDiv.style.position = "absolute";
        textDiv.style.left = tx[4]+ "px";
        textDiv.style.top = tx[5] - fontHeight + "px";
        textDiv.style.fontSize = fontHeight + 0.5 + "px"; //add a small amount so we can make the highlighting constistant
        textDiv.style.fontFamily = style?.fontFamily || "sans-serif";
        textDiv.style.transform = "rotate(" + angle + "rad)";
        textDiv.style.transformOrigin = "0% 0%";
        textDiv.style.userSelect = "text";
        textDiv.style.cursor = "text";
        textDiv.style.color = "transparent";
        textDiv.style.transition = "background-color 0.3s ease";
        textDiv.style.borderRadius = "6px";
        textDiv.style.padding = "2px 4px";
        textDiv.classList.add("pdf-text-item");
        textDiv.dataset.index = `${pageNumber}-${index}`;

        textLayer.appendChild(textDiv);
        elements.push({
          element: textDiv,
          text: textItem.str,
          index: index,
          pageNumber: pageNumber,
        });
      });

      return elements;
    } catch (error) {
      console.error(
        `Error rendering text layer for page ${pageNumber}:`,
        error
      );
      return [];
    }
  };

  const renderPDFPage = async (
    pdf: PDFDocument,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    currentScale: number,
    textLayer?: HTMLDivElement
  ): Promise<TextElement[]> => {
    if (!canvas || pageNumber > pdf.numPages || pageNumber < 1) return [];

    try {
      const page = await pdf.getPage(pageNumber);
      const context = canvas.getContext("2d");
      if (!context) return [];

      const viewport = page.getViewport({ scale: currentScale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext: PDFRenderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Render text layer if provided
      if (textLayer) {
        return await renderTextLayer(pdf, pageNumber, textLayer, viewport);
      }

      return [];
    } catch (error) {
      console.error(`Error rendering page ${pageNumber}:`, error);
      // Clear canvas on error
      const context = canvas.getContext("2d");
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      return [];
    }
  };

  const loadPDF = async (documentGroupId: string) => {
    if (!documentGroupId) {
      console.error("Document group ID is null");
      return;
    }

    setReaderState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const pdfArrayBufferPromise = fetchPages(documentGroupId);
      const bookmarkPromise = fetchBookmark(documentGroupId);

      const [pdfArrayBuffer, bookmark] = await Promise.all([
        pdfArrayBufferPromise,
        bookmarkPromise,
      ]);

      const pdf = await window.pdfjsLib.getDocument({ data: pdfArrayBuffer })
        .promise;

      setPdfDoc(pdf);
      setReaderState((prev) => ({
        ...prev,
        totalPages: pdf.numPages,
        documentName: "Place holder for now",
        author: "placeholder",
        isLoading: false,
      }));

      console.log('bookmark:', bookmark);
      // Render initial pages with current scale
      setTimeout(() => {
        if (leftCanvasRef.current) {
          renderPDFPage(
            pdf,
            bookmark.page,
            leftCanvasRef.current,
            readerState.scale,
            leftTextLayerRef.current || undefined
          );
        }
        if (rightCanvasRef.current && pdf.numPages > 1) {
          renderPDFPage(
            pdf,
            bookmark.page + 1,
            rightCanvasRef.current,
            readerState.scale,
            rightTextLayerRef.current || undefined
          );
        }
      }, 100);
    } catch (error) {
      setReaderState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load PDF",
      }));
    }
  };

  const updatePages = async () => {
    if (!pdfDoc) return;

    let allElements: TextElement[] = [];

    // Render left page
    if (leftCanvasRef.current) {
      const leftElements = await renderPDFPage(
        pdfDoc,
        readerState.leftPageNumber,
        leftCanvasRef.current,
        readerState.scale,
        leftTextLayerRef.current || undefined
      );
      allElements = [...allElements, ...leftElements];
    }

    // Render right page
    if (
      rightCanvasRef.current &&
      readerState.rightPageNumber <= pdfDoc.numPages
    ) {
      const rightElements = await renderPDFPage(
        pdfDoc,
        readerState.rightPageNumber,
        rightCanvasRef.current,
        readerState.scale,
        rightTextLayerRef.current || undefined
      );
      allElements = [...allElements, ...rightElements];
    } else if (rightCanvasRef.current) {
      // Clear right canvas if no page to show
      const context = rightCanvasRef.current.getContext("2d");
      if (context) {
        context.clearRect(
          0,
          0,
          rightCanvasRef.current.width,
          rightCanvasRef.current.height
        );
      }

      if (rightTextLayerRef.current) {
        rightTextLayerRef.current.innerHTML = "";
      }
    }

    setTextElements(allElements);
  };

  const goToNextSpread = async () => {
    const nextPage = readerState.leftPageNumber + 2;
    if (readerState.totalPages && nextPage <= readerState.totalPages) {
      setReaderState((prev) => ({
        ...prev,
        leftPageNumber: nextPage,
        rightPageNumber: nextPage + 1,
      }));
    }
  };

  const goToPreviousSpread = async () => {
    const prevPage = readerState.leftPageNumber - 2;
    if (prevPage >= 1) {
      setReaderState((prev) => ({
        ...prev,
        leftPageNumber: prevPage,
        rightPageNumber: prevPage + 1,
      }));
    }
  };

  const goToPage = (pageNumber: number) => {
    const leftPageNumber = pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
    if (
      readerState.totalPages &&
      leftPageNumber >= 1 &&
      leftPageNumber <= readerState.totalPages
    ) {
      setReaderState((prev) => ({
        ...prev,
        leftPageNumber: leftPageNumber,
        rightPageNumber: leftPageNumber + 1,
      }));
    }
  };

  const openImageZoom = (pageNumber: number) => {
    if (!pdfDoc) return;

    setPageToZoom(pageNumber);

    // Create a temporary canvas to generate high-res image for zoom
    const tempCanvas = document.createElement("canvas");
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) return;

    pdfDoc.getPage(pageNumber).then((page) => {
      const viewport = page.getViewport({ scale: 2.0 }); // Higher resolution for zoom
      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;

      const renderContext: PDFRenderContext = {
        canvasContext: tempContext,
        viewport: viewport,
      };

      page.render(renderContext).promise.then(() => {
        const dataUrl = tempCanvas.toDataURL();
        setReaderState((prev) => ({ ...prev, zoomedImage: dataUrl }));
      });
    });
  };

  const closeImageZoom = () => {
    setReaderState((prev) => ({ ...prev, zoomedImage: null }));
  };

  // Update pages when page numbers or scale change
  useEffect(() => {
    if (pdfDoc) {
      updatePages();
    }
  }, [
    readerState.leftPageNumber,
    readerState.rightPageNumber,
    readerState.scale,
    pdfDoc,
  ]);

  useEffect(() => {
    const initializeReader = async () => {
      try {
        await loadPDF(documentGroupId!);
      } catch (error) {
        setReaderState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to initialize PDF reader",
        }));
      }
    };

    if (documentGroupId) {
      initializeReader();
    }
  }, [documentGroupId]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Close zoom if open
      if (readerState.zoomedImage && event.key === "Escape") {
        closeImageZoom();
        return;
      }

      // Don't navigate if zoom is open
      if (readerState.zoomedImage) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          goToPreviousSpread();
          break;
        case "ArrowRight":
          event.preventDefault();
          goToNextSpread();
          break;
        case "Escape":
          // Navigate back to library - implement based on your routing
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    readerState.leftPageNumber,
    readerState.totalPages,
    readerState.zoomedImage,
  ]);

  const rightPageNumber = readerState.leftPageNumber + 1;
  const hasRightPage =
    readerState.totalPages && rightPageNumber <= readerState.totalPages;

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
                  <p className="text-sm text-amber-700/80">
                    by {readerState.author}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {readerState.totalPages && (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
                  <span className="text-sm text-amber-800 font-medium">
                    Pages {readerState.leftPageNumber}
                    {hasRightPage && `-${rightPageNumber}`} of{" "}
                    {readerState.totalPages}
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
              <h2 className="text-2xl font-semibold text-red-800 mb-2">
                Failed to Load PDF
              </h2>
              <p className="text-red-600 mb-6">{readerState.error}</p>
              <Button variant="primary" to="/library">
                Back to Library
              </Button>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {readerState.isLoading ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 animate-bounce">📖</div>
                  <h2 className="text-2xl font-semibold text-amber-900 mb-4">
                    Loading PDF...
                  </h2>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Book Spread Layout */}
                  <div className="bg-white/5 flex items-center justify-center min-h-[700px] p-8">
                    {/* Book Container */}
                    <div
                      className="relative bg-amber-950 rounded-xl p-8 shadow-2xl border border-white/20"
                      style={{ maxWidth: "90vw", overflow: "auto" }}
                    >
                      {/* Book Pages */}
                      <div className="flex gap-4">
                        {/* Left Page */}
                        <div className="relative">
                          <canvas
                            ref={leftCanvasRef}
                            className="shadow-lg border border-gray-300/50 bg-white"
                            onClick={() =>
                              openImageZoom(readerState.leftPageNumber)
                            }
                            style={{ cursor: "pointer" }}
                          />
                          <div
                                  ref={leftTextLayerRef}
                                  className="pdf-text-layer absolute top-0 left-0 overflow-hidden leading-none"
                                  style={{
                                    pointerEvents: "auto",
                                    userSelect: "text",
                                    WebkitUserSelect: "text",
                                    MozUserSelect: "text",
                                    msUserSelect: "text",
                                  }}
                                />
                          {/* Page Number - Bottom Left */}
                          <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
                            {readerState.leftPageNumber}
                          </div>
                        </div>

                        {/* Center Gutter/Spine */}
                        <div className="w-4 bg-gradient-to-r from-black via-black to-black/10 rounded-sm"></div>

                        {/* Right Page */}
                        <div className="relative">
                          {hasRightPage ? (
                            <>
                              <div>
                                <canvas
                                  ref={rightCanvasRef}
                                  className="shadow-lg border border-gray-300/50 bg-white"
                                  onClick={() => openImageZoom(rightPageNumber)}
                                  style={{ cursor: "pointer" }}
                                />
                                <div
                                  ref={rightTextLayerRef}
                                  className="pdf-text-layer absolute top-0 left-0 overflow-hidden leading-none"
                                  style={{
                                    pointerEvents: "auto",
                                    userSelect: "text",
                                    WebkitUserSelect: "text",
                                    MozUserSelect: "text",
                                    msUserSelect: "text",
                                  }}
                                />
                                {/* Page Number - Bottom Right */}
                                <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
                                  {rightPageNumber}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div
                              className="bg-white/20 border border-gray-300/50 shadow-lg flex items-center justify-center text-amber-600"
                              style={{
                                width: leftCanvasRef.current?.width || 400,
                                height: leftCanvasRef.current?.height || 600,
                              }}
                            >
                              <div className="text-center">
                                <div className="text-4xl mb-2">📖</div>
                                <p>End of book</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover Instructions */}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors duration-300 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-amber-900 font-medium">
                          Click pages to zoom
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Controls */}
                  <div className="bg-white/10 backdrop-blur-lg px-8 py-6 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={goToPreviousSpread}
                        disabled={readerState.leftPageNumber <= 1}
                        className={`${
                          readerState.leftPageNumber <= 1
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-white/20"
                        } bg-white/10 backdrop-blur-sm border-white/30 transition-all duration-200`}
                      >
                        ← Previous
                      </Button>

                      {/* Enhanced Dropdown Navigation */}
                      <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-lg px-6 py-3 rounded-2xl border border-white/30 shadow-lg">
                        <span className="text-amber-800 font-medium">
                          Go to page:
                        </span>
                        <div className="relative">
                          <select
                            value={readerState.leftPageNumber}
                            onChange={(e) => goToPage(parseInt(e.target.value))}
                            className="appearance-none bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-2 pr-10 text-amber-900 font-medium focus:ring-2 focus:ring-amber-400/50 focus:border-white/60 transition-all cursor-pointer hover:bg-white/40"
                          >
                            {Array.from(
                              { length: readerState.totalPages || 0 },
                              (_, i) => i + 1
                            ).map((page) => (
                              <option
                                key={page}
                                value={page}
                                className="bg-amber-50 text-amber-900"
                              >
                                Page {page}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg
                              className="w-4 h-4 text-amber-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                        <span className="text-amber-700 font-medium">
                          of {readerState.totalPages}
                        </span>
                      </div>

                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={goToNextSpread}
                        disabled={
                          !readerState.totalPages ||
                          readerState.leftPageNumber + 1 >=
                            readerState.totalPages
                        }
                        className={`${
                          !readerState.totalPages ||
                          readerState.leftPageNumber + 1 >=
                            readerState.totalPages
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-white/20"
                        } bg-white/10 backdrop-blur-sm border-white/30 transition-all duration-200`}
                      >
                        Next →
                      </Button>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-sm text-amber-700 font-medium bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl inline-block border border-white/30">
                        💡 Use arrow keys to navigate • Click pages to zoom •
                        Use scale controls for sizing
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
        <ZoomModal 
          imageUrl={readerState.zoomedImage}
          onClose={closeImageZoom}
          pageNumber={pageZoomNumber}
        />
      )}
    </div>
  );
};

export default BookReader;