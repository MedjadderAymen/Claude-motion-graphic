import { Composition } from "remotion";
import { LowerThird, LowerThirdProps } from "./LowerThird";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LowerThird"
      component={LowerThird}
      durationInFrames={10 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={
        {
          name: "Alex Rivera",
          title: "Motion Designer · Claude Studio",
          accentColor: "#FF6B35",
          transparent: false,
        } satisfies LowerThirdProps
      }
    />
  );
};
