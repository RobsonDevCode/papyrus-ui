import React, { useState, useEffect, useRef } from "react";
import Button from "../components/common/Button";
import { pagesApi, type FetchPagesRequest } from "../services/PageService";
import { useLocation, useParams } from "react-router-dom";
import type { Bookmark } from "../services/models/Bookmark";
import { bookmarkApi } from "../services/BookmarkService";
import AIReadingModal from "../components/modals/AiReadingModal";
import type { SetUpAudioSettingsRequest } from "../services/models/SetUpAudioSettingsRequest";
import { audioSettingsUploadApi } from "../services/AudioSettingsUploadService";
import { audioSettingsRetrievalApi } from "../services/AudioSettingsRetrievalService";
import AudioPlayer from "../components/modals/AudioPlayer";
import type { AudioSettings } from "../services/models/AudioSettings";
import type { CreateBookmarkRequet } from "../services/models/CreateBookmark";
import BookmarkAnimation from "../components/animations/BookmarkAnimation";

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
  leftPageZoom: number;
  rightPageZoom: number;
  leftPagePan: { x: number; y: number };
  rightPagePan: { x: number; y: number };
}

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
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftTextLayerRef = useRef<HTMLDivElement>(null);
  const rightTextLayerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [isAIReadingModalOpen, setIsAIReadingModalOpen] = useState(false);
  const [isAudioPlayerVisible, setIsAudioPlayerVisible] = useState(false);
  const [hasAudioSettings, setHasAudioSettings] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>();
  const [currentBookmark, setBookmark] = useState<Bookmark>();

  // Drag state for pan functionality
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Track the scale at which each page was last rendered
  const [leftPageRenderedZoom, setLeftPageRenderedZoom] = useState(1);
  const [rightPageRenderedZoom, setRightPageRenderedZoom] = useState(1);

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 2;
  const DEFAULT_ZOOM = 1;
  const ZOOM_STEP = 0.25;

  const renderTasksRef = useRef<{ [key: string]: any }>({});

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
    leftPageZoom: DEFAULT_ZOOM,
    rightPageZoom: DEFAULT_ZOOM,
    leftPagePan: { x: 0, y: 0 },
    rightPagePan: { x: 0, y: 0 },
  });

  const [showBookmarkAnimation, setShowBookmarkAnimation] = useState(false);

  const prevLeftZoomRef = useRef(readerState.leftPageZoom);
  const prevRightZoomRef = useRef(readerState.rightPageZoom);

  const location = useLocation();
  const userId = location.state?.userId;
  const name = location.state?.name;
  const author = location.state?.author;

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

  const fetchPages = async (
    documentGroupId: string,
    userId: string
  ): Promise<ArrayBuffer> => {
    try {
      const request: FetchPagesRequest = {
        documentGroupId: documentGroupId,
      };

      const response = await pagesApi.getPages(request, userId);
      return response;
    } catch (error) {
      throw new Error("Failed to get PDF document");
    }
  };

  const fetchBookmark = async (
    documentGroupId: string,
    userId: string
  ): Promise<Bookmark> => {
    try {
      const bookmark = await bookmarkApi.getBookmark(documentGroupId, userId);
      if (bookmark == undefined) {
        const response: Bookmark = {
          documentGroupId: documentGroupId,
          page: 1,
          createdAt: new Date(Date.now()),
          id: "temp",
          timestamp: 0.0,
        };

        return response;
      }
      setBookmark(bookmark);
      return bookmark;
    } catch (error) {
      throw new Error(`Failed to get bookmark for ${documentGroupId}`);
    }
  };

  const createBookmark = async (timestamp: number, page: number) => {
    try {
      setShowBookmarkAnimation(true);
      if (documentGroupId === null) {
        throw new Error(
          `Failed to create bookmark document id could not be found`
        );
      }

      const request: CreateBookmarkRequet = {
        id: currentBookmark?.id ?? undefined,
        userId: userId,
        documentGroupId: documentGroupId ?? "",
        page: page,
        timestamp: timestamp,
      };

      var response = await bookmarkApi.createBookmark(request);
      if (!response.success) {
        throw new Error(`Failed to create book mark`);
      }
    } catch (error) {
      throw new Error(`Failed to create book mark`);
    } finally {
      setTimeout(() => {
        setShowBookmarkAnimation(false);
      }, 2000);
    }
  };

  const checkAudioSettings = async () => {
    try {
      const audioSettings = await audioSettingsRetrievalApi.getAudioSettings(
        userId
      );
      if (audioSettings && audioSettings.voiceId) {
        setAudioSettings(audioSettings);
        setHasAudioSettings(true);
        setIsAudioPlayerVisible(true);
      }
    } catch (error) {
      console.error("Failed to check audio settings:", error);
      setHasAudioSettings(false);
    }
  };

  const handleZoomIn = (page: "left" | "right") => {
    setReaderState((prev) => {
      const currentZoom =
        page === "left" ? prev.leftPageZoom : prev.rightPageZoom;
      const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);

      return {
        ...prev,
        [page == "left" ? "leftPageZoom" : "rightPageZoom"]: newZoom,
      };
    });
  };

  const handleZoomOut = (page: "left" | "right") => {
    setReaderState((prev) => {
      const currentZoom =
        page === "left" ? prev.leftPageZoom : prev.rightPageZoom;
      const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);

      // Reset pan when zooming out to 1x
      if (newZoom === MIN_ZOOM) {
        return {
          ...prev,
          [page === "left" ? "leftPageZoom" : "rightPageZoom"]: newZoom,
          [page === "left" ? "leftPagePan" : "rightPagePan"]: { x: 0, y: 0 },
        };
      }

      return {
        ...prev,
        [page == "left" ? "leftPageZoom" : "rightPageZoom"]: newZoom,
      };
    });
  };

  const resetZoom = (page: "left" | "right") => {
    setReaderState((prev) => ({
      ...prev,
      [page === "left" ? "leftPageZoom" : "rightPageZoom"]: DEFAULT_ZOOM,
      [page === "left" ? "leftPagePan" : "rightPagePan"]: { x: 0, y: 0 },
    }));

    // Reset the rendered zoom tracking
    if (page === "left") {
      setLeftPageRenderedZoom(1);
    } else {
      setRightPageRenderedZoom(1);
    }
  };

  // Drag handlers for pan
  const handleMouseDown = (e: React.MouseEvent, page: "left" | "right") => {
    const zoom =
      page === "left" ? readerState.leftPageZoom : readerState.rightPageZoom;

    // Only enable dragging if zoomed in
    if (zoom <= 1) return;

    e.preventDefault();
    setIsDragging(page);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setReaderState((prev) => {
      const panKey = isDragging === "left" ? "leftPagePan" : "rightPagePan";
      const currentPan = prev[panKey];

      return {
        ...prev,
        [panKey]: {
          x: currentPan.x + deltaX,
          y: currentPan.y + deltaY,
        },
      };
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      window.addEventListener("mouseup", handleGlobalMouseUp);
      window.addEventListener("mouseleave", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("mouseleave", handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Debounced re-render for left page zoom changes
  useEffect(() => {
    if (!pdfDoc || !leftCanvasRef.current || !leftTextLayerRef.current) return;

    const zoomChanged = prevLeftZoomRef.current !== readerState.leftPageZoom;
    prevLeftZoomRef.current = readerState.leftPageZoom;
    if (!zoomChanged) {
      return;
    }
    const timeoutId = setTimeout(async () => {
      // Re-render at the new zoom level for sharp quality
      const leftElements = await renderPDFPage(
        pdfDoc,
        readerState.leftPageNumber,
        leftCanvasRef.current!,
        readerState.leftPageZoom, // Use zoom as scale
        leftTextLayerRef.current!
      );

      // Update text elements for this page - maintain proper order (left before right)
      setTextElements((prev) => {
        const rightPageElements = prev.filter((el) => el.pageNumber === readerState.rightPageNumber);
        return [...leftElements, ...rightPageElements];
      });

      // Track that we've rendered at this zoom level
      setLeftPageRenderedZoom(readerState.leftPageZoom);
    }, 400); // Wait 400ms after last zoom change

    return () => clearTimeout(timeoutId);
  }, [readerState.leftPageZoom, readerState.leftPageNumber, pdfDoc]);

  // Debounced re-render for right page zoom changes
  useEffect(() => {
    if (!pdfDoc || !rightCanvasRef.current || !rightTextLayerRef.current)
      return;
    if (readerState.rightPageNumber > (readerState.totalPages || 0)) return;

    const zoomChanged = prevRightZoomRef.current !== readerState.rightPageZoom;
    prevRightZoomRef.current = readerState.rightPageZoom;

    if (!zoomChanged) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      // Re-render at the new zoom level for sharp quality
      const rightElements = await renderPDFPage(
        pdfDoc,
        readerState.rightPageNumber,
        rightCanvasRef.current!,
        readerState.rightPageZoom, // Use zoom as scale
        rightTextLayerRef.current!
      );

      // Update text elements for this page - maintain proper order (left before right)
      setTextElements((prev) => {
        const leftPageElements = prev.filter((el) => el.pageNumber === readerState.leftPageNumber);
        return [...leftPageElements, ...rightElements];
      });

      // Track that we've rendered at this zoom level
      setRightPageRenderedZoom(readerState.rightPageZoom);
    }, 50); // Wait 400ms after last zoom change

    return () => clearTimeout(timeoutId);
  }, [
    readerState.rightPageZoom,
    readerState.rightPageNumber,
    readerState.totalPages,
    pdfDoc,
  ]);

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
        textDiv.style.left = tx[4] + "px";
        textDiv.style.top = tx[5] - fontHeight + "px";
        textDiv.style.fontSize = fontHeight + "px";
        textDiv.style.fontFamily = style?.fontFamily || "sans-serif";
        textDiv.style.transform = "rotate(" + angle + "rad)";
        textDiv.style.transformOrigin = "0% 0%";
        textDiv.style.userSelect = "text";
        textDiv.style.cursor = "text";
        textDiv.style.color = "transparent";
        textDiv.style.borderRadius = "6px";
        textDiv.style.padding = "2px 4px";
        textDiv.classList.add("pdf-text-item");
        textDiv.classList.add("transition-all", "duration-200", "ease-in-out");
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

  const onGetPageText = async (
    leftPage: number,
    rightPage: number
  ): Promise<string> => {
    if (!pdfDoc) return "";

    const leftElements: TextElement[] = [];
    const rightElements: TextElement[] = [];

    if (leftPage >= 1 && leftPage <= pdfDoc.numPages) {
      const page = await pdfDoc.getPage(leftPage);
      const textContent = await page.getTextContent();
      textContent.items.forEach((item: PDFTextItem) => {
        leftElements.push({
          element: document.createElement("div"),
          text: item.str,
          index: 0,
          pageNumber: leftPage,
        });
      });

      if (rightPage >= 1 && rightPage <= pdfDoc.numPages) {
        const page = await pdfDoc.getPage(rightPage);
        const textContent = await page.getTextContent();
        textContent.items.forEach((item: PDFTextItem) => {
          rightElements.push({
            element: document.createElement("div"),
            text: item.str,
            index: 0,
            pageNumber: rightPage,
          });
        });
      }
    }

    const leftText = leftElements.map((el) => el.text).join("");
    const rightText = rightElements.map((el) => el.text).join("");

    return `${leftText} ${rightText}`;
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
      const canvasId = canvas === leftCanvasRef.current ? "left" : "right";

      // Cancel any existing render task for this canvas
      if (renderTasksRef.current[canvasId]) {
        renderTasksRef.current[canvasId].cancel();
      }

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

      // Store the render task so we can cancel it if needed
      const renderTask = page.render(renderContext);
      renderTasksRef.current[canvasId] = renderTask;

      await renderTask.promise;

      // Clear the stored task after successful render
      renderTasksRef.current[canvasId] = null;

      if (textLayer) {
        return await renderTextLayer(pdf, pageNumber, textLayer, viewport);
      }

      return [];
    } catch (error: any) {
      // Ignore cancellation errors - they're expected
      if (error?.name === "RenderingCancelledException") {
        console.log(`Render cancelled for page ${pageNumber}`);
        return [];
      }

      console.error(`Error rendering page ${pageNumber}:`, error);
      // Clear canvas on error
      const context = canvas.getContext("2d");
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      return [];
    }
  };

  const loadPDF = async (
    documentGroupId: string | null,
    userId: string | null
  ) => {
    if (!documentGroupId) {
      console.error("Document group ID is null");
      return;
    }
    if (!userId) {
      console.error("user id is null");
      return;
    }

    setReaderState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const pdfArrayBufferPromise = fetchPages(documentGroupId, userId);
      const bookmarkPromise = fetchBookmark(documentGroupId, userId);

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
        leftPageNumber: bookmark.page,
        rightPageNumber: bookmark.page + 1,
        documentName: name ?? "Name not found",
        author: author ?? "Author not found",
        isLoading: false,
      }));

      // Pages will be rendered automatically by the useEffect that watches page numbers
      // No manual rendering needed here - this fixes the page flip issue on load
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
        leftPageZoom: DEFAULT_ZOOM,
        rightPageZoom: DEFAULT_ZOOM,
        leftPagePan: { x: 0, y: 0 },
        rightPagePan: { x: 0, y: 0 },
      }));
      setLeftPageRenderedZoom(1);
      setRightPageRenderedZoom(1);
    }
  };

  const goToPreviousSpread = async () => {
    const prevPage = readerState.leftPageNumber - 2;
    if (prevPage >= 1) {
      setReaderState((prev) => ({
        ...prev,
        leftPageNumber: prevPage,
        rightPageNumber: prevPage + 1,
        leftPageZoom: DEFAULT_ZOOM,
        rightPageZoom: DEFAULT_ZOOM,
        leftPagePan: { x: 0, y: 0 },
        rightPagePan: { x: 0, y: 0 },
      }));
      setLeftPageRenderedZoom(1);
      setRightPageRenderedZoom(1);
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
        leftPageZoom: DEFAULT_ZOOM,
        rightPageZoom: DEFAULT_ZOOM,
        leftPagePan: { x: 0, y: 0 },
        rightPagePan: { x: 0, y: 0 },
      }));
      setLeftPageRenderedZoom(1);
      setRightPageRenderedZoom(1);
    }
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
        await loadPDF(documentGroupId!, userId);
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
  checkAudioSettings();
}, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (readerState.zoomedImage && event.key === "Escape") {
        return;
      }

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
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    readerState.leftPageNumber,
    readerState.totalPages,
    readerState.zoomedImage,
    readerState.leftPageZoom,
    readerState.rightPageZoom,
  ]);

  const rightPageNumber = readerState.leftPageNumber + 1;
  const hasRightPage =
    readerState.totalPages && rightPageNumber <= readerState.totalPages;

  const handleAIReadingConfig = async (config: SetUpAudioSettingsRequest) => {
    try {
      await audioSettingsUploadApi.createAudioSettings(config);
      const newAudioSettings = await audioSettingsRetrievalApi.getAudioSettings(
        userId
      );
      setAudioSettings(newAudioSettings);
      setHasAudioSettings(true);
      setIsAudioPlayerVisible(true);
    } catch (error) {
      console.error("Error configuring AI reading:", error);
      alert("Failed to configure AI reading. Please try again.");
    }
  };

  const handleHighlightText = (charIndex: number, isActive: boolean) => {
    let cumulativeIndex = 0;
    let targetElement: TextElement | null = null;

    // First, find which element contains this character
    for (const textElement of textElements) {
      const textLength = textElement.text.length;

      if (
        charIndex >= cumulativeIndex &&
        charIndex < cumulativeIndex + textLength
      ) {
        targetElement = textElement;
        break;
      }

      cumulativeIndex += textLength;
    }

    if (!targetElement) return;

    const targetPageNumber = targetElement.pageNumber;
    const isTargetPageZoomed =
      (targetPageNumber === readerState.leftPageNumber &&
        readerState.leftPageZoom > 1) ||
      (targetPageNumber === readerState.rightPageNumber &&
        readerState.rightPageZoom > 1);

    if (isTargetPageZoomed) {
      return;
    }

    if (isActive) {
      // Get the Y position and page number of the target element
      const targetTop = parseFloat(targetElement.element.style.top);
      console.log(targetElement.pageNumber);
      const targetPage = targetElement.pageNumber;
      const tolerance = 2; // pixels tolerance for same line detection

      // Find all elements on the same line AND same page
      const elementsOnSameLine = textElements.filter((te) => {
        const elementTop = parseFloat(te.element.style.top);
        return (
          Math.abs(elementTop - targetTop) <= tolerance &&
          te.pageNumber === targetPage
        );
      });

      // Highlight all elements on this line
      elementsOnSameLine.forEach((te) => {
        te.element.classList.add(
          "bg-blue-400/40",
          "shadow-lg",
          "shadow-blue-300/30",
          "scale-105"
        );
      });

      // Scroll the target element into view
      targetElement.element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    } else {
      // Remove highlight from all elements
      textElements.forEach((te) => {
        te.element.classList.remove(
          "bg-blue-400/40",
          "shadow-lg",
          "shadow-blue-300/30",
          "scale-105"
        );
      });
    }
  };

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
              <Button
                variant="ghost"
                size="sm"
                to="/library"
                state={{ userId: userId }}
              >
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
              {/* AI Reading Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAIReadingModalOpen(true)}
                disabled={readerState.isLoading}
                className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 transition-all duration-200 flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                </svg>
                🎙️ AI Reading
              </Button>
              {!isAudioPlayerVisible && hasAudioSettings && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAudioPlayerVisible(true)}
                  className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 transition-all duration-200 flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.68 6.5,20.68C8.45,20.68 10.55,21.1 12,22C13.35,21.15 15.8,20.68 17.5,20.68C19.15,20.68 20.85,21.1 22.25,21.59C22.35,21.59 22.4,21.66 22.5,21.66C22.75,21.66 23,21.41 23,21.16V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,18.9 12,19.8C10.55,18.9 8.45,18.5 6.5,18.5C5.3,18.5 4.1,18.65 3,19V6.5C4.45,5.4 6.55,5 8.5,   5H9V7H8.5C7.55,7 6.45,7.15 5.5,7.5V9C6.45,8.65 7.55,8.5 8.5,8.5S10.55,8.65 11.5,9V7.5C10.55,   7.15 9.45,7 8.5,7H8V5H8.5C9.45,5 10.55,5.15 11.5,5.5V4C10.55,3.65 9.45,3.5 8.5,3.5C7.55,   3.5 6.45,3.65 5.5,4V5.5C6.45,5.15 7.55,5 8.5,5H9Z" />
                  </svg>
                  Audio Player
                </Button>
              )}
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
                        <div
                          className="relative"
                          style={{
                            cursor:
                              readerState.leftPageZoom > 1
                                ? isDragging === "left"
                                  ? "grabbing"
                                  : "grab"
                                : "pointer",
                          }}
                        >
                          {/* Zoom Controls - Left Page (outside transform wrapper) */}
                          <div
                            className="absolute top-2 right-2 flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-1 z-50"
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseMove={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            style={{ pointerEvents: "auto" }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleZoomIn("left");
                              }}
                              disabled={readerState.leftPageZoom >= MAX_ZOOM}
                              className="p-2 hover:bg-amber-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Zoom In"
                            >
                              <svg
                                className="w-5 h-5 text-amber-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleZoomOut("left");
                              }}
                              disabled={readerState.leftPageZoom <= MIN_ZOOM}
                              className="p-2 hover:bg-amber-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Zoom Out"
                            >
                              <svg
                                className="w-5 h-5 text-amber-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                resetZoom("left");
                              }}
                              className="p-2 hover:bg-amber-100 rounded transition-colors"
                              title="Reset Zoom"
                            >
                              <svg
                                className="w-5 h-5 text-amber-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            </button>
                            <div className="text-xs text-center text-amber-700 font-medium px-1 py-1">
                              {Math.round(readerState.leftPageZoom * 100)}%
                            </div>
                          </div>

                          <div
                            onMouseDown={(e) => handleMouseDown(e, "left")}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                          >
                            <canvas
                              ref={leftCanvasRef}
                              className="shadow-lg border border-gray-300/50 bg-white"
                              style={{
                                cursor: "pointer",
                                transform:
                                  readerState.leftPageZoom > 1
                                    ? `scale(${
                                        readerState.leftPageZoom /
                                        leftPageRenderedZoom
                                      }) translate(${
                                        readerState.leftPagePan.x
                                      }px, ${readerState.leftPagePan.y}px)`
                                    : `scale(${
                                        readerState.leftPageZoom /
                                        leftPageRenderedZoom
                                      })`,
                                transformOrigin: "top left",
                                transition:
                                  isDragging === "left"
                                    ? "none"
                                    : "transform 0.3s ease-in-out",
                                pointerEvents:
                                  readerState.leftPageZoom > 1
                                    ? "none"
                                    : "auto",
                              }}
                            />
                            <div
                              ref={leftTextLayerRef}
                              className="pdf-text-layer absolute top-0 left-0 overflow-hidden leading-none"
                              style={{
                                pointerEvents: readerState.leftPageZoom > 1 ? "none" : "auto",
                                userSelect: "text",
                                WebkitUserSelect: "text",
                                MozUserSelect: "text",
                                msUserSelect: "text",
                                transform:
                                  readerState.leftPageZoom > 1
                                    ? `scale(${
                                        readerState.leftPageZoom /
                                        leftPageRenderedZoom
                                      }) translate(${
                                        readerState.leftPagePan.x
                                      }px, ${readerState.leftPagePan.y}px)`
                                    : "none",
                                transformOrigin: "top left",
                                transition:
                                  isDragging === "left"
                                    ? "none"
                                    : "transform 0.3s ease-in-out",
                              }}
                            />
                            {/* Page Number - Bottom Left */}
                            <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
                              {readerState.leftPageNumber}
                            </div>
                          </div>
                        </div>

                        {/* Center Gutter/Spine */}
                        <div className="w-4 bg-gradient-to-r from-black via-black to-black/10 rounded-sm"></div>

                        {/* Right Page */}
                        <div
                          className="relative"
                          style={{
                            cursor:
                              readerState.rightPageZoom > 1
                                ? isDragging === "right"
                                  ? "grabbing"
                                  : "grab"
                                : "pointer",
                          }}
                        >
                          {/* Zoom Controls - Right Page (outside transform wrapper) */}
                          <div
                            className="absolute top-2 right-2 flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-1 z-50"
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseMove={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            style={{ pointerEvents: "auto" }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleZoomIn("right");
                              }}
                              disabled={readerState.rightPageZoom >= MAX_ZOOM}
                              className="p-2 hover:bg-amber-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Zoom In"
                            >
                              <svg
                                className="w-5 h-5 text-amber-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleZoomOut("right");
                              }}
                              disabled={readerState.rightPageZoom <= MIN_ZOOM}
                              className="p-2 hover:bg-amber-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Zoom Out"
                            >
                              <svg
                                className="w-5 h-5 text-amber-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                resetZoom("right");
                              }}
                              className="p-2 hover:bg-amber-100 rounded transition-colors"
                              title="Reset Zoom"
                            >
                              <svg
                                className="w-5 h-5 text-amber-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            </button>
                            <div className="text-xs text-center text-amber-700 font-medium px-1 py-1">
                              {Math.round(readerState.rightPageZoom * 100)}%
                            </div>
                          </div>

                          <div
                            onMouseDown={(e) => handleMouseDown(e, "right")}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                          >
                            {hasRightPage ? (
                              <>
                                <div>
                                  <canvas
                                    ref={rightCanvasRef}
                                    className="shadow-lg border border-gray-300/50 bg-white"
                                    style={{
                                      cursor: "pointer",
                                      transform:
                                        readerState.rightPageZoom > 1
                                          ? `scale(${
                                              readerState.rightPageZoom /
                                              rightPageRenderedZoom
                                            }) translate(${
                                              readerState.rightPagePan.x
                                            }px, ${
                                              readerState.rightPagePan.y
                                            }px)`
                                          : `scale(${
                                              readerState.rightPageZoom /
                                              rightPageRenderedZoom
                                            })`,
                                      transformOrigin: "top left",
                                      transition:
                                        isDragging === "right"
                                          ? "none"
                                          : "transform 0.3s ease-in-out",
                                      pointerEvents:
                                        readerState.rightPageZoom > 1
                                          ? "none"
                                          : "auto",
                                    }}
                                  />
                                  <div
                                    ref={rightTextLayerRef}
                                    className="pdf-text-layer absolute top-0 left-0 overflow-hidden leading-none"
                                    style={{
                                      pointerEvents: readerState.rightPageZoom > 1 ? "none" : "auto",
                                      userSelect: "text",
                                      WebkitUserSelect: "text",
                                      MozUserSelect: "text",
                                      msUserSelect: "text",
                                      transform:
                                        readerState.rightPageZoom > 1
                                          ? `scale(${
                                              readerState.rightPageZoom /
                                              rightPageRenderedZoom
                                            }) translate(${
                                              readerState.rightPagePan.x
                                            }px, ${
                                              readerState.rightPagePan.y
                                            }px)`
                                          : "none",
                                      transformOrigin: "top left",
                                      transition:
                                        isDragging === "right"
                                          ? "none"
                                          : "transform 0.3s ease-in-out",
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
                      </div>

                      {/* Hover Instructions */}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors duration-300 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-amber-900 font-medium">
                          {readerState.leftPageZoom > 1 ||
                          readerState.rightPageZoom > 1
                            ? "Drag to pan"
                            : "Use zoom controls to zoom in"}
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
                        💡 Use arrow keys to navigate • Use 🎙️ AI Reading for
                        narration
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
      {/* Bookmark Animation - Spine Bookmark Drop */}
      {showBookmarkAnimation && (
        <BookmarkAnimation
          isVisible={showBookmarkAnimation}
        ></BookmarkAnimation>
      )}
      {/* Audio Player - appears after user configures AI reading settings */}
      {isAudioPlayerVisible && (
        <AudioPlayer
          isVisible={isAudioPlayerVisible}
          voiceId={audioSettings?.voiceId ?? ""}
          voiceSettings={audioSettings?.voiceSettings!}
          currentLeftPage={readerState.leftPageNumber}
          currentRightPage={readerState.rightPageNumber}
          totalPages={readerState.totalPages || 0}
          documentId={documentGroupId || ""}
          currentBookmark={currentBookmark}
          onPageChange={goToPage}
          onClose={() => setIsAudioPlayerVisible(false)}
          onGetPageText={onGetPageText}
          onHighlightText={handleHighlightText}
          onCreateBookmark={createBookmark}
        />
      )}

      {/* AI Reading Modal */}
      <AIReadingModal
        isOpen={isAIReadingModalOpen}
        onClose={() => setIsAIReadingModalOpen(false)}
        onSave={handleAIReadingConfig}
        documentId={documentGroupId || ""}
        userAudioSettings={audioSettings}
      />
    </div>
  );
};

export default BookReader;