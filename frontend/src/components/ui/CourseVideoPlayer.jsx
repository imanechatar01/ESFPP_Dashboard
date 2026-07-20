function getEmbedInfo(url) {
  if (!url) return null;

  const youtubeMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  if (youtubeMatch?.[2]?.length === 11) {
    return { type: "youtube", url: `https://www.youtube.com/embed/${youtubeMatch[2]}` };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/);
  if (vimeoMatch?.[3]) {
    return { type: "vimeo", url: `https://player.vimeo.com/video/${vimeoMatch[3]}` };
  }

  if (url.match(/\.(mp4|webm|ogg)$/i)) return { type: "video", url };
  if (url.includes("lumi.education") || url.includes("h5p.com") || url.includes("h5p.org")) return { type: "h5p", url };
  return { type: "iframe", url };
}

/** Render course content only. Playback is not tracked or persisted. */
export default function CourseVideoPlayer({ videoUrl }) {
  if (!videoUrl?.trim()) {
    return <div className="w-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-400">Aucune vidéo disponible</div>;
  }

  const info = getEmbedInfo(videoUrl);
  const wrapperClasses = "w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm";

  if (info.type === "video") {
    return <div className={wrapperClasses}><video src={info.url} controls className="w-full h-full" /></div>;
  }

  if (info.type === "h5p") {
    return <div className="w-full h-[550px] rounded-xl overflow-auto bg-black shadow-sm"><iframe src={info.url} className="w-full h-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Module interactif H5P" /></div>;
  }

  const allow = info.type === "iframe"
    ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    : "autoplay; fullscreen; picture-in-picture";

  return <div className={wrapperClasses}><iframe src={info.url} className="w-full h-full border-0" allow={allow} allowFullScreen title="Lecteur vidéo" /></div>;
}
