import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import type { VoiceRequest } from "../../services/models/VoiceRequest";
import type { Voice } from "../../services/models/Voice";
import type { VoiceSettings } from "../../services/models/VoiceSettings";
import { voiceRetrievalApi } from "../../services/VoiceRetrievalService";
import type { VoiceResponse } from "../../services/models/VoiceResponse";
import type { Paginiation } from "../../services/models/Pagination";

export interface AIReadingRequest {
  id: string;
  voiceId: string;
  voiceSettings: VoiceSettings;
}

interface AIReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AIReadingRequest) => void;
  documentId: string;
}

const AIReadingModal: React.FC<AIReadingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  documentId,
}) => {
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.75,
    useSpeakerBoost: true,
    speed: 1.0,
  });
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [pagination, setPagination] = useState<Paginiation>();

  const [filter, setFilter] = useState<VoiceRequest>({
    page: 1,
    size: 15
  });

  const fetchVoices = async (request: VoiceRequest): Promise<VoiceResponse> => {
    try {
      const response = await voiceRetrievalApi.getVoices(request);
      return response;
    } catch {
      throw new Error("Failed to get voices");
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const response = await fetchVoices(filter);
      setVoices(response.items);
      setPagination(response.pagination);
    };

    initialize();

    if (isOpen) {
      const defaultVoice = voices.find((voice) => voice.isSelected);
      if (defaultVoice) {
        setSelectedVoiceId(defaultVoice.voiceId);
        if (defaultVoice.settings) {
          setVoiceSettings(defaultVoice.settings);
        }
      }
    }
  }, [isOpen]);

  // Update settings when a new voice is selected (if it has default settings)
  useEffect(() => {
    const selectedVoice = voices.find(
      (voice) => voice.voiceId === selectedVoiceId
    );
    if (selectedVoice && selectedVoice.settings) {
      setVoiceSettings(selectedVoice.settings);
    }
  }, [selectedVoiceId]);

  // Get unique categories
  const categories = [
    "all",
    ...new Set(voices.map((voice) => voice.category).filter(Boolean)),
  ];

  // Filter voices based on search, category, and favorites
  const filteredVoices = voices.filter((voice) => {
    const matchesSearch =
      voice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voice.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || voice.category === selectedCategory;
    const matchesFavorites = !showFavoritesOnly || voice.isFavorited;
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  // Sort voices: favorites first, then by name
  const sortedVoices = filteredVoices.sort((a, b) => {
    if (a.isFavorited && !b.isFavorited) return -1;
    if (!a.isFavorited && b.isFavorited) return 1;
    return a.name.localeCompare(b.name);
  });

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }
    };
  }, [currentAudio]);

