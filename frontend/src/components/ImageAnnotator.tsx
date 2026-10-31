import React, { useState, useEffect } from 'react';
import { BoundingBox } from '../types';
import { Eye, EyeOff, AlertTriangle, ImageOff } from 'lucide-react';

interface ImageAnnotatorProps {
  imageUrl?: string;
  boxes?: BoundingBox[];
  hazards?: string[];
  dangerPhrases?: string[];
}

export const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({
  imageUrl,
  boxes = [],
  hazards = [],
  dangerPhrases = [],
}) => {
  const [showBoxes, setShowBoxes] = useState(true);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="w-full h-64 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-300 p-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
        <p className="font-medium text-slate-700">No Citizen Photo Attached</p>
        <p className="text-xs text-slate-500 text-center max-w-xs mt-1">
          Missing photo lowers confidence score, but priority remains ranked by threat indicators.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-2">
        <div className="w-full h-64 bg-slate-900 rounded-lg flex flex-col items-center justify-center text-slate-300 border border-slate-700 p-4">
          <ImageOff className="w-10 h-10 text-amber-500 mb-2" />
          <p className="font-semibold text-slate-200">Incident Image Unavailable</p>
          <p className="text-xs text-slate-400 text-center max-w-xs mt-1">
            Visual asset could not be loaded from remote host. AI extracted danger phrases, hazard categories, and geolocation coordinates remain fully preserved.
          </p>
        </div>

        {/* Still render hazards & danger phrases even if image failed */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {dangerPhrases.map((phrase, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full"
            >
              <AlertTriangle className="w-3 h-3 text-red-600" />
              Override: "{phrase}"
            </span>
          ))}
          {hazards.map((h, i) => (
            <span
              key={i}
              className="text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-full"
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Visual Evidence & AI Detections ({boxes.length} bounding boxes)
        </span>
        <button
          onClick={() => setShowBoxes(!showBoxes)}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          {showBoxes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showBoxes ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}
        </button>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border border-slate-300 bg-black aspect-video flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Disaster Scene"
          onError={() => setLoadError(true)}
          className="max-h-full max-w-full object-contain select-none"
        />

        {showBoxes &&
          boxes.map((b, idx) => {
            const [ymin, xmin, ymax, xmax] = b.box_2d;
            // Bounding box coords normalized 0-1000
            const top = `${(ymin / 1000) * 100}%`;
            const left = `${(xmin / 1000) * 100}%`;
            const height = `${((ymax - ymin) / 1000) * 100}%`;
            const width = `${((xmax - xmin) / 1000) * 100}%`;
            const isSelected = selectedBoxIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => setSelectedBoxIndex(isSelected ? null : idx)}
                style={{ top, left, width, height }}
                className={`absolute cursor-pointer transition-all border-2 ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-400/25 ring-2 ring-yellow-400'
                    : 'border-red-500 bg-red-500/15 hover:border-red-400 hover:bg-red-500/25'
                }`}
              >
                <span className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  {b.label}
                </span>
              </div>
            );
          })}
      </div>

      {/* Detected Hazards & Danger Phrases chips */}
      <div className="flex flex-wrap gap-1.5 mt-1">
        {dangerPhrases.map((phrase, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-full"
          >
            <AlertTriangle className="w-3 h-3 text-red-600" />
            Override: "{phrase}"
          </span>
        ))}
        {hazards.map((h, i) => (
          <span
            key={i}
            className="text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-full"
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
};
