import { memo, useCallback } from 'react';

interface ZoomControlsProps {
  isVisible: boolean;
  onZoomChange: (zoom: number) => void;
  showZoomControls: () => void;
  zoom: number;
}

export const ZoomControls = memo(function ZoomControls({
  isVisible,
  onZoomChange,
  showZoomControls,
  zoom,
}: ZoomControlsProps) {
  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(100, zoom + 10));
    showZoomControls();
  }, [onZoomChange, showZoomControls, zoom]);

  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(10, zoom - 10));
    showZoomControls();
  }, [onZoomChange, showZoomControls, zoom]);

  return (
    <div className={`zoom-level${isVisible ? ' vis' : ''}`}>
      <button className="ico-btn" onClick={handleZoomIn} type="button">
        
      </button>
      <button className="ico-btn" onClick={handleZoomOut} type="button">
        
      </button>
    </div>
  );
});