const handlePreviewVoice = async (voice: Voice) => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.src = "";
    setCurrentAudio(null);
    setPlayingVoiceId(null);
  }

  if (playingVoiceId === voice.voiceId) {
    setPlayingVoiceId(null);
    return;
  }

  try {
    setPlayingVoiceId(voice.voiceId);
    const audio = new Audio(voice.previewUrl);
    setCurrentAudio(audio);
    
    audio.onended = () => {
      setPlayingVoiceId(null);
      audio.onended = null;
      audio.onerror = null;
      setCurrentAudio(null);
    };
    
    audio.onerror = (e) => {
      setPlayingVoiceId(null);
      audio.onended = null;
      audio.onerror = null;
      setCurrentAudio(null);
      console.error(`Failed to play preview for ${voice.name}`);
    };
    
    await audio.play();
    
  } catch (error) {
    console.error("Error playing voice preview:", error);
    setPlayingVoiceId(null);
    setCurrentAudio(null);
  }
};

  const goToNextPage = async () => {
    if(!pagination){
      return;
    }
    const nextPage = pagination.page + 1;
    if(nextPage <= pagination.total){
       const newFilter: VoiceRequest = {
           page: nextPage,
           size: pagination.size,
       };
       setFilter(newFilter);
       const response = await voiceRetrievalApi.getVoices(newFilter);
       setVoices(response.items);
       setPagination(response.pagination);
    }
  }

  const goToPreviousPage = async () => {
     if(!pagination){
      return;
    }
     if(pagination.page > 1){
       const newFilter: VoiceRequest = {
           page: pagination.page - 1,
           size: pagination.size,
       };
       setFilter(newFilter);
       const response = await voiceRetrievalApi.getVoices(newFilter);
       setVoices(response.items);
       setPagination(response.pagination);
     }
  }


  const handleSave = () => {
    if (!selectedVoiceId) {
      alert("Please select a voice");
      return;
    }

    const config: AIReadingRequest = {
      id: documentId,
      voiceId: selectedVoiceId,
      voiceSettings: voiceSettings,
    };

    onSave(config);
    onClose();
  };

  const handleClose = () => {
    // Stop any playing audio
    if (currentAudio) {
      currentAudio.pause();
      setPlayingVoiceId(null);
    }
    // Reset filters
    setSearchTerm("");
    setSelectedCategory("all");
    setShowFavoritesOnly(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-6 py-4 border-b border-amber-200/50">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              🎙️ AI Reading Setup
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-amber-700 hover:text-amber-900"
            >
              <svg
                className="w-6 h-6"
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
          <p className="text-amber-700 mt-1">
            Choose a voice and adjust settings for AI narration
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Current Selection */}
          {selectedVoiceId && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Current Selection
              </h3>
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
                {(() => {
                  const currentVoice = voices.find(
                    (v) => v.voiceId === selectedVoiceId
                  );
                  return currentVoice ? (
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Voice Avatar/Icon */}
                        <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-amber-700"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                          </svg>
                        </div>

                        {/* Voice Details */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {currentVoice.isFavorited && (
                              <svg
                                className="w-4 h-4 text-amber-500"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                            <h4 className="font-semibold text-amber-900">
                              {currentVoice.name}
                            </h4>
                            {currentVoice.category && (
                              <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">
                                {currentVoice.category}
                              </span>
                            )}
                          </div>
                          {currentVoice.description && (
                            <p className="text-sm text-amber-700 mb-2">
                              {currentVoice.description}
                            </p>
                          )}

                          {/* Current Settings */}
                          <div className="flex items-center gap-4 text-xs text-amber-600">
                            <span>
                              Stability: {voiceSettings.stability.toFixed(2)}
                            </span>
                            <span>
                              Speed: {voiceSettings.speed.toFixed(1)}x
                            </span>
                            <span>
                              Boost:{" "}
                              {voiceSettings.useSpeakerBoost ? "On" : "Off"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Preview for Current */}
                      <button
                        onClick={() => handlePreviewVoice(currentVoice)}
                        disabled={playingVoiceId === currentVoice.voiceId}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          playingVoiceId === currentVoice.voiceId
                            ? "bg-green-100 text-green-700 cursor-not-allowed"
                            : "bg-amber-200 hover:bg-amber-300 text-amber-800"
                        }`}
                      >
                        {playingVoiceId === currentVoice.voiceId ? (
                          <>
                            <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            Playing
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Preview
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-amber-700">
                      <p className="font-medium">No voice currently selected</p>
                      <p className="text-sm">
                        Choose a voice from the list below
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Voice Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Select Voice
            </h3>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search voices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/80"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/80"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Favorites Toggle */}
              <div className="flex items-center">
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    showFavoritesOnly
                      ? "bg-amber-100 border-amber-300 text-amber-700"
                      : "bg-white/80 border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill={showFavoritesOnly ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Favorites</span>
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-600 mb-3 flex items-center justify-between">
              <span>
                {sortedVoices.length} voice
                {sortedVoices.length !== 1 ? "s" : ""} found
                {showFavoritesOnly && " in favorites"}
              </span>
              {sortedVoices.filter((v) => v.isFavorited).length > 0 &&
                !showFavoritesOnly && (
                  <span className="text-amber-600 text-xs">
                    ⭐ {sortedVoices.filter((v) => v.isFavorited).length}{" "}
                    favorite
                    {sortedVoices.filter((v) => v.isFavorited).length !== 1
                      ? "s"
                      : ""}
                  </span>
                )}
            </div>

            {/* Voice List */}
            <div className="bg-white/60 rounded-xl border border-gray-200 max-h-80 overflow-y-auto">
              {sortedVoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.513-.951-6.077-2.473l-.096-.097M12 21a9 9 0 11-8.862-2.501"
                    />
                  </svg>
                  <p className="text-lg font-medium mb-1">No voices found</p>
                  <p className="text-sm">
                    {showFavoritesOnly
                      ? "No favorite voices match your current filters"
                      : "Try adjusting your search or category filter"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {sortedVoices.map((voice, index) => (
                    <div
                      key={voice.voiceId}
                      className={`p-4 hover:bg-amber-50/50 cursor-pointer transition-all duration-200 ${
                        selectedVoiceId === voice.voiceId
                          ? "bg-amber-50 border-l-4 border-amber-400"
                          : "hover:border-l-4 hover:border-amber-200"
                      } ${index === 0 ? "rounded-t-xl" : ""} ${
                        index === sortedVoices.length - 1 ? "rounded-b-xl" : ""
                      }`}
                      onClick={() => setSelectedVoiceId(voice.voiceId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            {/* Selection Indicator */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                selectedVoiceId === voice.voiceId
                                  ? "border-amber-400 bg-amber-400"
                                  : "border-gray-300 group-hover:border-amber-300"
                              }`}
                            >
                              {selectedVoiceId === voice.voiceId && (
                                <svg
                                  className="w-2.5 h-2.5 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>

                            {/* Voice Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {/* Favorite Star */}
                                {voice.isFavorited && (
                                  <svg
                                    className="w-4 h-4 text-amber-500"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                )}

                                <h4 className="font-semibold text-gray-900 truncate">
                                  {voice.name}
                                </h4>

                                {/* Default Voice Indicator */}
                                {voice.isSelected && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full shrink-0">
                                    Default
                                  </span>
                                )}

                                {/* Category Badge */}
                                {voice.category && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">
                                    {voice.category}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mb-1">
                                {voice.description && (
                                  <p className="text-sm text-gray-600 truncate flex-1">
                                    {voice.description}
                                  </p>
                                )}
                              </div>

                              {/* Labels (Accent, Gender, Age) */}
                              {voice.labels && (
                                <div className="flex gap-1 mt-1">
                                  {voice.labels.accent && (
                                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                                      {voice.labels.accent}
                                    </span>
                                  )}
                                  {voice.labels.gender && (
                                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">
                                      {voice.labels.gender}
                                    </span>
                                  )}
                                  {voice.labels.age && (
                                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-600 rounded">
                                      {voice.labels.age}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Preview Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewVoice(voice);
                          }}
                          disabled={playingVoiceId === voice.voiceId}
                          className={`ml-4 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                            playingVoiceId === voice.voiceId
                              ? "bg-green-100 text-green-700 cursor-not-allowed"
                              : "bg-amber-100 hover:bg-amber-200 text-amber-700"
                          }`}
                        >
                          {playingVoiceId === voice.voiceId ? (
                            <>
                              <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              <span className="hidden sm:inline">Playing</span>
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span className="hidden sm:inline">Preview</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {/* Show pagination if we have more than one page OR if we're not on the first page */}
            {(pagination && pagination.total > 1) && (
              <div className="flex items-center justify-between mt-4 px-2 py-3 bg-gray-50/50 rounded-lg border border-gray-200">
                {/* Page Info */}
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.total} 
                  {pagination.size && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({pagination.size} per page)
                    </span>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousPage}
                    disabled={pagination.page <= 1}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      pagination.page <= 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-amber-100 hover:bg-amber-200 text-amber-700 hover:shadow-md"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </button>

                  <button
                    onClick={goToNextPage}
                    disabled={pagination.page >= pagination.total}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      pagination.page >= pagination.total
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-amber-100 hover:bg-amber-200 text-amber-700 hover:shadow-md"
                    }`}
                  >
                    Next
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Voice Settings */}
          <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Voice Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stability: {voiceSettings.stability.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={voiceSettings.stability}
                  onChange={(e) =>
                    setVoiceSettings((prev) => ({
                      ...prev,
                      stability: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50
                    [&::-webkit-slider-track]:bg-gray-200 [&::-webkit-slider-track]:h-2 [&::-webkit-slider-track]:rounded-lg
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer 
                    [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-amber-500 
                    [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-track]:bg-gray-200 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-lg [&::-moz-range-track]:border-none
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Variable</span>
                  <span>Stable</span>
                </div>
              </div>

              {/* Speed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speed: {voiceSettings.speed.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={voiceSettings.speed}
                  onChange={(e) =>
                    setVoiceSettings((prev) => ({
                      ...prev,
                      speed: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50
                    [&::-webkit-slider-track]:bg-gray-200 [&::-webkit-slider-track]:h-2 [&::-webkit-slider-track]:rounded-lg
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer 
                    [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:bg-amber-500 
                    [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-track]:bg-gray-200 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-lg [&::-moz-range-track]:border-none
                    [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x</span>
                  <span>2x</span>
                </div>
              </div>

              {/* Speaker Boost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Enhancement
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceSettings.useSpeakerBoost}
                    onChange={(e) =>
                      setVoiceSettings((prev) => ({
                        ...prev,
                        useSpeakerBoost: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Speaker Boost</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Enhances clarity and volume
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} className="px-6">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!selectedVoiceId}
            className="px-6"
          >
            Start AI Reading
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIReadingModal;