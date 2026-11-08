import { useEffect, useRef } from "react";

/**
 * The car: a looping clip of the 1995 Mustang GT convertible driving at night,
 * headlights on, road sliding past, on a transparent background so it sits on
 * the dithered backdrop. Clips were made with Google Flow and keyed to VP9
 * with alpha by the scripts in tools/:
 *
 *   green  green-screen source, tools/car_video_alpha_green.py (crisper car,
 *          solid road, see-through windshield)        <- current
 *   white  white-background source, tools/car_video_alpha_white.py
 *          (git tag car-video-white-v1)
 *
 * Switch versions with CAR_VIDEO below. It only plays while the home screen
 * is visible and motion is on (no decoding work behind apps).
 */
const CAR_VIDEOS = {
  green: { src: "/art/mustang-drive-green-v1.webm", aspect: "1280 / 582" },
  white: { src: "/art/mustang-drive-white-v1.webm", aspect: "1280 / 620" },
};
const CAR_VIDEO: keyof typeof CAR_VIDEOS = "green";

export function MustangGraphic({ playing }: { playing: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const { src, aspect } = CAR_VIDEOS[CAR_VIDEO];

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing]);

  return (
    <div className="mustang" aria-hidden style={{ aspectRatio: aspect }}>
      <video ref={video} src={src} muted loop playsInline autoPlay={playing} disablePictureInPicture />
    </div>
  );
}
