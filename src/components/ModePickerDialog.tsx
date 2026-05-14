import { memo, useCallback } from 'react';
import comicStyles from '../assets/styles/comic.css?inline';

interface ModePickerDialogProps {
  onSelectMode: (mode: 'chapters' | 'images') => void;
}

export const ModePickerDialog = memo(function ModePickerDialog({
  onSelectMode,
}: ModePickerDialogProps) {
  const handleSelectChapters = useCallback(() => {
    onSelectMode('chapters');
  }, [onSelectMode]);

  const handleSelectImages = useCallback(() => {
    onSelectMode('images');
  }, [onSelectMode]);

  return (
    <>
      <style>{comicStyles}</style>
      <div
        id="layers"
        aria-label="Choose comic mode"
        role="dialog"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bottom: 0,
          zIndex: 99999,
        }}
      >
        <article
          style={{
            minHeight: 'auto',
            padding: '2rem 3rem',
            borderRadius: '4px',
            maxWidth: '45rem',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: '1rem',
              color: 'white',
              fontSize: '1.5rem',
            }}
          >
            How should this folder open?
          </h2>
          <p style={{ color: '#ccc', fontSize: '0.9rem' }}>
            This folder contains a mix of items, so Comic Mode needs a hint
            before it can continue.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '2rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="manga-link chapter"
              onClick={handleSelectChapters}
              type="button"
            >
              <span className="manga-link-chap">Chapter List</span>
              <span className="manga-link-text">Browse sub-folders</span>
            </button>
            <button
              className="manga-link chapter"
              onClick={handleSelectImages}
              type="button"
            >
              <span className="manga-link-chap">Direct Images</span>
              <span className="manga-link-text">Open flat image list</span>
            </button>
          </div>
        </article>
      </div>
    </>
  );
});
