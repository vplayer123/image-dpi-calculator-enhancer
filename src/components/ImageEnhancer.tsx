import { useState, useRef, useCallback } from "react";
import { Upload, Download, Image as ImageIcon, Zap, Share2, Facebook, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface ImageStats {
  width: number;
  height: number;
  dpi: number;
  fileSize: number;
  format: string;
}

export const ImageEnhancer = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [originalStats, setOriginalStats] = useState<ImageStats | null>(null);
  const [enhancedStats, setEnhancedStats] = useState<ImageStats | null>(null);
  const [brightness, setBrightness] = useState([100]);
  const [contrast, setContrast] = useState([100]);
  const [quality, setQuality] = useState([85]);
  const [targetDpi, setTargetDpi] = useState([300]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newImageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calculateDPI = (width: number, height: number, fileSizeBytes: number): number => {
    // Estimate DPI based on image dimensions and file size
    // This is an approximation - real DPI would need EXIF data
    const totalPixels = width * height;
    const bytesPerPixel = fileSizeBytes / totalPixels;
    
    // Higher quality images typically have higher DPI
    if (bytesPerPixel > 3) return 300; // High quality
    if (bytesPerPixel > 1.5) return 150; // Medium quality
    return 72; // Web standard
  };

  const getImageStats = (img: HTMLImageElement, fileSize: number): ImageStats => {
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      dpi: calculateDPI(img.naturalWidth, img.naturalHeight, fileSize),
      fileSize,
      format: 'JPEG'
    };
  };

  const processImage = useCallback((imageUrl: string, fileSize: number) => {
    const img = new Image();
    img.onload = () => {
      setOriginalStats(getImageStats(img, fileSize));
      
      // Calculate new dimensions for target DPI
      const originalDpi = calculateDPI(img.naturalWidth, img.naturalHeight, fileSize);
      const scaleFactor = targetDpi[0] / originalDpi;
      const newWidth = Math.round(img.naturalWidth * scaleFactor);
      const newHeight = Math.round(img.naturalHeight * scaleFactor);
      
      // Apply enhancements
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Apply filters and scale image
      ctx.filter = `brightness(${brightness[0]}%) contrast(${contrast[0]}%)`;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert to JPEG with specified quality
      const enhancedDataUrl = canvas.toDataURL('image/jpeg', quality[0] / 100);
      setEnhancedImage(enhancedDataUrl);
      
      // Calculate enhanced image stats
      const enhancedSize = Math.round((enhancedDataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
      setEnhancedStats({
        width: newWidth,
        height: newHeight,
        dpi: targetDpi[0],
        fileSize: enhancedSize,
        format: 'JPEG'
      });
      
      setIsProcessing(false);
      toast.success("Image enhanced successfully!");
    };
    img.src = imageUrl;
  }, [brightness, contrast, quality, targetDpi]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setOriginalImage(imageUrl);
      processImage(imageUrl, file.size);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDownload = () => {
    if (!enhancedImage) return;
    
    const link = document.createElement('a');
    link.href = enhancedImage;
    link.download = 'enhanced-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  // Re-process when settings change
  const handleEnhancementChange = () => {
    if (originalImage) {
      setIsProcessing(true);
      processImage(originalImage, originalStats?.fileSize || 0);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Image Enhancer</h1>
          <p className="text-muted-foreground text-lg">Enhance, compress, and optimize your images with DPI calculation</p>
        </header>

        {!originalImage ? (
          <Card className="border-2 border-dashed border-border bg-surface/50 p-12 text-center transition-colors hover:bg-surface-hover">
            <div
              className={`transition-colors ${isDragging ? 'text-primary' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`mx-auto mb-4 h-16 w-16 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <h3 className="text-xl font-semibold mb-2">Upload your image</h3>
              <p className="text-muted-foreground mb-6">Drag and drop an image here, or click to select</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Select Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image Comparison */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Image */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Original</h3>
                  <div className="aspect-square bg-surface rounded-lg overflow-hidden mb-4">
                    <img
                      src={originalImage}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {originalStats && (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Dimensions:</span>
                        <span>{originalStats.width} × {originalStats.height}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DPI:</span>
                        <span>{originalStats.dpi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{(originalStats.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Enhanced Image */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Enhanced</h3>
                  <div className="aspect-square bg-surface rounded-lg overflow-hidden mb-4">
                    {isProcessing ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Zap className="h-8 w-8 text-primary animate-pulse" />
                      </div>
                    ) : enhancedImage ? (
                      <img
                        src={enhancedImage}
                        alt="Enhanced"
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  {enhancedStats && (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Dimensions:</span>
                        <span>{enhancedStats.width} × {enhancedStats.height}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DPI:</span>
                        <span>{enhancedStats.dpi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{(enhancedStats.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Download Button */}
              <div className="text-center">
                <Button
                  onClick={handleDownload}
                  disabled={!enhancedImage || isProcessing}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-3"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download Enhanced JPG
                </Button>
              </div>
            </div>

            {/* Controls */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Enhancement Controls</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Brightness: {brightness[0]}%
                  </label>
                  <Slider
                    value={brightness}
                    onValueChange={(value) => {
                      setBrightness(value);
                      handleEnhancementChange();
                    }}
                    max={200}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Contrast: {contrast[0]}%
                  </label>
                  <Slider
                    value={contrast}
                    onValueChange={(value) => {
                      setContrast(value);
                      handleEnhancementChange();
                    }}
                    max={200}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    JPG Quality: {quality[0]}%
                  </label>
                  <Slider
                    value={quality}
                    onValueChange={(value) => {
                      setQuality(value);
                      handleEnhancementChange();
                    }}
                    max={100}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Target DPI: {targetDpi[0]} (for print quality)
                  </label>
                  <Slider
                    value={targetDpi}
                    onValueChange={(value) => {
                      setTargetDpi(value);
                      handleEnhancementChange();
                    }}
                    max={600}
                    min={72}
                    step={25}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    72 DPI: Web • 150 DPI: Good • 300 DPI: Print • 600 DPI: High-end
                  </div>
                </div>

                <Button
                  onClick={() => newImageInputRef.current?.click()}
                  variant="secondary"
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Image
                </Button>
                
                <input
                  ref={newImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>
            </Card>
          </div>
        )}

        {/* SEO Content Section */}
        <section className="mt-16 max-w-4xl mx-auto">
          <Card className="p-8">
            <h2 className="text-3xl font-bold text-foreground mb-6">Professional Image Enhancement Tool</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground">
              <p className="mb-4">
                Transform your images with our advanced image enhancer tool that combines professional-grade compression, 
                DPI optimization, and quality enhancement features. Perfect for photographers, designers, and content creators 
                who need high-quality image processing for web and print applications.
              </p>
              
              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Key Benefits:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Smart DPI Adjustment:</strong> Optimize images for web (72 DPI) or print quality (300-600 DPI) with intelligent scaling algorithms</li>
                <li><strong>Advanced Compression:</strong> Reduce file sizes while maintaining visual quality using optimized JPEG compression</li>
                <li><strong>Real-time Enhancement:</strong> Adjust brightness, contrast, and quality with instant preview capabilities</li>
                <li><strong>Professional Output:</strong> Download high-quality enhanced images ready for any application</li>
                <li><strong>Easy-to-Use Interface:</strong> Drag-and-drop functionality with intuitive controls for seamless workflow</li>
                <li><strong>Free Tool:</strong> Access professional image enhancement features without watermarks or limitations</li>
              </ul>
              
              <p className="mt-6">
                Whether you're preparing images for social media, e-commerce, print materials, or web publishing, 
                our image enhancer delivers the quality and control you need. Support for various DPI settings ensures 
                your images look perfect across all mediums and devices.
              </p>
            </div>
          </Card>
        </section>

        {/* Social Media Sharing Section */}
        <section className="mt-12 text-center">
          <Card className="p-6 bg-surface/50">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Share This Tool</h3>
            </div>
            <p className="text-muted-foreground mb-6">Help others discover this free image enhancement tool</p>
            
            <div className="flex justify-center gap-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = window.location.href;
                  const text = "Check out this amazing free image enhancer tool with DPI calculator and compression features!";
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                }}
                className="gap-2"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = window.location.href;
                  const text = "Check out this amazing free image enhancer tool with DPI calculator and compression features!";
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                }}
                className="gap-2"
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = window.location.href;
                  const text = "Check out this amazing free image enhancer tool with DPI calculator and compression features!";
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
                }}
                className="gap-2"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard!");
                }}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </Card>
        </section>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};