import React, { useState, useEffect, useRef } from "react";
import { audioApi } from "../../services/AudioService";
import type { CreateAudioBookRequest } from "../../services/models/CreateAudioBookRequest";
import type { VoiceSettings } from "../../services/models/VoiceSettings";
import type { AlignmentData } from "../../services/models/AlignmentData";
import type { AudioWithAlignment } from "../../services/models/AudioWithAlignment";
import { useLocation } from "react-router-dom";

interface AudioPlayerProps {
  isVisible: boolean;
  voiceId: string;
  voiceSettings: VoiceSettings;
  currentLeftPage: number;
  currentRightPage: number;
  totalPages: number;
  documentId: string;
  onPageChange: (pageNumber: number) => void;
  onClose: () => void;
  onGetPageText: (leftPage: number, rightPage: number) => Promise<string>;
  onHighlightText?: (charIndex: number, isActive: boolean) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isVisible,
  voiceId,
  voiceSettings,
  currentLeftPage,
  currentRightPage,
  totalPages,
  documentId,
  onPageChange,
  onClose,
  onGetPageText,
  onHighlightText,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [nextAudio, setNextAudio] = useState<HTMLAudioElement | null>(null);
  const [hasPreGenerated, setHasPreGenerated] = useState(false);
  const [currentAlignment, setCurrentAlignment] = useState<
    AlignmentData[] | null
  >(null);
  const [nextAlignment, setNextAlignment] = useState<AlignmentData[] | null>(
    null
  );
  const lastValidCharIndexRef = useRef(-1);

  const location = useLocation();
  const userId = location.state?.userId || localStorage.getItem("userId");
  const [request, setRequest] = useState<CreateAudioBookRequest>({
    documentGroupId: documentId,
    userId: userId,
    voiceId: voiceId,
    pages: [currentLeftPage, currentRightPage],
    settings: voiceSettings,
    text: "",
  });

