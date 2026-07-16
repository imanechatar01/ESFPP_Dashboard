import { useEffect, useRef } from "react";

/**
 * Helper to parse different formats of video or H5P URLs.
 */
function getEmbedInfo(url) {
  if (!url) return null;

  // YouTube
  const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const ytMatch = url.match(ytRegExp);
  if (ytMatch && ytMatch[2].length === 11) {
    return { type: "youtube", id: ytMatch[2], url: `https://www.youtube.com/embed/${ytMatch[2]}?enablejsapi=1` };
  }

  // Vimeo
  const vimeoRegExp =
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoRegExp);
  if (vimeoMatch && vimeoMatch[3]) {
    return { type: "vimeo", id: vimeoMatch[3], url: `https://player.vimeo.com/video/${vimeoMatch[3]}` };
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

  // H5P interactive content
  if (
    url.includes("h5p.com") ||
    url.includes("h5p.org") ||
    url.includes("lumi.education") ||
    url.includes("lumi/")
  ) {
    return { type: "h5p", url };
  }

  // Fallback as a generic iframe
  return { type: "iframe", url };
}

/**
 * CourseVideoPlayer — Premium player supporting native playback resume and progress tracking.
 *
 * Props:
 *  - videoUrl: String url
 *  - resumeTime: Number of seconds to resume from
 *  - onProgress: Function called with (currentTime, duration)
 */
