/**
 * CourseVideoPlayer — A smart video player component.
 *
 * Supports:
 *  - H5P interactive modules (h5p.com / h5p.org)
 *  - Standard iframe embeds (YouTube, Vimeo, Google Drive, etc.)
 *  - Direct video files (.mp4, .webm, .ogg)
 *
 * @param {string} videoUrl — The URL of the video or interactive module.
 */

function getEmbedInfo(url) {
  if (!url) return null;

  // YouTube
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return { type: "iframe", url: `https://www.youtube.com/embed/${ytMatch[2]}` };
  }

  // Vimeo
  const vimeoRegExp =
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoRegExp);
  if (vimeoMatch && vimeoMatch[3]) {
    return { type: "iframe", url: `https://player.vimeo.com/video/${vimeoMatch[3]}` };
  }

  // Direct video files or Google Drive
  if (url.match(/\.(mp4|webm|ogg)$/i) || url.includes("drive.google.com/file")) {
    if (url.includes("drive.google.com/file/d/")) {
      const match = url.match(/\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        return { type: "iframe", url: `https://drive.google.com/file/d/${match[1]}/preview` };
      }
    }
    return { type: "video", url };
  }

  // H5P interactive content — detected separately for allow attributes
  if (url.includes("h5p.com") || url.includes("h5p.org")) {
    return { type: "h5p", url };
  }

  // Fallback — treat as a generic iframe
  return { type: "iframe", url };
}

export default function CourseVideoPlayer({ videoUrl }) {
  // ── Empty state ──────────────────────────────────────────────
  if (!videoUrl || videoUrl.trim() === "") {
    return (
      <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-400 select-none">
          Aucune vidéo disponible
        </p>
      </div>
    );
  }

  const info = getEmbedInfo(videoUrl);

  // Safety fallback (should not happen when videoUrl is non-empty)
  if (!info) {
    return (
      <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-400 select-none">
          Aucune vidéo disponible
        </p>
      </div>
    );
  }

  // ── Wrapper classes (shared) ─────────────────────────────────
  const wrapperClasses = "w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm";

  // ── H5P interactive module ───────────────────────────────────
  if (info.type === "h5p") {
    return (
      <div className={wrapperClasses}>
        <iframe
          src={info.url}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Module interactif H5P"
        />
      </div>
    );
  }

  // ── Standard iframe (YouTube, Vimeo, Drive, etc.) ────────────
  if (info.type === "iframe") {
    return (
      <div className={wrapperClasses}>
        <iframe
          src={info.url}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Lecteur vidéo"
        />
      </div>
    );
  }

  // ── Native <video> element (.mp4 / .webm / .ogg) ────────────
  return (
    <div className={wrapperClasses}>
      <video
        src={info.url}
        controls
        autoPlay
        className="w-full h-full"
      />
    </div>
  );
}
