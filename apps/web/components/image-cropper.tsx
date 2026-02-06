"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { GlassModal, GlassButton } from "./ui/glass";
import { useTheme } from "./providers/theme-provider";
import { X } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 16 / 9,
}: ImageCropperProps) {
  const { mode } = useTheme();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const getCroppedImage = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Calculate the scale between the displayed image and actual image
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to the cropped area
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    // Draw the cropped image
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert to blob
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.9
      );
    });
  }, [completedCrop]);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImage();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (error) {
      console.error("Failed to crop image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <GlassModal onClose={onCancel} className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
      {/* Header */}
      <div className={`border-b px-6 py-4 flex items-center justify-between ${mode === 'dark' ? "border-white/10" : "border-gray-200"}`}>
        <h2 className={`text-xl font-semibold ${mode === 'dark' ? "text-white" : "text-gray-900"}`}>Crop Image</h2>
        <button
          onClick={onCancel}
          className={`text-2xl transition-colors ${mode === 'dark' ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Crop Area */}
      <div className={`p-6 flex items-center justify-center ${mode === 'dark' ? "bg-black/40" : "bg-gray-100"}`}>
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspectRatio}
          className="max-h-[60vh]"
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={onImageLoad}
            className="max-h-[60vh] max-w-full"
          />
        </ReactCrop>
      </div>

      {/* Instructions */}
      <div className={`px-6 py-3 text-center ${mode === 'dark' ? "bg-white/5" : "bg-gray-50"}`}>
        <p className={`text-sm ${mode === 'dark' ? "text-gray-400" : "text-gray-500"}`}>
          Drag to reposition. Drag corners to resize.
        </p>
      </div>

      {/* Actions */}
      <div className={`border-t px-6 py-4 flex gap-3 ${mode === 'dark' ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
        <GlassButton
          variant="secondary"
          onClick={onCancel}
          className="flex-1 justify-center"
        >
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          onClick={handleSave}
          disabled={isProcessing || !completedCrop}
          className="flex-1 justify-center"
        >
          {isProcessing ? "Processing..." : "Save Cropped Image"}
        </GlassButton>
      </div>
    </GlassModal>
  );
}
