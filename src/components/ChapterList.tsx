import type { Chapter } from '../hooks/useComicMode';
import type { FolderDetails } from '../providers/types';
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react';
import comicStyles from '../assets/styles/comic.css?inline';
import defaultSeriesImg from '../assets/reader/fujiload.png';
import logo from '../assets/truyendrive.webp';

interface ChapterListProps {
  chapters: Chapter[];
  folderDetails: FolderDetails | null;
  onClose: () => void;
  onSelectChapter: (chapterId: string, index: number) => void;
  statusMessage: string;
  title: string;
}

function formatUpdatedAt(updatedAt: number) {
  if (updatedAt <= 0) {
    return 'Unknown date';
  }

  return new Date(updatedAt).toLocaleString();
}

export const ChapterList = memo(function ChapterList({
  chapters,
  folderDetails,
  onClose,
  onSelectChapter,
  statusMessage,
  title,
}: ChapterListProps) {
  const [search, setSearch] = useState('');
  const seriesTitle = folderDetails?.title || title || 'Unknown Series';
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

  const handleClose = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose],
  );

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
            href="https://github.com/zennomi/truyendrive"
            target="_blank"
            rel="noreferrer"
          >
            <span>‹</span>&nbsp;&nbsp;github&nbsp;&nbsp;<span>›</span>
          </a>
          <a href="#" className="cubari-logo" onClick={handlePreventDefault}>
            <img
              style={{
                height: '60px',
                width: '60px',
              }}
              src={logo}
              alt="TruyenDrive"
            />
          </a>
          <a className="rhombutton icon-close" onClick={handleClose}></a>
        </header>

        <div className="series-content">
          <article>
            <aside>
              <picture>
                <img
                  src={folderDetails?.thumbnailUrl || defaultSeriesImg}
                  className="img-fluid"
                  alt={`${seriesTitle} cover`}
                />
              </picture>

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
              <h1>{seriesTitle}</h1>

              <table className="table table-borderless table-sm small">
                <tbody>
                  <tr>
                    <th>Uploader</th>
                    <td className="text-sm">
                      {folderDetails?.ownerEmail ?? 'Unknown'}
                    </td>
                  </tr>
                </tbody>
              </table>
              {/* <p>
                This is a mock synopsis. The actual synopsis data is not
                available in the current context, so this placeholder text is
                displayed to match the reference design layout.
              </p> */}
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
                  <th scope="col">Uploader</th>
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
    </>
  );
});