export default function CourseVideoPlayer({ videoUrl, resumeTime = 0, onProgress }) {
  const videoRef = useRef(null);
  const lastUpdatedTime = useRef(0);
  const info = getEmbedInfo(videoUrl);

  // Store callbacks and initial values in refs to prevent useEffect re-triggering during playback
  const onProgressRef = useRef(onProgress);
  const initialResumeTime = useRef(resumeTime);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  // Reset tracking parameters when video URL changes
  useEffect(() => {
    initialResumeTime.current = resumeTime;
    lastUpdatedTime.current = resumeTime;
  }, [videoUrl]);

  // ── Native Video playback tracking ──────────────────────────
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    // Report progress to parent every ~5 seconds to prevent spamming DB
    if (duration > 0 && Math.abs(currentTime - lastUpdatedTime.current) >= 5) {
      lastUpdatedTime.current = currentTime;
      onProgressRef.current?.(currentTime, duration);
    }
  };

  const handleVideoPauseOrEnd = () => {
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    onProgressRef.current?.(currentTime, duration);
  };

  // Native Video Seek to Resume Position (triggers only once per videoUrl change)
  useEffect(() => {
    if (info?.type === "video" && videoRef.current) {
      const handleLoadedMetadata = () => {
        if (initialResumeTime.current > 0) {
          videoRef.current.currentTime = initialResumeTime.current;
        }
      };

      const videoEl = videoRef.current;
      videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
      
      // If metadata is already loaded
      if (videoEl.readyState >= 1 && initialResumeTime.current > 0) {
        videoEl.currentTime = initialResumeTime.current;
      }

      return () => {
        videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [videoUrl]);

  // ── YouTube Iframe Player API tracking ────────────────────────
  useEffect(() => {
    if (info?.type !== "youtube") return;

    let player;
    let progressInterval;

    const initPlayer = () => {
      // Check if target element exists before mounting
      const element = document.getElementById("youtube-player-element");
      if (!element) return;

      player = new window.YT.Player("youtube-player-element", {
        videoId: info.id,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          start: Math.round(initialResumeTime.current)
        },
        events: {
          onReady: (event) => {
            if (initialResumeTime.current > 0) {
              event.target.seekTo(initialResumeTime.current, true);
            }
          },
          onStateChange: (event) => {
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
              progressInterval = setInterval(() => {
                if (player && typeof player.getCurrentTime === "function") {
                  const currentTime = player.getCurrentTime();
                  const duration = player.getDuration();
                  if (duration > 0 && Math.abs(currentTime - lastUpdatedTime.current) >= 5) {
                    lastUpdatedTime.current = currentTime;
                    onProgressRef.current?.(currentTime, duration);
                  }
                }
              }, 1000);
            } else {
              clearInterval(progressInterval);
              if (player && typeof player.getCurrentTime === "function") {
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();
                if (duration > 0) {
                  onProgressRef.current?.(currentTime, duration);
                }
              }
            }
          }
        }
      });
    };

    // Safe multi-load checking for YouTube Player SDK
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    return () => {
      clearInterval(progressInterval);
      if (player && typeof player.destroy === "function") {
        player.destroy();
      }
    };
  }, [videoUrl]);

  // ── Vimeo Player API tracking ────────────────────────────────
  useEffect(() => {
    if (info?.type !== "vimeo") return;

    let player;
    let progressInterval;

    const initVimeo = () => {
      const iframe = document.getElementById("vimeo-player-element");
      if (!iframe) return;

      player = new window.Vimeo.Player(iframe);

      player.ready().then(() => {
        if (initialResumeTime.current > 0) {
          player.setCurrentTime(initialResumeTime.current).catch(() => {});
        }

        player.on("play", () => {
          progressInterval = setInterval(() => {
            if (player) {
              Promise.all([player.getCurrentTime(), player.getDuration()]).then(
                ([currentTime, duration]) => {
                  if (duration > 0 && Math.abs(currentTime - lastUpdatedTime.current) >= 5) {
                    lastUpdatedTime.current = currentTime;
                    onProgressRef.current?.(currentTime, duration);
                  }
                }
              ).catch(() => {});
            }
          }, 1000);
        });

        player.on("pause", () => {
          clearInterval(progressInterval);
          Promise.all([player.getCurrentTime(), player.getDuration()]).then(
            ([currentTime, duration]) => {
              onProgressRef.current?.(currentTime, duration);
            }
          ).catch(() => {});
        });

        player.on("ended", () => {
          clearInterval(progressInterval);
          player.getDuration().then((duration) => {
            onProgressRef.current?.(duration, duration);
          }).catch(() => {});
        });
      }).catch(() => {});
    };

    // Safe multi-load checking for Vimeo SDK
    if (window.Vimeo && window.Vimeo.Player) {
      initVimeo();
    } else {
      if (!document.querySelector('script[src="https://player.vimeo.com/api/player.js"]')) {
        const tag = document.createElement("script");
        tag.src = "https://player.vimeo.com/api/player.js";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      const checkInterval = setInterval(() => {
        if (window.Vimeo && window.Vimeo.Player) {
          clearInterval(checkInterval);
          initVimeo();
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    return () => {
      clearInterval(progressInterval);
    };
  }, [videoUrl]);

  // ── Empty / Fallback checks ──────────────────────────────────
  if (!videoUrl || videoUrl.trim() === "") {
    return (
      <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-400 select-none">
          Aucune vidéo disponible
        </p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-400 select-none">
          Aucune vidéo disponible
        </p>
      </div>
    );
  }

  const wrapperClasses = "w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm";

  // ── Render Views based on media type ─────────────────────────
  if (info.type === "youtube") {
    return (
      <div className={wrapperClasses}>
        <div id="youtube-player-element" className="w-full h-full" />
      </div>
    );
  }

  if (info.type === "vimeo") {
    return (
      <div className={wrapperClasses}>
        <iframe
          id="vimeo-player-element"
          src={info.url}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Lecteur Vimeo"
        />
      </div>
    );
  }

  if (info.type === "h5p") {
    return (
      <div className="w-full h-[550px] rounded-xl overflow-auto bg-black shadow-sm">
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

  // Native Video tag
  return (
    <div className={wrapperClasses}>
      <video
        ref={videoRef}
        src={info.url}
        controls
        className="w-full h-full"
        onTimeUpdate={handleVideoTimeUpdate}
        onPause={handleVideoPauseOrEnd}
        onEnded={handleVideoPauseOrEnd}
      />
    </div>
  );
}
