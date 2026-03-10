import { useState, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImageViewer = ({ images, initialIndex = 0, open, onOpenChange }: ImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = () => {
    setScale((s) => Math.min(s + 0.5, 5));
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.5, 1);
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || scale <= 1) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({ x: posStart.current.x + dx, y: posStart.current.y + dy });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    const newScale = Math.max(1, Math.min(scale + delta, 5));
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetZoom();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-0 bg-black/95 rounded-none [&>button]:hidden">
        <VisuallyHidden><DialogTitle>Şəkil</DialogTitle></VisuallyHidden>
        
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4">
          <span className="text-sm text-white/70 font-medium">
            {currentIndex + 1} / {images.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 5}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          {scale > 1 ? (
            <div
              className="flex h-full w-full items-center justify-center cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onDoubleClick={handleDoubleClick}
              onWheel={handleWheel}
            >
              <img
                src={images[currentIndex]}
                alt=""
                draggable={false}
                className="max-h-full max-w-full object-contain select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transition: isDragging ? "none" : "transform 0.2s ease",
                }}
              />
            </div>
          ) : (
            <Carousel
              opts={{ startIndex: initialIndex, loop: images.length > 1 }}
              className="w-full h-full"
              setApi={(api: CarouselApi) => {
                api?.on("select", () => {
                  setCurrentIndex(api.selectedScrollSnap());
                });
              }}
            >
              <CarouselContent className="h-full ml-0">
                {images.map((img, i) => (
                  <CarouselItem key={i} className="h-full flex items-center justify-center pl-0">
                    <img
                      src={img}
                      alt=""
                      className="max-h-[85vh] max-w-full object-contain cursor-zoom-in select-none"
                      onDoubleClick={handleDoubleClick}
                      onWheel={handleWheel}
                      draggable={false}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 bg-white/10 border-0 text-white hover:bg-white/20" />
                  <CarouselNext className="right-4 bg-white/10 border-0 text-white hover:bg-white/20" />
                </>
              )}
            </Carousel>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
