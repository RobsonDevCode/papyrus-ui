import React from "react";
import Button from "../components/common/Button";
import Navbar from "../components/common/Navigation";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Navigation */}
      <Navbar
        rightContent={
          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" to="/">
              Home
            </Button>
            <Button variant="primary" size="sm" to="/dashboard">
              Get Started
            </Button>
          </div>
        }
      />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="inline-flex items-center bg-white/40 backdrop-blur-sm border border-amber-200/50 rounded-full px-4 py-2 mb-8">
            <span className="text-amber-800 text-sm font-medium">
              ✨ Transform your PDF reading experience
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-amber-950 mb-6 pb-4">
            Your Personal
            <span className="block text-transparent bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text pb-4">
              Ai Powered Library
            </span>
          </h1>

          <p className="text-xl text-amber-800/80 mb-12 max-w-2xl mx-auto leading-relaxed">
            Upload, organize and read your PDF books and let AI read it aloud
            while you or papyrus takes notes in a beautiful, distraction-free
            environment. Transform your documents into an interactive audiobook
            experience with key insights captured for you. Perfect for students,
            professionals, and anyone who learns better by listening.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button variant="primary" size="lg" to="/upload">
              Upload Your First Book
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-8 border border-amber-200/30 hover:bg-white/40 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">📤</div>
              <h3 className="text-xl font-semibold text-amber-900 mb-3">
                Easy Upload
              </h3>
              <p className="text-amber-700">
                Drag and drop your PDF files. We'll handle the rest with
                lightning-fast processing.
              </p>
            </div>

            <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-8 border border-amber-200/30 hover:bg-white/40 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">📖</div>
              <h3 className="text-xl font-semibold text-amber-900 mb-3">
                Beautiful Reading
              </h3>
              <p className="text-amber-700">
                Clean, focused reading experience with customizable themes and
                layouts.
              </p>
            </div>

            <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-8 border border-amber-200/30 hover:bg-white/40 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">🗂️</div>
              <h3 className="text-xl font-semibold text-amber-900 mb-3">
                Smart Organization
              </h3>
              <p className="text-amber-700">
                Automatically organize your library with tags, search, and
                collections.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom CTA */}
      <section className="w-full bg-gradient-to-r from-amber-800/90 to-orange-800/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your reading?
          </h2>
          <p className="text-amber-100 mb-8 text-lg">
            Join thousands of readers who've upgraded their PDF experience.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="!bg-white !hover:bg-gray-100 !text-amber-900"
          >
            Start Reading Today
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
