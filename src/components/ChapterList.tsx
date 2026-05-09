import type { Chapter } from '../hooks/useComicMode';
import { useState } from 'react';
import comicStyles from '../assets/styles/comic.css?inline';

const Content = 'content' as any;

interface ChapterListProps {
  chapters: Chapter[];
  onClose: () => void;
  onSelectChapter: (chapterId: string) => void;
  statusMessage: string;
  title: string;
}

function formatUpdatedAt(updatedAt: number) {
  if (updatedAt <= 0) {
    return 'Unknown date';
  }

  return new Date(updatedAt).toLocaleDateString();
}

export function ChapterList({
  chapters,
  onClose,
  onSelectChapter,
  statusMessage,
  title,
}: ChapterListProps) {
  const [search, setSearch] = useState('');
  const isLoading = statusMessage.includes('Loading');

  const filteredChapters = chapters.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
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
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          ></a>
          <a
            className="rhombutton icon-help"
            id="help-button"
            onClick={(e) => e.preventDefault()}
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
                onClick={(e) => {
                  e.preventDefault();
                  if (chapters.length > 0)
                    onSelectChapter(chapters[chapters.length - 1].id);
                }}
              >
                <span className="manga-link-chap"></span>
                <span className="manga-link-text">Read latest chapter ›</span>
              </a>
            </aside>
            <Content>
              <h1>{title || 'Unknown Series'}</h1>

              <a
                href="#"
                className="manga-link external"
                onClick={(e) => e.preventDefault()}
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
                onClick={(e) => {
                  e.preventDefault();
                  if (chapters.length > 0)
                    onSelectChapter(chapters[chapters.length - 1].id);
                }}
              >
                <span className="manga-link-chap"></span>
                <span className="manga-link-text">Read latest chapter ›</span>
              </a>
            </Content>
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
                      onChange={(e) => setSearch(e.target.value)}
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
                {filteredChapters.map((chapter) => (
                  <tr
                    className="table-default is-read"
                    data-chapter={chapter.name}
                    key={chapter.id}
                  >
                    <td scope="row" className="read-icon"></td>
                    <td scope="row" className="chapter-title">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectChapter(chapter.id);
                        }}
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
            onClick={(e) => e.preventDefault()}
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
}
