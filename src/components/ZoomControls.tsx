interface ZoomControlsProps {
  isVisible: boolean;
  onZoomChange: (zoom: number) => void;
  showZoomControls: () => void;
  zoom: number;
}

export function ZoomControls({
  isVisible,
  onZoomChange,
  showZoomControls,
  zoom,
}: ZoomControlsProps) {
  return (
    <div className={`zoom-level${isVisible ? ' vis' : ''}`}>
      <button
        className="ico-btn"
        onClick={() => {
          onZoomChange(Math.min(100, zoom + 10));
          showZoomControls();
        }}
        type="button"
      >
        
      </button>
      <button
        className="ico-btn"
        onClick={() => {
          onZoomChange(Math.max(10, zoom - 10));
          showZoomControls();
        }}
        type="button"
      >
        
      </button>
    </div>
  );
}
