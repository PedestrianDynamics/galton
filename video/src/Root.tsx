import { Composition } from "remotion";
import { Galton, FPS, TOTAL_FRAMES, W, H } from "./Galton";
import { Thumb } from "./Thumb";

export const Root = () => (
  <>
  <Composition id="Galton" component={Galton} durationInFrames={TOTAL_FRAMES}
    fps={FPS} width={W} height={H} />
    <Composition id="Thumb" component={Thumb} durationInFrames={1} fps={1} width={1280} height={720} />
  </>
);
