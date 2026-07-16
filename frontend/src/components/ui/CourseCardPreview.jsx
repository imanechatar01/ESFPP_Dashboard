import { useState, useEffect } from "react";
import { Video } from "lucide-react";

// Helper to extract YouTube video ID
function getYoutubeId(url) {
  if (!url) return null;
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return ytMatch[2];
  }
  return null;
}

// Helper to extract Vimeo video ID
function getVimeoId(url) {
  if (!url) return null;
  const vimeoRegExp =
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoRegExp);
  if (vimeoMatch && vimeoMatch[3]) {
    return vimeoMatch[3];
  }
  return null;
}

// Helper to extract Google Drive file ID
function getGoogleDriveId(url) {
  if (!url) return null;
  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([^/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export default function CourseCardPreview({ videoUrl, title }) {
  const [vimeoThumbnail, setVimeoThumbnail] = useState(null);

  // Fetch Vimeo thumbnail if needed
  useEffect(() => {
    const vimeoId = getVimeoId(videoUrl);
    if (vimeoId) {
      fetch(`https://vimeo.com/api/v2/video/${vimeoId}.json`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data[0] && data[0].thumbnail_large) {
            setVimeoThumbnail(data[0].thumbnail_large);
          }
        })
        .catch(() => {});
    }
  }, [videoUrl]);

  if (!videoUrl) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/15 flex items-center justify-center">
        <Video className="size-8 text-primary/30" />
      </div>
    );
  }

  // 1. YouTube Preview
  const ytId = getYoutubeId(videoUrl);
  if (ytId) {
    return (
      <img
        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        alt={title}
      />
    );
  }

  // 2. Vimeo Preview
  const vimeoId = getVimeoId(videoUrl);
  if (vimeoId) {
    if (vimeoThumbnail) {
      return (
        <img
          src={vimeoThumbnail}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          alt={title}
        />
      );
    }
    return (
      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
        <Video className="size-8 text-primary/30 animate-pulse" />
      </div>
    );
  }

  // 3. Google Drive Preview
  const driveId = getGoogleDriveId(videoUrl);
  if (driveId) {
    return (
      <img
        src={`https://drive.google.com/thumbnail?id=${driveId}&sz=w600`}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        alt={title}
        onError={(e) => {
          // If Drive thumbnail fails to load, hide image so parent container fallback displays
          e.target.style.display = "none";
        }}
      />
    );
  }

  // 4. Native Video Files
  if (videoUrl.match(/\.(mp4|webm|ogg)$/i)) {
    return (
      <video
        src={videoUrl}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        preload="metadata"
        muted
      />
    );
  }

  // 5. H5P Previews
  // Render H5P embed with pointer-events-none so click bubbles up to the card.
  if (
    videoUrl.includes("h5p.com") ||
    videoUrl.includes("h5p.org") ||
    videoUrl.includes("lumi.education") ||
    videoUrl.includes("lumi/")
  ) {
    return (
      <div className="absolute inset-0 w-full h-full bg-slate-900 pointer-events-none select-none overflow-hidden">
        <iframe
          src={videoUrl}
          className="w-full h-full border-0 opacity-80 transition-transform duration-300 group-hover:scale-105"
          allow="autoplay"
          title={title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>
    );
  }

  // 6. Generic embed/fallback
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/15 flex items-center justify-center">
      <Video className="size-8 text-primary/30" />
    </div>
  );
}
