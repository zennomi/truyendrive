import { useState } from 'react';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [imageIds, setImageIds] = useState<string[]>([]);

  const openComicMode = () => {
    const displayModeDiv = document.querySelector('div[data-display-mode]');
    const displayMode = displayModeDiv?.getAttribute('data-display-mode');

    console.log('Display mode', displayMode);

    let items;
    if (displayMode === '1') {
      items = document.querySelectorAll('tr[data-id][role="row"]');
    } else {
      items = document.querySelectorAll('div[data-id][role="gridcell"]');
    }

    const ids: string[] = [];

    items.forEach((item) => {
      // Ensure it's an image by checking the aria-label or the icon path
      const labelEle = item.querySelector('div[aria-label]');
      const label = labelEle?.getAttribute('aria-label') || '';
      const isImage = label
        .toLowerCase()
        .match(/\.(jpg|jpeg|png|webp|gif|bmp|heic)/);
      const id = item.getAttribute('data-id');

      if (id && isImage && !ids.includes(id)) {
        ids.push(id);
      }
    });

    if (ids.length === 0) {
      alert('No images detected on screen. Make sure images are loaded.');
      return;
    }

    console.log('Found ', ids.length, ' images');
    setImageIds(ids);
    setIsOpen(true);
    document.body.style.overflow = 'hidden'; // Stop background from scrolling
  };

  const closeComicMode = () => {
    setIsOpen(false);
    setImageIds([]);
    document.body.style.overflow = 'auto'; // Re-enable background scroll
  };

  return (
    <>
      <button
        onClick={openComicMode}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '10px 20px',
          backgroundColor: '#1a73e8',
          color: 'white',
          border: 'none',
          borderRadius: '24px',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          fontWeight: 'bold',
        }}
      >
        📖 Comic Mode
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#111',
            zIndex: 10000,
            overflowY: 'scroll',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 0',
          }}
        >
          <button
            onClick={closeComicMode}
            style={{
              position: 'fixed',
              top: '20px',
              right: '30px',
              padding: '8px 15px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ✕ Close Reader
          </button>

          {imageIds.map((id) => (
            <img
              key={id}
              src={`https://lh3.google.com/u/0/d/${id}`}
              style={{
                maxWidth: '900px',
                width: '95%',
                marginBottom: 0, // Long strip style
                display: 'block',
              }}
              loading="lazy"
              alt=""
            />
          ))}
        </div>
      )}
    </>
  );
}

export default App;
