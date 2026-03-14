import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Download, 
  Plus, 
  Loader2, 
  Moon, 
  Sun, 
  X,
  Sparkles,
  ChevronRight,
  Monitor,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { generateImages, generateVideo } from './lib/gemini';

interface GeneratedImage {
  id: string;
  url: string;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{ used: number, total: number } | null>({ used: 8, total: 10 }); // Mock quota info
  
  // Video Generation State
  const [selectedImagesForVideo, setSelectedImagesForVideo] = useState<string[]>([]);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoDuration, setVideoDuration] = useState<'5s' | '8s'>('5s');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  const motionSuggestions = [
    "Nhân vật mỉm cười và vẫy tay chào",
    "Đi bộ chậm rãi trong bối cảnh hoàng hôn",
    "Xoay người nhẹ nhàng khoe trang phục",
    "Tóc bay trong gió, ánh mắt nhìn xa xăm",
    "Pose dáng fashion chuyên nghiệp",
    "Cười rạng rỡ và nhìn vào ống kính"
  ];

  // API Key Selection for Veo
  const [hasVeoKey, setHasVeoKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const win = window as any;
      if (win.aistudio?.hasSelectedApiKey) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        setHasVeoKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    const win = window as any;
    if (win.aistudio?.openSelectKey) {
      await win.aistudio.openSelectKey();
      setHasVeoKey(true);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    multiple: false
  } as any);

  const handleGenerateImages = async () => {
    if (!referenceImage) {
      setError('Vui lòng tải lên ảnh nhân vật mẫu.');
      return;
    }
    if (!prompt.trim()) {
      setError('Vui lòng nhập mô tả thay đổi.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const base64 = referenceImage.split(',')[1];
      const newImages = await generateImages(prompt, base64, mimeType, 4);
      setResults(newImages.map((url, i) => ({ id: `${Date.now()}-${i}`, url })));
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi tạo ảnh.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (selectedImagesForVideo.length === 0) return;
    if (!videoPrompt.trim()) {
      setError('Vui lòng nhập mô tả chuyển động.');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoUrl(null);
    try {
      const imagesPayload = selectedImagesForVideo.map(url => ({
        base64: url.split(',')[1],
        mimeType: 'image/png'
      }));
      const url = await generateVideo(videoPrompt, imagesPayload, videoAspectRatio === '9:16', videoDuration);
      setVideoUrl(url);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi tạo video.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleBatchGenerateVideos = async () => {
    if (results.length === 0) return;
    setIsBatchGenerating(true);
    setError(null);
    try {
      // In a real app, we might want to show progress for each
      // For now, we'll just do them sequentially or a few at a time
      alert('Đang bắt đầu tạo video hàng loạt cho tất cả ảnh. Quá trình này có thể mất vài phút.');
      for (const img of results) {
        const base64 = img.url.split(',')[1];
        const url = await generateVideo("Chuyển động tự nhiên, mượt mà", [{ base64, mimeType: 'image/png' }], false, '5s');
        // In a real app, we'd save these URLs. For now, we just trigger a download or log.
        console.log(`Generated video for ${img.id}: ${url}`);
      }
      alert('Đã hoàn thành tạo video hàng loạt!');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo video hàng loạt.');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `nhan-vat-ai-${id}.png`;
    link.click();
  };

  const downloadAllImages = () => {
    results.forEach((img, index) => {
      setTimeout(() => {
        downloadImage(img.url, `all-${index}`);
      }, index * 200);
    });
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300 font-sans",
      darkMode ? "bg-[#050505] text-white" : "bg-[#fafafa] text-gray-900"
    )}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between backdrop-blur-xl",
        darkMode ? "bg-black/70 border-white/10" : "bg-white/70 border-black/5"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">Nhân Vật AI</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1 font-medium">Creative Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {quotaInfo && (
            <div className="hidden md:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Hạn mức Veo:</span>
                <span className={cn(
                  "text-xs font-bold",
                  quotaInfo.used / quotaInfo.total > 0.8 ? "text-red-500" : "text-emerald-500"
                )}>
                  {quotaInfo.total - quotaInfo.used}/{quotaInfo.total} lượt còn lại
                </span>
              </div>
              <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    quotaInfo.used / quotaInfo.total > 0.8 ? "bg-red-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${(quotaInfo.used / quotaInfo.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {quotaInfo && quotaInfo.used / quotaInfo.total > 0.7 && (
            <button className="bg-gradient-to-r from-amber-400 to-orange-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform active:scale-95">
              Nâng cấp Pro
            </button>
          )}

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "p-2.5 rounded-full transition-all border",
              darkMode ? "hover:bg-white/10 text-yellow-400 border-white/10" : "hover:bg-black/5 text-indigo-600 border-black/5"
            )}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {!hasVeoKey && (
            <button
              onClick={handleOpenKeySelector}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <AlertCircle size={14} />
              <span>KÍCH HOẠT VEO 3.1</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar - Upload & Controls */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Instructions */}
          <div className={cn(
            "p-6 rounded-2xl border transition-all",
            darkMode ? "bg-[#111] border-white/5" : "bg-white border-black/5 shadow-sm"
          )}>
            <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 mb-4">Hướng dẫn sử dụng</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold shrink-0">01</span>
                <p className="opacity-80">Tải lên ảnh nhân vật mẫu (chân dung hoặc toàn thân).</p>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold shrink-0">02</span>
                <p className="opacity-80">Nhập mô tả trang phục hoặc bối cảnh bạn muốn thay đổi.</p>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold shrink-0">03</span>
                <p className="opacity-80">Nhấn <b>Tạo 4 ảnh</b> để xem kết quả. AI sẽ giữ nguyên gương mặt.</p>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold shrink-0">04</span>
                <p className="opacity-80">Chọn ảnh ưng ý để tạo video chuyển động với Veo 3.1.</p>
              </li>
            </ul>
          </div>

          <div className={cn(
            "p-6 rounded-2xl border transition-all",
            darkMode ? "bg-[#111] border-white/5" : "bg-white border-black/5 shadow-sm"
          )}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Upload size={18} className="text-emerald-500" />
              Nhân vật mẫu
            </h2>
            
            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all overflow-hidden",
                isDragActive ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 hover:border-emerald-500/50",
                referenceImage ? "aspect-square" : "py-16"
              )}
            >
              <input {...getInputProps()} />
              {referenceImage ? (
                <div className="relative group h-full w-full">
                  <img 
                    src={referenceImage} 
                    alt="Preview" 
                    className="w-full h-full object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-sm">
                    <p className="text-white text-xs font-bold uppercase tracking-widest">Thay đổi ảnh</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Plus className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Tải ảnh lên</p>
                    <p className="text-[10px] opacity-50 mt-1">Hỗ trợ JPG, PNG (Max 5MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={cn(
            "p-6 rounded-2xl border transition-all",
            darkMode ? "bg-[#111] border-white/5" : "bg-white border-black/5 shadow-sm"
          )}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-emerald-500" />
              Mô tả sáng tạo
            </h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: mặc váy dạ hội lấp lánh, đứng dưới tháp Eiffel ban đêm, phong cách cinematic..."
              className={cn(
                "w-full h-32 p-4 rounded-xl border resize-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm leading-relaxed",
                darkMode ? "bg-black border-white/10 text-white" : "bg-gray-50 border-black/5 text-gray-900"
              )}
            />
            <button
              onClick={handleGenerateImages}
              disabled={isGenerating || !referenceImage}
              className={cn(
                "w-full mt-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all",
                isGenerating 
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 active:scale-95"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Tạo 4 ảnh cùng lúc</span>
                </>
              )}
            </button>
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-500 text-xs font-medium leading-tight">{error}</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content - Results */}
        <section className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">Studio Kết Quả</h2>
              <p className="text-xs opacity-50 font-medium tracking-widest uppercase mt-1">AI Generated Masterpieces</p>
            </div>
            
            {results.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleBatchGenerateVideos}
                  disabled={isBatchGenerating}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all",
                    darkMode ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5" : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5"
                  )}
                >
                  {isBatchGenerating ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                  Tạo video từ tất cả ảnh
                </button>
                <button
                  onClick={downloadAllImages}
                  className={cn(
                    "px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all",
                    darkMode ? "border-white/10 hover:bg-white/5" : "border-black/5 hover:bg-black/5"
                  )}
                >
                  <Download size={14} />
                  Tải tất cả ({results.length})
                </button>
              </div>
            )}
          </div>

          {!isGenerating && results.length === 0 && (
            <div className={cn(
              "aspect-[16/9] rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-6",
              darkMode ? "border-white/5 bg-white/[0.02]" : "border-black/5 bg-black/[0.02]"
            )}>
              <div className="w-20 h-20 rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center">
                <ImageIcon size={32} className="opacity-20 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="opacity-40 font-bold uppercase tracking-widest text-sm">Sẵn sàng để sáng tạo</p>
                <p className="opacity-20 text-xs mt-2">Kết quả của bạn sẽ xuất hiện tại đây</p>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={cn(
                  "aspect-square rounded-3xl animate-pulse relative overflow-hidden",
                  darkMode ? "bg-white/5" : "bg-black/5"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-emerald-500/5 to-transparent animate-shimmer" />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-20">
            <AnimatePresence mode="popLayout">
              {results.map((img) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    "group relative rounded-[32px] overflow-hidden border transition-all hover:shadow-2xl",
                    darkMode ? "border-white/10 bg-[#111] hover:shadow-emerald-500/10" : "border-black/5 bg-white hover:shadow-black/10"
                  )}
                >
                  <img 
                    src={img.url} 
                    alt="Generated" 
                    className="w-full aspect-square object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end p-8">
                    <div className="flex gap-4 mb-4">
                      <button
                        onClick={() => downloadImage(img.url, img.id)}
                        className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-xl flex items-center justify-center border border-white/10"
                        title="Tải ảnh"
                      >
                        <Download size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedImagesForVideo([img.url]);
                          setShowVideoModal(true);
                        }}
                        className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center active:scale-90"
                        title="Tạo video"
                      >
                        <Video size={20} />
                      </button>
                    </div>
                    <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Sáng tạo video ngay</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Video Generation Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGeneratingVideo && setShowVideoModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl flex flex-col lg:flex-row",
                darkMode ? "bg-[#151515] text-white" : "bg-white text-gray-900"
              )}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowVideoModal(false)}
                disabled={isGeneratingVideo}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
              >
                <X size={20} />
              </button>

              {/* Left: Preview & Selection */}
              <div className="lg:w-1/2 bg-black flex flex-col overflow-hidden">
                <div className="flex-1 flex items-center justify-center relative">
                  {videoUrl ? (
                    <video 
                      src={videoUrl} 
                      controls 
                      autoPlay 
                      loop 
                      className={cn(
                        "w-full h-full object-contain",
                        videoAspectRatio === '9:16' ? "aspect-[9/16]" : "aspect-[16/9]"
                      )}
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {selectedImagesForVideo.length > 0 && (
                        <img 
                          src={selectedImagesForVideo[0]} 
                          alt="Reference for video" 
                          className={cn(
                            "w-full h-full object-contain opacity-50 blur-sm",
                            isGeneratingVideo && "animate-pulse"
                          )}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {isGeneratingVideo && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                          <div className="relative">
                            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Video size={20} className="text-emerald-500" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xl font-bold text-white">Đang tạo video với Veo 3.1</p>
                            <p className="text-white/60 text-sm">Vui lòng chờ 20-60 giây để có chất lượng tốt nhất...</p>
                          </div>
                        </div>
                      )}
                      {!isGeneratingVideo && selectedImagesForVideo.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img 
                            src={selectedImagesForVideo[0]} 
                            alt="Reference" 
                            className="max-w-[80%] max-h-[80%] object-contain rounded-xl shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Multiple Image Selection Bar */}
                {!videoUrl && !isGeneratingVideo && (
                  <div className="p-4 bg-white/5 border-t border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-3">Chọn thêm ảnh tham chiếu (Tối đa 3)</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {results.map((img) => {
                        const isSelected = selectedImagesForVideo.includes(img.url);
                        return (
                          <button
                            key={img.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedImagesForVideo(prev => prev.filter(u => u !== img.url));
                              } else if (selectedImagesForVideo.length < 3) {
                                setSelectedImagesForVideo(prev => [...prev, img.url]);
                              }
                            }}
                            className={cn(
                              "relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all",
                              isSelected ? "border-emerald-500 scale-105 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                            )}
                          >
                            <img src={img.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                <Plus size={10} className="text-white rotate-45" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Controls */}
              <div className="lg:w-1/2 p-8 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Tạo Video Chuyển Động</h3>
                    <p className="text-sm opacity-60">Sử dụng công nghệ Veo 3.1 để thổi hồn vào nhân vật của bạn.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold uppercase tracking-wider opacity-60">Tỷ lệ</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVideoAspectRatio('16:9')}
                          className={cn(
                            "flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-xs transition-all",
                            videoAspectRatio === '16:9' 
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" 
                              : "border-white/10 hover:border-white/20"
                          )}
                        >
                          <Monitor size={14} />
                          <span>16:9</span>
                        </button>
                        <button
                          onClick={() => setVideoAspectRatio('9:16')}
                          className={cn(
                            "flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-xs transition-all",
                            videoAspectRatio === '9:16' 
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" 
                              : "border-white/10 hover:border-white/20"
                          )}
                        >
                          <Smartphone size={14} />
                          <span>9:16</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold uppercase tracking-wider opacity-60">Độ dài</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVideoDuration('5s')}
                          className={cn(
                            "flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-xs transition-all",
                            videoDuration === '5s' 
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" 
                              : "border-white/10 hover:border-white/20"
                          )}
                        >
                          <span>5 Giây</span>
                        </button>
                        <button
                          onClick={() => setVideoDuration('8s')}
                          className={cn(
                            "flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-xs transition-all",
                            videoDuration === '8s' 
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" 
                              : "border-white/10 hover:border-white/20"
                          )}
                        >
                          <span>8 Giây</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold uppercase tracking-wider opacity-60">Mô tả chuyển động</label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Ví dụ: nhân vật nhảy múa, đi bộ trong rừng, pose fashion quay chậm..."
                      className={cn(
                        "w-full h-24 p-4 rounded-xl border resize-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm",
                        darkMode ? "bg-black border-white/10 text-white" : "bg-gray-50 border-black/5 text-gray-900"
                      )}
                    />
                    
                    <div className="flex flex-wrap gap-2">
                      {motionSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => setVideoPrompt(suggestion)}
                          className={cn(
                            "text-[10px] px-2 py-1 rounded-full border transition-all",
                            darkMode ? "border-white/10 hover:bg-white/5" : "border-black/5 hover:bg-black/5"
                          )}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8 space-y-3">
                  {videoUrl ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = videoUrl;
                          link.download = `nhan-vat-ai-video-${Date.now()}.mp4`;
                          link.click();
                        }}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <Download size={20} />
                        <span>Tải Video</span>
                      </button>
                      <button
                        onClick={() => {
                          setVideoUrl(null);
                          setVideoPrompt('');
                        }}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <Plus size={20} />
                        <span>Tạo Video Mới</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateVideo}
                      disabled={isGeneratingVideo || !videoPrompt.trim()}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                        isGeneratingVideo || !videoPrompt.trim()
                          ? "bg-gray-600 cursor-not-allowed" 
                          : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95"
                      )}
                    >
                      {isGeneratingVideo ? (
                        <>
                          <Loader2 className="animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <>
                          <Video size={20} />
                          <span>Bắt đầu tạo video</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
