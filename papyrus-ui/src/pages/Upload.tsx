import React, { useState, useCallback } from "react";
import Button from "../components/common/Button";
import Navbar from "../components/common/Navigation";

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  uploadProgress: number;
  uploadedFile: File | null;
  error: string | null;
}

const Upload: React.FC = () => {

  const fileSizeLimit = 50 * 1024 * 1024 //50 mb
   const [uploadState, setUploadState] = useState<UploadState>({
    isDragging: false,
    isUploading: false,
    uploadProgress: 0,
    uploadedFile: null,
    error: null,
  });

  const validateFile = (file: File): string | null => {
    if(file.type != `application/pdf`) {
        return 'Please upload a pdf file only.';
    }

    if(file.size > fileSizeLimit){
        return 'File size must be less than 50mb';
    }

    return null;
  } 

   const uploadFile = async (file: File) => {
    setUploadState(prev => ({ 
      ...prev, 
      isUploading: true, 
      uploadProgress: 0,
      error: null 
    }));

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadState(prev => ({ ...prev, uploadProgress: progress }));
    }

    // Complete upload
    setUploadState(prev => ({ 
      ...prev, 
      isUploading: false, 
      uploadedFile: file 
    }));
  };

  // Handle file selection
  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadState(prev => ({ ...prev, error }));
      return;
    }
    uploadFile(file);
  }, []);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragging: false }));
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  // File input handler
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const resetUpload = () => {
    setUploadState({
      isDragging: false,
      isUploading: false,
      uploadProgress: 0,
      uploadedFile: null,
      error: null,
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Navigation */}
       <Navbar rightContent ={
        <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" to="/">
                Home
            </Button>
            <Button variant="primary" size="sm" to="/login">
              Login
            </Button>
        </div>
       }/>

      {/* Main Upload Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-amber-950 mb-4">
            Upload Your PDF Book
          </h1>
          <p className="text-xl text-amber-800/80 max-w-2xl mx-auto">
            Drag and drop your PDF file below, or click to browse. We'll prepare it for the best reading experience.
          </p>
        </div>

        {/* Upload Area */}
        <div className="mb-8">
          {uploadState.uploadedFile ? (
            // Success State
            <div className="bg-white/40 backdrop-blur-sm border-2 border-green-300 border-dashed rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-semibold text-green-800 mb-2">Upload Successful!</h3>
              <p className="text-green-700 mb-4">
                <span className="font-medium">{uploadState.uploadedFile.name}</span> is ready to read
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="primary" size="lg">
                  Start Reading
                </Button>
                <Button variant="secondary" size="lg" onClick={resetUpload}>
                  Upload Another
                </Button>
              </div>
            </div>
          ) : uploadState.isUploading ? (
            // Loading State
            <div className="bg-white/40 backdrop-blur-sm border-2 border-amber-300 border-dashed rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📤</div>
              <h3 className="text-2xl font-semibold text-amber-900 mb-4">Uploading...</h3>
              <div className="w-full max-w-md mx-auto bg-amber-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-amber-700">{uploadState.uploadProgress}% complete</p>
            </div>
          ) : (
            // Upload State
            <div
              className={`bg-white/40 backdrop-blur-sm border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer hover:bg-white/50 ${
                uploadState.isDragging
                  ? 'border-amber-400 bg-amber-50/50 scale-105'
                  : 'border-amber-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="text-6xl mb-4">
                {uploadState.isDragging ? '⬇️' : '📁'}
              </div>
              <h3 className="text-2xl font-semibold text-amber-900 mb-2">
                {uploadState.isDragging ? 'Drop your PDF here' : 'Choose or drag your PDF'}
              </h3>
              <p className="text-amber-700 mb-6">
                Drag and drop your PDF file here, or click to browse
              </p>
              
              {/* Hidden File Input */}
              <input
                id="file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInput}
                className="hidden"
              />
              
              <Button variant="primary" size="lg">
                Browse Files
              </Button>
              
              <div className="mt-6 text-sm text-amber-600">
                <p>Supported: PDF files up to 50MB</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {uploadState.error && (
            <div className="mt-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-lg p-4 text-center">
              <div className="text-red-600 font-medium">❌ {uploadState.error}</div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-amber-200/30">
            <h3 className="text-xl font-semibold text-amber-900 mb-3">📖 Supported Formats</h3>
            <p className="text-amber-700">
              Currently we support PDF files. More formats like EPUB and MOBI coming soon!
            </p>
          </div>
          
          <div className="bg-white/30 backdrop-blur-sm rounded-xl p-6 border border-amber-200/30">
            <h3 className="text-xl font-semibold text-amber-900 mb-3">🔒 Privacy First</h3>
            <p className="text-amber-700">
              Your books are stored securely and privately. Only you can access your personal library.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Upload;
