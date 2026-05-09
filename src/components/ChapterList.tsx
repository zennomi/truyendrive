import type { Chapter } from '../hooks/useComicMode';
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react';
import comicStyles from '../assets/styles/comic.css?inline';

interface ChapterListProps {
  chapters: Chapter[];
  onClose: () => void;
  onSelectChapter: (chapterId: string, index: number) => void;
  statusMessage: string;
  title: string;
}

function formatUpdatedAt(updatedAt: number) {
  if (updatedAt <= 0) {
    return 'Unknown date';
  }

  return new Date(updatedAt).toLocaleDateString();
}

export const ChapterList = memo(function ChapterList({
  chapters,
  onClose,
  onSelectChapter,
  statusMessage,
  title,
}: ChapterListProps) {
  const [search, setSearch] = useState('');
  const { filteredChapters, isLoading } = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return {
      filteredChapters: chapters
        .map((chapter, index) => ({ chapter, index }))
        .filter(({ chapter }) =>
          chapter.name.toLowerCase().includes(normalizedSearch),
        ),
      isLoading: statusMessage.includes('Loading'),
    };
  }, [chapters, search, statusMessage]);

  const handleClose = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onClose();
  }, [onClose]);

  const handlePreventDefault = useCallback(
    (
      event:
        | MouseEvent<HTMLAnchorElement>
        | MouseEvent<HTMLButtonElement>
        | MouseEvent<HTMLElement>,
    ) => {
      event.preventDefault();
    },
    [],
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
    },
    [],
  );

  const handleReadLatest = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();

      if (chapters.length === 0) {
        return;
      }

      const latestChapterIndex = chapters.length - 1;
      const latestChapter = chapters[latestChapterIndex];

      if (!latestChapter) {
        return;
      }

      onSelectChapter(latestChapter.id, latestChapterIndex);
    },
    [chapters, onSelectChapter],
  );

  const handleChapterClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();

      const { chapterId, chapterIndex } = event.currentTarget.dataset;
      if (!chapterId || !chapterIndex) {
        return;
      }

      const parsedIndex = Number.parseInt(chapterIndex, 10);
      if (Number.isNaN(parsedIndex)) {
        return;
      }

      onSelectChapter(chapterId, parsedIndex);
    },
    [onSelectChapter],
  );

  return (
    <>
      <style>{comicStyles}</style>
      <div className="body-wrapper">
        <div className="home-background"></div>

        <header>
          <a
            className="donate"
            href="https://patreon.com/algoinde"
            target="_blank"
            rel="noreferrer"
          >
            <span>‹</span>&nbsp;&nbsp;send coffee?&nbsp;&nbsp;<span>›</span>
          </a>
          <a
            href="#"
            className="cubari-logo"
            onClick={handleClose}
          ></a>
          <a
            className="rhombutton icon-help"
            id="help-button"
            onClick={handlePreventDefault}
          ></a>
        </header>

        <div className="series-content">
          <article>
            <aside>
              <picture>
                {/* <img src="https://via.placeholder.com/400x600?text=No+Cover" className="img-fluid" alt={`${title} manga`} /> */}
              </picture>
              <table className="table table-borderless table-sm small">
                <tbody>
                  <tr>
                    <th>Author</th>
                    <td className="text-sm">Unknown</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td className="text-sm">Ongoing</td>
                  </tr>
                </tbody>
              </table>
              <a
                href="#"
                className="manga-link chapter no-chapter"
                onClick={handleReadLatest}
              >
                <span className="manga-link-chap"></span>
                <span className="manga-link-text">Read latest chapter ›</span>
              </a>
            </aside>
            <section className="series-content-body">
              <h1>{title || 'Unknown Series'}</h1>

              <a
                href="#"
                className="manga-link external"
                onClick={handlePreventDefault}
              >
                Google Drive source
              </a>

              <p>
                This is a mock synopsis. The actual synopsis data is not
                available in the current context, so this placeholder text is
                displayed to match the reference design layout.
              </p>
              <a
                href="#"
                className="manga-link chapter no-chapter"
                onClick={handleReadLatest}
              >
                <span className="manga-link-chap"></span>
                <span className="manga-link-text">Read latest chapter ›</span>
              </a>
            </section>
          </article>

          <div id="detailedView" className="table-responsive">
            <table id="chapters" className="table table-hover">
              <thead>
                <tr>
                  <th scope="col" className="read-icon all-read"></th>
                  <th scope="col">
                    Title&nbsp;&nbsp;&nbsp;&nbsp;
                    <input
                      className="form-control-sm"
                      id="chapterTitleSearch"
                      type="text"
                      placeholder="⌕  Search"
                      value={search}
                      onChange={handleSearchChange}
                    />
                  </th>
                  <th scope="col">Group</th>
                  <th scope="col">Last Updated</th>
                </tr>
              </thead>
              <tbody id="chapterTable">
                {isLoading && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ textAlign: 'center', padding: '2rem' }}
                    >
                      {statusMessage}
                    </td>
                  </tr>
                )}
                {filteredChapters.map(({ chapter, index }) => (
                  <tr
                    className="table-default is-read"
                    data-chapter={chapter.name}
                    key={chapter.id}
                  >
                    <td scope="row" className="read-icon"></td>
                    <td scope="row" className="chapter-title">
                      <a
                        data-chapter-id={chapter.id}
                        data-chapter-index={String(index)}
                        href="#"
                        onClick={handleChapterClick}
                      >
                        {chapter.name}
                      </a>
                    </td>
                    <td scope="row">{chapter.creator || 'Unknown Group'}</td>
                    <td scope="row" className="detailed-chapter-upload-date">
                      {formatUpdatedAt(chapter.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="layers">
        <article id="about" className="hidden">
          <a
            className="rhombutton icon-close"
            onClick={handlePreventDefault}
          ></a>
          <h2>What's this thing?</h2>
          <p>
            This website is an image proxy. It takes images from other websites
            and displays them in a better manga-oriented reader, Cubari.
          </p>
        </article>
      </div>
    </>
  );
});
