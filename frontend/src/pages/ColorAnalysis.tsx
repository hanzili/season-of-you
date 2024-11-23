import React, { useCallback, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import cv from '@techstark/opencv-js';
import ColorReport from '../components/ColorReport';
import ImageUploader from '../components/ImageUploader';
import AnalysisProgress from '../components/AnalysisProgress';
import { analyzeImageColors } from '../utils/colorAnalysis';

// Mock data for seasonal colors
const seasonalColors = {
  Spring: {
    colors: ["#FF9AA2", "#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA"],
    undertone: "Warm",
    description: "As a Spring, you shine in warm, clear colors with golden undertones. Your best colors are coral, peach, golden yellow, and warm green. Your natural coloring has a warm, clear quality that is enhanced by similarly clear and warm colors."
  },
  Summer: {
    colors: ["#AFC1D6", "#D5A6BD", "#B8D8D8", "#D6BDA4", "#9A8B4F", "#8E9B90"],
    undertone: "Cool",
    description: "As a Summer, you look radiant in soft, cool colors with blue undertones. Your optimal colors include soft pink, powder blue, sage green, and mauve. Your natural coloring has a subtle, cool quality that harmonizes beautifully with gentle, muted colors."
  },
  Autumn: {
    colors: ["#D4A373", "#A3785E", "#8B4513", "#796465", "#654321", "#4A3B2A"],
    undertone: "Warm",
    description: "As an Autumn, you glow in warm, muted colors with golden-brown undertones. Earth tones like rust, olive, warm brown, and deep gold complement your natural warmth and richness. Your coloring has a golden quality that comes alive with nature's palette."
  },
  Winter: {
    colors: ["#1B4B6D", "#7C1D3C", "#2E8B57", "#4B0082", "#800020", "#191970"],
    undertone: "Cool",
    description: "As a Winter, you look best in clear, vivid colors with blue undertones. Your optimal colors are pure white, navy, deep purple, and true red. Your natural coloring has a crisp, clear quality that is enhanced by bold, dramatic colors."
  }
};

const ColorAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState(() => {
    const savedResults = localStorage.getItem('colorAnalysis');
    return savedResults ? JSON.parse(savedResults) : null;
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);

  useEffect(() => {
    // Initialize OpenCV
    cv.onRuntimeInitialized = () => {
      setIsOpenCVReady(true);
    };
  }, []);

  const analyzeImage = async (imageUrl: string): Promise<void> => {
    const steps = [
      { name: "Initializing AI analysis...", duration: 800 },
      { name: "Processing image data...", duration: 1000 },
      { name: "Analyzing skin tones...", duration: 1200 },
      { name: "Detecting color harmonies...", duration: 1000 },
      { name: "Calculating seasonal matches...", duration: 1000 }
    ];

    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;

    for (const step of steps) {
      setCurrentStep(step.name);
      const startProgress = (elapsed / totalDuration) * 100;
      const endProgress = ((elapsed + step.duration) / totalDuration) * 100;
      
      await new Promise<void>(resolve => {
        const startTime = Date.now();
        const animate = () => {
          const currentTime = Date.now();
          const stepElapsed = currentTime - startTime;
          
          if (stepElapsed < step.duration) {
            const stepProgress = (stepElapsed / step.duration);
            const currentProgress = startProgress + (endProgress - startProgress) * stepProgress;
            setProgress(currentProgress);
            requestAnimationFrame(animate);
          } else {
            setProgress(endProgress);
            resolve();
          }
        };
        requestAnimationFrame(animate);
      });

      elapsed += step.duration;
    }
  };

  const generateSeasonalAnalysis = async (imageUrl: string) => {
    const img = new Image();
    img.src = imageUrl;
    
    img.onload = async () => {
      try {
        const season = await analyzeImageColors(img);
        
        const analysis = {
          season,
          ...seasonalColors[season as keyof typeof seasonalColors],
          date: new Date().toISOString(),
          userImage: imageUrl
        };
        
        localStorage.setItem('colorAnalysis', JSON.stringify(analysis));
        setResults(analysis);
      } catch (error) {
        console.error('Error analyzing image:', error);
        // Fallback to random season if analysis fails
        const seasons = Object.keys(seasonalColors);
        const randomSeason = seasons[Math.floor(Math.random() * seasons.length)];
        
        const analysis = {
          season: randomSeason,
          ...seasonalColors[randomSeason as keyof typeof seasonalColors],
          date: new Date().toISOString(),
          userImage: imageUrl
        };
        
        localStorage.setItem('colorAnalysis', JSON.stringify(analysis));
        setResults(analysis);
      }
    };
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (results) return;
    
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setIsAnalyzing(true);
    setProgress(0);
    setCurrentStep('');

    await analyzeImage(imageUrl);
    await generateSeasonalAnalysis(imageUrl);
    setIsAnalyzing(false);
  }, [results]);

  if (results) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Color Analysis</h1>
          <div className="inline-flex items-center bg-rose-50 text-rose-700 px-4 py-2 rounded-lg">
            <AlertCircle className="h-5 w-5 mr-2" />
            Color analysis can only be performed once
          </div>
        </div>
        <ColorReport {...results} />
      </div>
    );
  }

  if (!isOpenCVReady) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4" />
        <p className="text-gray-600">Initializing color analysis system...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Color Analysis</h1>
        <p className="text-gray-600">Upload a selfie to discover your seasonal color palette</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg">
        {isAnalyzing ? (
          <AnalysisProgress
            progress={progress}
            currentStep={currentStep}
            uploadedImage={uploadedImage}
          />
        ) : (
          <ImageUploader
            onImageUpload={handleImageUpload}
            disabled={!!results}
          />
        )}
      </div>
    </div>
  );
};

export default ColorAnalysis;