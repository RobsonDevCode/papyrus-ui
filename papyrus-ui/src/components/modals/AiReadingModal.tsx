import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import type { VoiceRequest } from "../../services/models/VoiceRequest";
import type { Voice } from "../../services/models/Voice";
import type { VoiceSettings } from "../../services/models/VoiceSettings";
import { voiceRetrievalApi } from "../../services/VoiceRetrievalService";
import type { Paginiation } from "../../services/models/Pagination";
import Dropdown from "../common/Dropdown";
import type { SetUpAudioSettingsRequest } from "../../services/models/SetUpAudioSettingsRequest";
import { useLocation } from "react-router-dom";
import type { AudioSettings } from "../../services/models/AudioSettings";


interface AIReadingModalProps {
  isOpen: boolean;
  userAudioSettings: AudioSettings | undefined;
  onClose: () => void;
  onSave: (config: SetUpAudioSettingsRequest) => void;
  documentId: string;
}

interface CategoryOption {
  value: string;
  label: string;
}

const AIReadingModal: React.FC<AIReadingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  documentId,
  userAudioSettings,
}) => {
  // Determine if we're in edit mode
  const isEditMode = !!userAudioSettings;
  const [isEditingVoice, setIsEditingVoice] = useState<boolean>(false);

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
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [pagination, setPagination] = useState<Paginiation>();

  const [filter, setFilter] = useState<VoiceRequest>({
    page: 1,
    size: 15,
    searchTerm: "",
    accent: undefined,
    useCase: undefined,
    gender: undefined
  });

  const searchTerm = filter.searchTerm || "";
  const selectedCategory = filter.useCase || "all";
  const selectedAccent = filter.accent || "all";
  const selectedGender = filter.gender || "all";
   
  const location = useLocation();
  const userId = location.state?.userId || localStorage.getItem('userId');

  const formatCategoryName = (category: string): string => {
    if (category === "all") return "All Categories";
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const categories: CategoryOption[] = [
    { value: "all", label: "All Categories" },
    { value: "informative_educational", label: formatCategoryName("informative_educational") },
    { value: "conversational", label: formatCategoryName("conversational") },
    { value: "news", label: formatCategoryName("news") },
    { value: "characters_animation", label: formatCategoryName("characters_animation") },
    { value: "narration", label: formatCategoryName("narration") },
    { value: "characters", label: formatCategoryName("characters") },
    { value: "entertainment_tv", label: formatCategoryName("entertainment_tv") },
    { value: "social_media", label: formatCategoryName("social_media") },
    { value: "narrative_story", label: formatCategoryName("narrative_story") }
  ];

  const accents: CategoryOption[] = [
    { value: "all", label: "All Accents" },
    { value: "american", label: "American" },
    { value: "british", label: "British" },
    { value: "australian", label: "Australian" },
    { value: "canadian", label: "Canadian" },
    { value: "indian", label: "Indian" }
  ];

  const genders: CategoryOption[] = [
    { value: "all", label: "All Genders" },
    { value: "male", label: "Male" },
    { value: "female", label: "Female" }
  ];

  const fetchVoicesWithFilters = async (newFilter: VoiceRequest) => {
    try {
      const cleanFilter: VoiceRequest = {
        page: newFilter.page,
        size: newFilter.size,
        ...(newFilter.searchTerm && newFilter.searchTerm.trim() !== "" && { searchTerm: newFilter.searchTerm.trim() }),
        ...(newFilter.useCase && newFilter.useCase !== "all" && { useCase: newFilter.useCase }),
        ...(newFilter.accent && newFilter.accent !== "all" && { accent: newFilter.accent }),
        ...(newFilter.gender && newFilter.gender !== "all" && { gender: newFilter.gender })
      };

      const response = await voiceRetrievalApi.getVoices(cleanFilter);
      setVoices(response.items);
      setPagination(response.pagination);
      setFilter(newFilter);
    } catch (error) {
      console.error("Failed to fetch voices:", error);
    }
  };

  const handleSearchChange = (value: string) => {
    const newFilter = { ...filter, searchTerm: value, page: 1 };
    fetchVoicesWithFilters(newFilter);
  };

  const handleCategoryChange = (value: string) => {
    const newFilter = { 
      ...filter, 
      useCase: value === "all" ? undefined : value, 
      page: 1 
    };
    fetchVoicesWithFilters(newFilter);
  };

  const handleAccentChange = (value: string) => {
    const newFilter = { 
      ...filter, 
      accent: value === "all" ? undefined : value, 
      page: 1 
    };
    fetchVoicesWithFilters(newFilter);
  };

  const handleGenderChange = (value: string) => {
    const newFilter = { 
      ...filter, 
      gender: value === "all" ? undefined : value, 
      page: 1 
    };
    fetchVoicesWithFilters(newFilter);
  };

  const goToNextPage = async () => {
    if (!pagination || pagination.page >= pagination.total) return;
    const newFilter = { ...filter, page: pagination.page + 1 };
    fetchVoicesWithFilters(newFilter);
  };

  const goToPreviousPage = async () => {
    if (!pagination || pagination.page <= 1) return;
    const newFilter = { ...filter, page: pagination.page - 1 };
    fetchVoicesWithFilters(newFilter);
  };

  useEffect(() => {
    if (isOpen) {
      fetchVoicesWithFilters(filter);
      
      // Initialize with existing settings in edit mode
      if (isEditMode && userAudioSettings) {
        setSelectedVoiceId(userAudioSettings.voiceId);
        setVoiceSettings({
          stability: userAudioSettings.voiceSettings.stability,
          useSpeakerBoost: userAudioSettings.voiceSettings.useSpeakerBoost,
          speed: userAudioSettings.voiceSettings.speed,
        });
      } else {
        // In setup mode, use default voice if available
        const defaultVoice = voices.find((voice) => voice.isSelected);
        if (defaultVoice) {
          setSelectedVoiceId(defaultVoice.voiceId);
          if (defaultVoice.settings) {
            setVoiceSettings(defaultVoice.settings);
          }
        }
      }
    }
  }, [isOpen, isEditMode, userAudioSettings]);

  useEffect(() => {
    const selectedVoice = voices.find(
      (voice) => voice.voiceId === selectedVoiceId
    );
    if (selectedVoice && selectedVoice.settings) {
      setVoiceSettings(selectedVoice.settings);
    }
  }, [selectedVoiceId]);

  const sortedVoices = voices.sort((a, b) => {
    if (a.isFavorited && !b.isFavorited) return -1;
    if (!a.isFavorited && b.isFavorited) return 1;
    return a.name.localeCompare(b.name);
  });

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

  const handleSave = () => {
    if (!selectedVoiceId) {
      alert("Please select a voice");
      return;
    }

    const config: SetUpAudioSettingsRequest = {
      id: documentId,
      userId: userId,
      voiceId: selectedVoiceId,
      voiceSettings: voiceSettings,
    };

    onSave(config);
    onClose();
  };

  const handleDeselectVoice = () => {
    setSelectedVoiceId("");
    // Reset voice settings to defaults
    setVoiceSettings({
      stability: 0.75,
      useSpeakerBoost: true,
      speed: 1.0,
    });
  };

  const handleVoiceClick = (voiceId: string) => {
    if (selectedVoiceId === voiceId) {
      handleDeselectVoice();
    } else {
      setSelectedVoiceId(voiceId);
    }
  };

  const handleClose = () => {
    if (currentAudio) {
      currentAudio.pause();
      setPlayingVoiceId(null);
    }
    
    // Reset filters to initial state
    const resetFilter: VoiceRequest = {
      page: 1,
      size: 15,
      searchTerm: "",
      accent: undefined,
      useCase: undefined,
      gender: undefined
    };
    setFilter(resetFilter);
    setShowFavoritesOnly(false);
    setIsEditingVoice(false);
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
              🎙️ {isEditMode ? "Edit Audio Settings" : "AI Reading Setup"}
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
            {isEditMode 
              ? "Update your voice and playback preferences" 
              : "Choose a voice and adjust settings for AI narration"
            }
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
                        <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-amber-700"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                          </svg>
                        </div>
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
                      <div className="flex items-center gap-2">
                        {/* Preview Button */}
                        <Button
                          variant={playingVoiceId === currentVoice.voiceId ? 'preview-active' : 'preview'}
                          size="sm"
                          onClick={() => handlePreviewVoice(currentVoice)}
                          disabled={playingVoiceId === currentVoice.voiceId}
                          className="flex items-center gap-2 px-3 py-1.5"
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
                        </Button>
                        
                        {/* Edit/Remove Button */}
                        {isEditMode ? (
                          <Button
                            onClick={() => setIsEditingVoice(true)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                            variant="secondary"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Edit
                          </Button>
                        ) : (
                          <button
                            onClick={handleDeselectVoice}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600 hover:text-red-700"
                            title="Remove selection"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
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

          {/* Voice Selection - Only show in setup mode or when editing in edit mode */}
          {(!isEditMode || isEditingVoice) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {isEditMode ? "Change Voice" : "Select Voice"}
              </h3>
              {isEditMode && (
                <Button
                  variant="primary"
                  onClick={() => setIsEditingVoice(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search voices..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
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

              {/* Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Category Filter */}
                <Dropdown
                  options={categories}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  placeholder="Select Category"
                  icon={
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
                        d="M7 7h.01M7 3h5c1.1 0 2 .9 2 2v1M7 7c0 1.1.9 2 2 2h1M7 7H3c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-5"
                      />
                    </svg>
                  }
                />

                {/* Accent Filter */}
                <Dropdown
                  options={accents}
                  value={selectedAccent}
                  onChange={handleAccentChange}
                  placeholder="Select Accent"
                  icon={
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
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                />

                {/* Gender Filter */}
                <Dropdown
                  options={genders}
                  value={selectedGender}
                  onChange={handleGenderChange}
                  placeholder="Select Gender"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />

                {/* Favorites Toggle */}
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
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

              {/* Active Filters Display */}
              <div className="flex flex-wrap gap-2">
                {selectedCategory !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                    Category: {categories.find(c => c.value === selectedCategory)?.label}
                    <button onClick={() => handleCategoryChange("all")} className="ml-1 hover:text-amber-900">
                      ×
                    </button>
                  </span>
                )}
                {selectedAccent !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    Accent: {accents.find(a => a.value === selectedAccent)?.label}
                    <button onClick={() => handleAccentChange("all")} className="ml-1 hover:text-blue-900">
                      ×
                    </button>
                  </span>
                )}
                {selectedGender !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Gender: {genders.find(g => g.value === selectedGender)?.label}
                    <button onClick={() => handleGenderChange("all")} className="ml-1 hover:text-green-900">
                      ×
                    </button>
                  </span>
                )}
                {showFavoritesOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    Favorites Only
                    <button onClick={() => setShowFavoritesOnly(false)} className="ml-1 hover:text-yellow-900">
                      ×
                    </button>
                  </span>
                )}
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
                      onClick={() => handleVoiceClick(voice.voiceId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
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
                                {voice.isSelected && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full shrink-0">
                                    Default
                                  </span>
                                )}
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
                        <Button
                          variant={playingVoiceId === voice.voiceId ? 'preview-active' : 'preview-light'}
                          size="sm"
                          onClick={() =>
                            handlePreviewVoice(voice)
                          }
                          disabled={playingVoiceId === voice.voiceId}
                          className="ml-4 flex items-center gap-1.5 shrink-0 px-3 py-1.5"
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
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {(() => {
              if (!pagination) return null;
              
              // Calculate total pages from total items
              const totalPages = Math.ceil(pagination.total / pagination.size);
              
              // Only show pagination if there's more than 1 page
              if (totalPages <= 1) return null;
              
              return (
                <div className="flex items-center justify-between mt-4 px-2 py-3 bg-gray-50/50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">
                    Page {pagination.page} of {totalPages}
                    <span className="ml-2 text-xs text-gray-500">
                      ({pagination.total} total items, {pagination.size} per page)
                    </span>
                  </div>
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
                      disabled={pagination.page >= totalPages}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        pagination.page >= totalPages
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
              );
            })()}
          </div>
          )}

          {/* Voice Settings */}
          <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {isEditMode ? "Update Voice Settings" : "Voice Settings"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Variable</span>
                  <span>Stable</span>
                </div>
              </div>
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-50"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5x</span>
                  <span>2x</span>
                </div>
              </div>
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
            {isEditMode ? "Update Settings" : "Start AI Reading"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIReadingModal;