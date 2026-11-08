import { useEffect, useRef } from "react";

/**
 * The car: a looping clip of the 1995 Mustang GT convertible driving at night,
 * headlights on, road sliding past. The original (tools/mustang-drive-source.mp4,
 * made with Google Flow) is on white; tools/car_video_alpha.py turns the white
 * into transparency so it sits on the dithered background
 * (public/art/mustang-drive.webm, VP9 with alpha).
 *
 * It only plays while the home screen is visible and motion is on; otherwise
 * it is paused (no decoding work behind apps).
 */
export function MustangGraphic({ playing }: { playing: boolean }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing]);

  return (
    <div className="mustang" aria-hidden>
      <video ref={video} src="/art/mustang-drive.webm" muted loop playsInline autoPlay={playing} disablePictureInPicture />
    </div>
  );
}
