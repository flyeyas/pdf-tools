import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Upload, FileText, Download, Settings, Loader2, FileUp } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState('机密');
  const [fontSize, setFontSize] = useState(60);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);
  const [color, setColor] = useState('#ff0000');
  const [layoutMode, setLayoutMode] = useState<'center' | 'tile'>('center');
  const [gapX, setGapX] = useState(100);
  const [gapY, setGapY] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        alert('请选择有效的 PDF 文件。');
      }
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  };

  const processPdf = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // 注册 fontkit 以支持自定义字体
      pdfDoc.registerFontkit(fontkit);
      
      // 加载中文字体 (霞鹜文楷 Lite)
      const fontUrl = 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-lite-webfont@1.1.0/lxgwwenkailite-regular.ttf';
      const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
      const customFont = await pdfDoc.embedFont(fontBytes);

      const pages = pdfDoc.getPages();
      
      const rgbColor = hexToRgb(color);

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        // Very basic text width estimation for centering
        // A more robust solution would use a font to measure text width
        const estimatedTextWidth = watermarkText.length * (fontSize * 0.5);
        const estimatedTextHeight = fontSize;

        if (layoutMode === 'center') {
          page.drawText(watermarkText, {
            x: width / 2 - estimatedTextWidth / 2,
            y: height / 2 - estimatedTextHeight / 2,
            size: fontSize,
            font: customFont,
            color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
            opacity: opacity,
            rotate: degrees(rotation),
          });
        } else {
          // 平铺模式
          const stepX = estimatedTextWidth + gapX;
          const stepY = estimatedTextHeight + gapY;

          // 计算对角线，确保旋转后能覆盖整个页面
          const diagonal = Math.sqrt(width * width + height * height);
          const startX = (width - diagonal) / 2 - stepX;
          const endX = width + (diagonal - width) / 2 + stepX;
          const startY = (height - diagonal) / 2 - stepY;
          const endY = height + (diagonal - height) / 2 + stepY;

          let row = 0;
          for (let y = startY; y < endY; y += stepY) {
            // 偶数行交错偏移
            const offsetX = (row % 2 === 0) ? 0 : stepX / 2;
            for (let x = startX; x < endX; x += stepX) {
              page.drawText(watermarkText, {
                x: x + offsetX,
                y: y,
                size: fontSize,
                font: customFont,
                color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
                opacity: opacity,
                rotate: degrees(rotation),
              });
            }
            row++;
          }
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      
      // Create download link
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermarked_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('处理 PDF 时发生错误。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-2">
            <FileText size={32} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">PDF 水印工具</h1>
          <p className="text-neutral-500 max-w-xl mx-auto">
            在浏览器中直接为您的 PDF 文件添加自定义文本水印，保护您的文档安全。文件不会上传到任何服务器。
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column: Upload & Preview */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200/60">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload size={20} className="text-indigo-500" />
                选择文档
              </h2>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? 'border-indigo-300 bg-indigo-50/50' : 'border-neutral-300 hover:border-indigo-400 hover:bg-neutral-50'
                }`}
              >
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                
                {file ? (
                  <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 truncate px-4">{file.name}</p>
                      <p className="text-sm text-neutral-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      移除文件
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 bg-neutral-100 text-neutral-500 rounded-full flex items-center justify-center">
                      <FileUp size={24} />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">点击上传 PDF</p>
                      <p className="text-sm text-neutral-500">或将文件拖拽到此处</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Preview (Conceptual) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200/60 flex flex-col items-center justify-center min-h-[300px] overflow-hidden relative">
              <div className="absolute inset-0 bg-neutral-100/50 pointer-events-none"></div>
              <div className="w-48 h-64 bg-white shadow-md border border-neutral-200 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-4 border border-neutral-100 flex flex-col gap-2 p-2">
                  <div className="h-2 bg-neutral-200 rounded w-3/4"></div>
                  <div className="h-2 bg-neutral-200 rounded w-full"></div>
                  <div className="h-2 bg-neutral-200 rounded w-5/6"></div>
                  <div className="h-2 bg-neutral-200 rounded w-full mt-4"></div>
                  <div className="h-2 bg-neutral-200 rounded w-4/5"></div>
                </div>
                
                {/* Watermark Preview */}
                {layoutMode === 'center' ? (
                  <div 
                    className="absolute whitespace-nowrap font-bold pointer-events-none select-none"
                    style={{
                      color: color,
                      opacity: opacity,
                      transform: `rotate(${rotation}deg)`,
                      fontSize: `${Math.max(12, fontSize * 0.3)}px`, // Scaled down for preview
                    }}
                  >
                    {watermarkText || '水印'}
                  </div>
                ) : (
                  <div 
                    className="absolute inset-[-100%] flex flex-col items-center justify-center pointer-events-none select-none"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      gap: `${gapY * 0.3}px`
                    }}
                  >
                    {Array.from({ length: 15 }).map((_, row) => (
                      <div key={row} className="flex whitespace-nowrap" style={{ 
                        gap: `${gapX * 0.3}px`, 
                        marginLeft: row % 2 === 0 ? 0 : `${(gapX * 0.3 + Math.max(12, fontSize * 0.3) * (watermarkText.length * 0.5)) / 2}px` 
                      }}>
                        {Array.from({ length: 10 }).map((_, col) => (
                          <span key={col} style={{ color, opacity, fontSize: `${Math.max(12, fontSize * 0.3)}px` }}>
                            {watermarkText || '水印'}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-4 text-center">概念预览。实际效果可能因页面尺寸而异。</p>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200/60 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings size={20} className="text-neutral-500" />
              水印设置
            </h2>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">文本</label>
                <input 
                  type="text" 
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="输入水印文本..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">布局模式</label>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="layoutMode" 
                      value="center" 
                      checked={layoutMode === 'center'} 
                      onChange={() => setLayoutMode('center')}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span className="text-sm text-neutral-700">居中单行</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="layoutMode" 
                      value="tile" 
                      checked={layoutMode === 'tile'} 
                      onChange={() => setLayoutMode('tile')}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span className="text-sm text-neutral-700">平铺满页</span>
                  </label>
                </div>
              </div>

              {layoutMode === 'tile' && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium text-neutral-700">水平间距</label>
                      <span className="text-sm text-neutral-500">{gapX}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="20" 
                      max="300" 
                      value={gapX}
                      onChange={(e) => setGapX(parseInt(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium text-neutral-700">垂直间距</label>
                      <span className="text-sm text-neutral-500">{gapY}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="20" 
                      max="300" 
                      value={gapY}
                      onChange={(e) => setGapY(parseInt(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-neutral-700">字体大小</label>
                  <span className="text-sm text-neutral-500">{fontSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="12" 
                  max="150" 
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-neutral-700">透明度</label>
                  <span className="text-sm text-neutral-500">{Math.round(opacity * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.05" 
                  max="1" 
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-neutral-700">旋转角度</label>
                  <span className="text-sm text-neutral-500">{rotation}°</span>
                </div>
                <input 
                  type="range" 
                  min="-90" 
                  max="90" 
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">颜色</label>
                <div className="flex gap-3 items-center">
                  <input 
                    type="color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 rounded cursor-pointer border-0 p-0"
                  />
                  <input 
                    type="text" 
                    value={color.toUpperCase()}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100">
              <button
                onClick={processPdf}
                disabled={!file || isProcessing || !watermarkText}
                className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                  !file || !watermarkText
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    下载加水印后的 PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
