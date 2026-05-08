import { useState, useRef } from 'react';

const PREVIEW = false;

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const scrollIntervalRef = useRef<number | null>(null);

  const extractImageIds = () => {
    const displayModeDiv = document.querySelector('div[data-display-mode]');
    const displayMode = displayModeDiv?.getAttribute('data-display-mode');

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

    return ids;
  };

  const openComicMode = async () => {
    const initialIds = extractImageIds();

    if (initialIds.length === 0) {
      alert('No images detected on screen. Make sure images are loaded.');
      return;
    }

    console.log('Found ', initialIds.length, ' images');
    setImageIds(initialIds);

    setIsOpen(true);
    document.body.style.overflow = 'hidden'; // Stop background from scrolling

    const scrollContainer = document.querySelector('c-wiz[data-parent]');
    if (scrollContainer) {
      let lastHeight = 0;
      let sameHeightCount = 0;

      console.log('Starting auto-scroll...');

      scrollIntervalRef.current = window.setInterval(() => {
        const currentHeight = scrollContainer.scrollHeight;

        scrollContainer.scrollTop = currentHeight;

        console.log(`Current height: ${currentHeight}`);

        const newIds = extractImageIds();
        setImageIds((prevIds) => {
          const mergedIds = [...prevIds];
          let added = 0;
          newIds.forEach((id) => {
            if (!mergedIds.includes(id)) {
              mergedIds.push(id);
              added++;
            }
          });
          if (added > 0) {
            console.log(
              `Added ${added} new images. Total: ${mergedIds.length}`,
            );
          }
          return mergedIds;
        });

        // Check if we've reached the actual end
        if (currentHeight === lastHeight) {
          sameHeightCount++;
          // Wait for 3 consecutive checks to ensure it's not just a slow network load
          if (sameHeightCount >= 3) {
            if (scrollIntervalRef.current) {
              window.clearInterval(scrollIntervalRef.current);
              scrollIntervalRef.current = null;
            }
            console.log('Finished loading all items.');
          }
        } else {
          lastHeight = currentHeight;
          sameHeightCount = 0;
        }
      }, 1500); // 1.5 seconds gives the network time to fetch new data
    }
  };

  const closeComicMode = () => {
    setIsOpen(false);
    setImageIds([]);
    document.body.style.overflow = 'auto'; // Re-enable background scroll
    if (scrollIntervalRef.current) {
      window.clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
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

          {imageIds.map((id, index) =>
            PREVIEW ? (
              <div key={id}>
                <p>
                  {index + 1}. {id}
                </p>
              </div>
            ) : (
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
            ),
          )}
        </div>
      )}
    </>
  );
}

export default App;
