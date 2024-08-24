import { useState, useEffect } from "react";
import { TbMeterCube } from "react-icons/tb";
import { PanelData } from "../Types/type";
import { twMerge } from "tailwind-merge";

export default function Panel({
  display,
  closePanelFunction,
  data,
}: {
  display: boolean;
  closePanelFunction: () => void;
  data: PanelData;
}) {
  const [isVisible, setIsVisible] = useState(display);
  const [animationClass, setAnimationClass] = useState("");

  useEffect(() => {
    if (display) {
      setIsVisible(true);
      setAnimationClass("slide-in");
    } else {
      setAnimationClass("slide-out");
      setTimeout(() => setIsVisible(false), 300); // Delay to match the slide-out animation duration
    }
  }, [display]);

  const maxScore = Math.max(...data.winRecordOfRows);

  return (
    <>
      {isVisible && (
        <div
          onClick={closePanelFunction}
          className={`absolute z-20 flex h-[100%] w-[100%] items-center justify-center bg-[rgba(0,0,0,0.7)]`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`phone:h-[60%] relative grid h-[45%] w-[70%] grid-rows-5 overflow-hidden rounded-[10px] bg-[#d7d7d7] sm:h-[65%] sm:w-[60%] lg:w-[45%] xl:w-[30%] ${animationClass}`}
          >
            <button
              onClick={closePanelFunction}
              className="absolute right-3 top-1 text-[1.5rem]"
            >
              &#10006;
            </button>
            <div className="row-span-1 flex items-center justify-center bg-[#d7d7d7]">
              <span className="phone:text-[2.2rem] relative text-[1.5rem] font-bold md:text-[2.5rem]">
                Wordle Clone
                <TbMeterCube
                  color="#538D4E"
                  className="phone:text-[2.8rem] absolute right-[-16%] top-[20%] text-[2rem] sm:top-[20%] sm:text-[3rem] md:right-[-15%]"
                />
              </span>
            </div>
            <div className="row-span-1 grid grid-cols-4 border-t-2 border-[#222] bg-[#d7d7d7]">
              <div className="row-span-1 flex flex-col items-center justify-start">
                <span className="text-[1rem] font-bold text-[#000] sm:text-[2rem]">
                  {data.numOfPlayedGames}
                </span>
                <span className="sm:font-bold">Played</span>
              </div>
              <div className="row-span-1 flex flex-col items-center justify-start">
                <span className="text-[1rem] font-bold text-[#000] sm:text-[2rem]">
                  {data.numOfPlayedGames != 0
                    ? Math.floor(
                        (data.numOfWinGames / data.numOfPlayedGames) * 100,
                      )
                    : 0}
                </span>
                <span className="sm:font-bold">Win %</span>
              </div>
              <div className="row-span-1 flex flex-col items-center justify-start">
                <span className="text-[1rem] font-bold text-[#000] sm:text-[2rem]">
                  {data.numOfCurrentStreak}
                </span>
                <span className="text-[.8rem] sm:font-bold">Current</span>
                <span className="text-[.8rem] sm:font-bold">Streak</span>
              </div>
              <div className="row-span-1 flex flex-col items-center justify-start">
                <span className="text-[1rem] font-bold text-[#000] sm:text-[2rem]">
                  {data.numOfMaxStreak}
                </span>
                <span className="text-[.8rem] sm:font-bold">Max</span>
                <span className="text-[.8rem] sm:font-bold">Streak</span>
              </div>
            </div>
            <div className="row-span-3 mt-[5%] flex flex-col items-center gap-[2%] bg-[#d7d7d7]">
              <h2 className="mb-[2%] self-start pl-[15%] text-[1.2rem] font-bold">
                Guess Distribution
              </h2>
              {/* for loop */}
              {data.winRecordOfRows.map((winGames, rowIndex) => (
                <div className="flex h-[10%] w-[70%]" key={rowIndex}>
                  <div className="h-[100%] w-[10%] bg-[#000] text-center align-middle text-[#fff]">
                    {rowIndex + 1}
                  </div>
                  <div
                    dynamic-content={winGames} // for dynamic content in pseudo element in tailwind
                    // tailwind is not supported dynamic styling, so we need to use the conventional style to implement
                    // formula: (score / maxScore) * (child'width percentage / 100) * 100}%
                    style={{
                      width: `${(winGames / maxScore) * (90 / 100) * 100}%`,
                    }}
                    // scoreBar is the custome className for index.css file to apply variable
                    className={twMerge(
                      "relative h-[100%] bg-[#3A3A3C] after:absolute after:right-[18px] after:h-full after:w-[2%] after:text-[#fff]",
                      data.latestWinRow == rowIndex ? "bg-[#538D4E]" : "",
                      winGames > 0
                        ? "after:content-[attr(dynamic-content)]"
                        : "",
                    )}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
