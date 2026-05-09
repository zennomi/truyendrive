interface ModePickerDialogProps {
  onSelectMode: (mode: 'chapters' | 'images') => void;
}

export function ModePickerDialog({ onSelectMode }: ModePickerDialogProps) {
  return (
    <section
      aria-label="Choose comic mode"
      className="mode-picker-backdrop"
      role="dialog"
    >
      <div className="mode-picker-dialog">
        <h2>How should this folder open?</h2>
        <p>
          This folder contains a mix of items, so Comic Mode needs a hint before
          it can continue.
        </p>
        <div className="mode-picker-actions">
          <button
            className="mode-picker-button"
            onClick={() => onSelectMode('chapters')}
            type="button"
          >
            <strong>Chapter List</strong>
            <span>Browse sub-folders first, then open a chapter reader.</span>
          </button>
          <button
            className="mode-picker-button"
            onClick={() => onSelectMode('images')}
            type="button"
          >
            <strong>Direct Images</strong>
            <span>Open the folder as a flat image list in the reader.</span>
          </button>
        </div>
      </div>
    </section>
  );
}