  const hasPreGeneratedRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateIntervalRef = useRef<number | null>(null);
  const currentLeftPageRef = useRef(currentLeftPage);
  const currentRightPageRef = useRef(currentRightPage);
  const shouldContinuePlaying = useRef<boolean>(false);
  const previousCharIndexRef = useRef(-1);
  const isAutoAdvancingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }
      if (nextAudio) {
        nextAudio.pause();
        nextAudio.src = "";
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    currentLeftPageRef.current = currentLeftPage;
    currentRightPageRef.current = currentRightPage;
  }, [currentLeftPage, currentRightPage]);

  useEffect(() => {
    setHasPreGenerated(false);
    hasPreGeneratedRef.current = false;
  }, [currentLeftPage, currentRightPage]);

  useEffect(() => {
    if (previousCharIndexRef.current !== -1 && onHighlightText) {
      onHighlightText(previousCharIndexRef.current, false);
      previousCharIndexRef.current = -1;
      lastValidCharIndexRef.current = -1;
    }
  }, [currentAlignment, onHighlightText]);

  // Build a flat timing array ONCE when alignment loads
  const [timingData, setTimingData] = useState<
    Array<{
      startTime: number;
      endTime: number;
      charIndex: number;
    }>
  >([]);

  // This runs ONCE when alignment changes
  useEffect(() => {
    if (!currentAlignment) {
      setTimingData([]);
      return;
    }

    const data: Array<{
      startTime: number;
      endTime: number;
      charIndex: number;
    }> = [];
    let charCount = 0;

    for (const alignment of currentAlignment) {
      if (
        !alignment?.characters?.length ||
        !alignment.charactersStartTimesSeconds ||
        !alignment.charactersEndTimesSeconds
      ) {
        continue;
      }

      for (let i = 0; i < alignment.characters.length; i++) {
        const startTime = parseFloat(alignment.charactersStartTimesSeconds[i]);
        const endTime = parseFloat(alignment.charactersEndTimesSeconds[i]);

        if (!isNaN(startTime) && !isNaN(endTime)) {
          data.push({ startTime, endTime, charIndex: charCount });
        }
        charCount++;
      }
    }

    setTimingData(data);
  }, [currentAlignment]); // Only runs when alignment changes

  useEffect(() => {
    if (!isPlaying || timingData.length === 0) {
      if (previousCharIndexRef.current !== -1 && onHighlightText) {
        onHighlightText(previousCharIndexRef.current, false);
        previousCharIndexRef.current = -1;
      }
      return;
    }

    let charIndex = lastValidCharIndexRef.current;

    for (const timing of timingData) {
      if (currentTime >= timing.startTime && currentTime <= timing.endTime) {
        charIndex = timing.charIndex;
        break;
      }
      if (currentTime > timing.endTime) {
        lastValidCharIndexRef.current = timing.charIndex;
      }

      if (charIndex !== previousCharIndexRef.current) {
        if (previousCharIndexRef.current !== -1 && onHighlightText) {
          onHighlightText(previousCharIndexRef.current, false);
        }

        if (charIndex !== -1 && onHighlightText) {
          onHighlightText(charIndex, true);
        }

        previousCharIndexRef.current = charIndex;
      }
    }
  }, [currentTime, isPlaying, onHighlightText, timingData]);

  useEffect(() => {
    // Skip if this is an auto-advance from handleAudioEnd
    if (isAutoAdvancingRef.current) {
      isAutoAdvancingRef.current = false;
      return;
    }

    // This is a manual page change - check if audio was playing
    const wasPlaying = shouldContinuePlaying.current;

    // Clear highlighting from previous page
    if (previousCharIndexRef.current !== -1 && onHighlightText) {
      onHighlightText(previousCharIndexRef.current, false);
      previousCharIndexRef.current = -1;
      lastValidCharIndexRef.current = -1;
    }

    // Stop and clear current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      setCurrentAudio(null);
    }

    // Clear pre-generated audio
    if (nextAudio) {
      nextAudio.pause();
      nextAudio.src = "";
      setNextAudio(null);
    }

    // Reset states
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setHasPreGenerated(false);
    hasPreGeneratedRef.current = false;
    setCurrentAlignment(null);
    setNextAlignment(null);

    // If audio was playing before the manual navigation, generate and play audio for new pages
    if (wasPlaying) {
      const regenerateAndPlay = async () => {
        try {
          setIsLoading(true);
          shouldContinuePlaying.current = true;

          const text = await onGetPageText(currentLeftPage, currentRightPage);
          const audioRequest = {
            ...request,
            text,
            pages: [currentLeftPage, currentRightPage],
          };

          const response = await audioApi.createAudio(audioRequest);
          const audio = new Audio(response.audioUrl);
          audio.volume = volume;
          audio.playbackRate = playbackRate;

          setCurrentAudio(audio);
          setCurrentAlignment(response.alignment);
          audioRef.current = audio;

          audio.onloadedmetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
          };

          audio.ontimeupdate = () => {
            setCurrentTime(audio.currentTime);

            if (audio.duration && audio.currentTime / audio.duration > 0.6) {
              preGenerateNextPages();
            }
          };

          audio.onended = () => {
            handleAudioEnd();
          };

          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          console.error(
            "Error regenerating audio after manual navigation:",
            error
          );
          setIsLoading(false);
          shouldContinuePlaying.current = false;
          setIsPlaying(false);
        }
      };

      regenerateAndPlay();
    }
  }, [currentLeftPage, currentRightPage]);

  const generateAudio = async (): Promise<AudioWithAlignment> => {
    setIsLoading(true);
    try {
      const text = await getPageText(currentLeftPage, currentRightPage);
      const audioRequest = {
        ...request,
        text: text,
        pages: [currentLeftPage, currentRightPage],
      };

      const response = await audioApi.createAudio(audioRequest);
      return response;
    } catch (error) {
      console.error("Failed to generate audio:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const getPageText = async (
    leftPage: number,
    rightPage: number
  ): Promise<string> => {
    return await onGetPageText(leftPage, rightPage);
  };

  const handlePlay = async () => {
    try {
      if (!isPlaying && !currentAudio) {
        shouldContinuePlaying.current = true;
        const audioData = await generateAudio();

        const audio = new Audio(audioData.audioUrl);
        audio.volume = volume;
        audio.playbackRate = playbackRate;
        setCurrentAudio(audio);
        setCurrentAlignment(audioData.alignment);
        audioRef.current = audio;

        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
          setIsLoading(false);
        };

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);

          if (audio.duration && audio.currentTime / audio.duration > 0.6) {
            preGenerateNextPages();
          }
        };

        audio.onended = () => {
          handleAudioEnd();
        };

        await audio.play();
        setIsPlaying(true);
      } else if (currentAudio) {
        if (isPlaying) {
          currentAudio.pause();
          setIsPlaying(false);
          shouldContinuePlaying.current = false;
        } else {
          shouldContinuePlaying.current = true;
          await currentAudio.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsLoading(false);
      shouldContinuePlaying.current = false;
    }
  };

  const handleAudioEnd = async () => {
    // Clear highlighting from previous page
    if (previousCharIndexRef.current !== -1 && onHighlightText) {
      onHighlightText(previousCharIndexRef.current, false);
      previousCharIndexRef.current = -1;
      lastValidCharIndexRef.current = -1;
    }

    setCurrentTime(0);
    const nextLeftPage = currentLeftPageRef.current + 2;
    const nextRightPage = currentRightPageRef.current + 2;

    if (nextLeftPage <= totalPages) {
      isAutoAdvancingRef.current = true;
      onPageChange(nextLeftPage);

      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }

      try {
        let audio: HTMLAudioElement;
        let alignment: AlignmentData[];

        if (nextAudio && nextAlignment) {
          audio = nextAudio;
          audio.playbackRate = playbackRate;
          alignment = nextAlignment;
          setNextAudio(null);
          setNextAlignment(null);
          setDuration(audio.duration);
        } else {
          setIsLoading(true);
          const text = await onGetPageText(nextLeftPage, nextRightPage);

          const audioRequest = {
            ...request,
            text,
            pages: [nextLeftPage, nextRightPage],
          };

          const response = await audioApi.createAudio(audioRequest);
          audio = new Audio(response.audioUrl);
          alignment = response.alignment;
          audio.volume = volume;
          audio.playbackRate = playbackRate;

          audio.onloadedmetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
          };
        }

        setCurrentAudio(audio);
        setCurrentAlignment(alignment);
        setHasPreGenerated(false);

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);

          if (audio.duration && audio.currentTime / audio.duration > 0.6) {
            preGenerateNextPages();
          }
        };

        audio.onended = () => {
          handleAudioEnd();
        };

        if (shouldContinuePlaying.current) {
          await audio.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error("Error generating and playing audio:", error);
        setIsPlaying(false);
        setIsLoading(false);
        shouldContinuePlaying.current = false;
      }
    } else {
      setIsPlaying(false);
      shouldContinuePlaying.current = false;
    }
  };

  const handleStop = () => {
    shouldContinuePlaying.current = false;

    // Clear highlighting
    if (previousCharIndexRef.current !== -1 && onHighlightText) {
      onHighlightText(previousCharIndexRef.current, false);
      previousCharIndexRef.current = -1;
      lastValidCharIndexRef.current = -1;
    }

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }

    if (nextAudio) {
      nextAudio.pause();
      nextAudio.src = "";
      setNextAudio(null);
    }

    setHasPreGenerated(false);
    setCurrentAlignment(null);
  };

  const handleSeek = (newTime: number) => {
    if (currentAudio) {
      const wasPlaying = isPlaying;
      currentAudio.currentTime = newTime;
      setCurrentTime(newTime);

      if (wasPlaying) {
        currentAudio.play().catch((error) => {
          console.error("Error resuming playback after seek:", error);
        });
      }
    }
  };

  const handlePlaybackRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (currentAudio) {
      currentAudio.playbackRate = newRate;
    }
    if (nextAudio) {
      nextAudio.playbackRate = newRate;
    }
  };

  const handleSkipBackward = () => {
    if (currentAudio) {
      const newTime = Math.max(0, currentTime - 15);
      handleSeek(newTime);
    }
  };

  const handleSkipForward = () => {
    if (currentAudio) {
      const newTime = Math.min(duration, currentTime + 15);
      handleSeek(newTime);
    }
  };

  const preGenerateNextPages = async () => {
    if (hasPreGeneratedRef.current) return;
    hasPreGeneratedRef.current = true;

    if (hasPreGenerated) return;

    const nextLeftPage = currentLeftPageRef.current + 2;
    const nextRightPage = currentRightPageRef.current + 2;

    if (nextLeftPage <= totalPages) {
      hasPreGeneratedRef.current = true;
      setHasPreGenerated(true);

      try {
        const text = await onGetPageText(nextLeftPage, nextRightPage);

        const audioRequest = {
          ...request,
          text,
          pages: [nextLeftPage, nextRightPage],
        };

        const response = await audioApi.createAudio(audioRequest);

        const audio = new Audio(response.audioUrl);
        audio.volume = volume;
        audio.playbackRate = playbackRate;

        setNextAudio(audio);
        setNextAlignment(response.alignment);
      } catch (error) {
        console.error("Failed to pre-generate audio:", error);
        hasPreGeneratedRef.current = false;
        setHasPreGenerated(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed right-6 top-1/2 transform -translate-y-1/2 z-30 transition-all duration-300 ${
        isExpanded ? "w-80" : "w-20"
      }`}
    >
      <div className="bg-amber-50/95 backdrop-blur-xl rounded-2xl shadow-xl border border-amber-200/50 overflow-hidden">
        {!isExpanded && (
          <div className="flex flex-col items-center p-5 space-y-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shadow-sm">
              <svg
                className="w-6 h-6 text-amber-700"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.68 6.5,20.68C8.45,20.68 10.55,21.1 12,22C13.35,21.15 15.8,20.68 17.5,20.68C19.15,20.68 20.85,21.1 22.25,21.59C22.35,21.59 22.4,21.66 22.5,21.66C22.75,21.66 23,21.41 23,21.16V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,18.9 12,19.8C10.55,18.9 8.45,18.5 6.5,18.5C5.3,18.5 4.1,18.65 3,19V6.5C4.45,5.4 6.55,5 8.5,5H9V7H8.5C7.55,7 6.45,7.15 5.5,7.5V9C6.45,8.65 7.55,8.5 8.5,8.5S10.55,8.65 11.5,9V7.5C10.55,7.15 9.45,7 8.5,7H8V5H8.5C9.45,5 10.55,5.15 11.5,5.5V4C10.55,3.65 9.45,3.5 8.5,3.5C7.55,3.5 6.45,3.65 5.5,4V5.5C6.45,5.15 7.55,5 8.5,5H9Z" />
              </svg>
            </div>

            <div className="text-amber-800 text-xs font-mono bg-amber-100/50 px-2 py-1 rounded-lg">
              {formatTime(currentTime)}
            </div>

            {playbackRate !== 1 && (
              <div className="text-amber-800 text-xs font-bold bg-amber-200 px-2 py-1 rounded-lg">
                {playbackRate}x
              </div>
            )}

            <button
              onClick={handlePlay}
              disabled={isLoading}
              className="w-14 h-14 bg-amber-600 hover:bg-amber-700 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-50 hover:shadow-xl"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6,19H10V5H6V19ZM14,5V19H18V5H14Z" />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-white ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                </svg>
              )}
            </button>

            <div className="flex items-end space-x-1 h-6">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 bg-amber-500 rounded-full transition-all duration-300 ${
                    isPlaying ? "animate-pulse" : ""
                  }`}
                  style={{
                    height: isPlaying ? `${Math.random() * 16 + 8}px` : "6px",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => setIsExpanded(true)}
              className="w-10 h-10 bg-amber-200/50 hover:bg-amber-200 rounded-xl flex items-center justify-center transition-colors"
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
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                />
              </svg>
            </button>

            <button className="w-10 h-10 bg-amber-200/50 hover:bg-amber-200 rounded-xl flex items-center justify-center transition-colors">
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
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 bg-red-100/50 hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors"
            >
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {isExpanded && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <svg
                    className="w-7 h-7 text-amber-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.68 6.5,20.68C8.45,20.68 10.55,21.1 12,22C13.35,21.15 15.8,20.68 17.5,20.68C19.15,20.68 20.85,21.1 22.25,21.59C22.35,21.59 22.4,21.66 22.5,21.66C22.75,21.66 23,21.41 23,21.16V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,18.9 12,19.8C10.55,18.9 8.45,18.5 6.5,18.5C5.3,18.5 4.1,18.65 3,19V6.5C4.45,5.4 6.55,5 8.5,5H9V7H8.5C7.55,7 6.45,7.15 5.5,7.5V9C6.45,8.65 7.55,8.5 8.5,8.5S10.55,8.65 11.5,9V7.5C10.55,7.15 9.45,7 8.5,7H8V5H8.5C9.45,5 10.55,5.15 11.5,5.5V4C10.55,3.65 9.45,3.5 8.5,3.5C7.55,3.5 6.45,3.65 5.5,4V5.5C6.45,5.15 7.55,5 8.5,5H9Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-amber-900 font-semibold text-lg">
                    Audio Reading
                  </h3>
                  <p className="text-amber-700 text-sm">
                    Pages {currentLeftPage}–{currentRightPage}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 bg-amber-100 hover:bg-amber-200 rounded-xl flex items-center justify-center transition-colors"
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
                    d="M20 12H4"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs text-amber-700 mb-3">
                <span className="bg-amber-100/50 px-2 py-1 rounded">
                  {formatTime(currentTime)}
                </span>
                <span className="bg-amber-100/50 px-2 py-1 rounded">
                  {formatTime(duration)}
                </span>
              </div>
              <div
                className="w-full bg-amber-200/50 rounded-full h-3 cursor-pointer shadow-inner"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  const newTime = percentage * duration;
                  handleSeek(newTime);
                }}
              >
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                  style={{
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={handleSkipBackward}
                disabled={!currentAudio}
                className="w-14 h-12 bg-amber-200/50 hover:bg-amber-200 rounded-xl flex flex-col items-center justify-center transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5 text-amber-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.5,12L20,18V6M11,18V6L2.5,12L11,18Z" />
                </svg>
                <span className="text-xs text-amber-700 font-semibold">15</span>
              </button>

              <button
                onClick={handleStop}
                className="w-12 h-12 bg-amber-200/50 hover:bg-amber-200 rounded-xl flex items-center justify-center transition-colors"
              >
                <svg
                  className="w-6 h-6 text-amber-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18,18H6V6H18V18Z" />
                </svg>
              </button>

              <button
                onClick={handlePlay}
                disabled={isLoading}
                className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-2xl flex items-center justify-center transition-all shadow-lg disabled:opacity-50 hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isPlaying ? (
                  <svg
                    className="w-7 h-7 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6,19H10V5H6V19ZM14,5V19H18V5H14Z" />
                  </svg>
                ) : (
                  <svg
                    className="w-7 h-7 text-white ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleSkipForward}
                disabled={!currentAudio}
                className="w-14 h-12 bg-amber-200/50 hover:bg-amber-200 rounded-xl flex flex-col items-center justify-center transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5 text-amber-700"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M13,6V18L21.5,12M4,18L12.5,12L4,6V18Z" />
                </svg>
                <span className="text-xs text-amber-700 font-semibold">15</span>
              </button>
            </div>

            <div className="mb-6">
              <label className="text-amber-700 text-sm font-medium mb-2 block">
                Volume
              </label>
              <div className="flex items-center space-x-3">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                </svg>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                      if (currentAudio) {
                        currentAudio.volume = newVolume;
                      }
                    }}
                    className="w-full h-2 bg-amber-200/50 rounded-lg appearance-none cursor-pointer shadow-inner"
                    style={{
                      background: `linear-gradient(to right, #d97706 0%, #d97706 ${
                        volume * 100
                      }%, rgb(251 191 36 / 0.5) ${
                        volume * 100
                      }%, rgb(251 191 36 / 0.5) 100%)`,
                    }}
                  />
                </div>
                <span className="text-amber-700 text-sm min-w-[3rem]">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-amber-700 text-sm font-medium mb-2 block">
                Playback Speed
              </label>
              <div className="flex items-center space-x-3">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M13,2.03V2.05L13,4.05C17.39,4.59 20.5,8.58 19.96,12.97C19.5,16.61 16.64,19.5 13,19.93V21.93C18.5,21.38 22.5,16.5 21.95,11C21.5,6.25 17.73,2.5 13,2.03M11,2.06C9.05,2.25 7.19,3 5.67,4.26L7.1,5.74C8.22,4.84 9.57,4.26 11,4.06V2.06M4.26,5.67C3,7.19 2.25,9.04 2.05,11H4.05C4.24,9.58 4.8,8.23 5.69,7.1L4.26,5.67M2.06,13C2.26,14.96 3.03,16.81 4.27,18.33L5.69,16.9C4.81,15.77 4.24,14.42 4.06,13H2.06M7.1,18.37L5.67,19.74C7.18,21 9.04,21.79 11,22V20C9.58,19.82 8.23,19.25 7.1,18.37M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                </svg>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.01"
                    value={playbackRate}
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value);
                      handlePlaybackRateChange(newRate);
                    }}
                    className="w-full h-2 bg-amber-200/50 rounded-lg appearance-none cursor-pointer shadow-inner"
                    style={{
                      background: `linear-gradient(to right, #d97706 0%, #d97706 ${
                        ((playbackRate - 0.5) / 1.5) * 100
                      }%, rgb(251 191 36 / 0.5) ${
                        ((playbackRate - 0.5) / 1.5) * 100
                      }%, rgb(251 191 36 / 0.5) 100%)`,
                    }}
                  />
                </div>
                <span className="text-amber-700 text-sm min-w-[3rem]">
                  {playbackRate}x
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-red-100/50 hover:bg-red-100 text-red-700 rounded-xl py-3 transition-colors flex items-center justify-center space-x-2 border border-red-200/50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="font-medium">Close Reader</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
