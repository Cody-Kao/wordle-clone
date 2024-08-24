import { useEffect, useRef, useState } from "react";
import {
  initAnswerArea,
  Keys,
  KeyToIndex,
  NumOfKeysAndOffset,
} from "./Consts/const";
import { twMerge } from "tailwind-merge";
import { IoBackspaceOutline } from "react-icons/io5";
import { FiExternalLink } from "react-icons/fi";
import { TbMeterCube } from "react-icons/tb";
import { PiRankingDuotone } from "react-icons/pi";
import { KeyType } from "./Types/type";
// 要先安裝 "npm install vite-plugin-raw --save-dev" 再把路徑最後加上"?raw" 完成本地assets file import
import guessWordlist from "./assets/wordle-La.txt?raw";
import allowedGuessWordlist from "./assets/wordle-Ta.txt?raw";
import Alarm from "./Componenets/Alarm.tsx";
import useLocalStorage from "./Hooks/useLocalStorage.tsx";
import Panel from "./Componenets/Panel.tsx";

function App() {
  const [isGameOver, setIsGameOver] = useLocalStorage("isGameOver", false);
  const [keyState, setKeyState] = useLocalStorage<KeyType[]>("keyState", Keys);
  const guessWordlistRef = useRef<string[]>([]);
  const allowedGuessWordlistRef = useRef<string[]>([]);
  useEffect(() => {
    guessWordlistRef.current = guessWordlist.split(/\r?\n/).filter(Boolean);
    allowedGuessWordlistRef.current = allowedGuessWordlist
      .split(/\r?\n/)
      .filter(Boolean);
    console.log(guessWordlistRef.current);
  }, []);

  const [answer, setAnswer] = useLocalStorage<string>("answer", "");

  const [displayPanel, setDisplayPanel] = useState(false);
  // number of games played
  const [numOfPlayedGames, setNumOfPlayedGames] = useLocalStorage(
    "numOfPlayedGames",
    0,
  );
  // number of winning games
  const [numOfWinGames, setNumOfWinGames] = useLocalStorage("numOfWinGames", 0);
  // number of current streak
  const [numOfCurrentStreak, setNumOfCurrentStreak] = useLocalStorage(
    "numOfCurrentStreak",
    0,
  );
  // number of max streak
  const [numOfMaxStreak, setNumOfMaxStreak] = useLocalStorage(
    "numOfMaxStreak",
    0,
  );
  // lastest wining row
  const [latestWinRow, setLatestWinRow] = useLocalStorage("latestWinRow", -1);
  // every row's winning record
  const [winRecordOfRows, setWinRecordOfRows] = useLocalStorage<number[]>(
    "winRecordOfRows",
    [0, 0, 0, 0, 0, 0],
  );

  const [currentDate, setCurrentDate] = useLocalStorage<string>(
    "currentDate",
    "",
  );

  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (today != currentDate) {
      // update the date and answer
      setCurrentDate(today);
      setAnswer(() => {
        const index = hashCode(today + "-$"); // -$ is the salt to provide randomness
        const newAnswer =
          guessWordlistRef.current[index % guessWordlistRef.current.length];
        return newAnswer;
      });
      // reset the game
      setIsGameOver(false);
      setKeyState(Keys);
      setAnswerArea(initAnswerArea);
      setCurAnswerRow(0);
      setCurAnswerCol(0);
    }
  }, []);

  // -1代表該格為空 即不對應任何按鍵，另外一個代表state=> ""/picked/attempted/correct
  const [answerArea, setAnswerArea] = useLocalStorage<[number, string][][]>(
    "answerArea",
    initAnswerArea,
  );

  const answerAreaRef = useRef<HTMLDivElement | null>(null);

  const [curAnswerRow, setCurAnswerRow] = useLocalStorage<number>(
    "curAnswerRow",
    0,
  );
  const [curAnswerCol, setCurAnswerCol] = useLocalStorage<number>(
    "curAnswerCol",
    0,
  );

  const [isRunning, setIsRunning] = useState(false);

  const [displayAlarm, setDisplayAlarm] = useState(false);

  const [alarmContent, setAlarmContent] = useState("");

  const handleAlphabetKeyPress = (key: string) => {
    if (curAnswerCol === 5) return;

    setAnswerArea((answerArea) =>
      answerArea.map((row, rowIndex) => {
        if (rowIndex === curAnswerRow) {
          const updatedRow = [...row];
          updatedRow[curAnswerCol] = [KeyToIndex[key], ""];
          return updatedRow;
        }
        return row;
      }),
    );

    setCurAnswerCol((curCol) => curCol + 1);
    /* 另外一種防止stale closure的方法就是直接把current state從setState的callback裡面呼叫出來 變成setState的closure
    setCurAnswerCol((curCol) => {
      if (curCol === 5) return curCol;

      setAnswerArea((answerArea) =>
        answerArea.map((row, rowIndex) => {
          if (rowIndex === curAnswerRow) {
            const updatedRow = [...row];
            updatedRow[curCol] = KeyToIndex[key];
            return updatedRow;
          }
          return row;
        }),
      );

      console.log(curCol);
      return curCol + 1;
    });
    */
  };

  const handleBackspacePress = () => {
    if (curAnswerCol === 0) return;

    setAnswerArea((answerArea) =>
      answerArea.map((row, rowIndex) => {
        if (rowIndex === curAnswerRow) {
          const updatedRow = [...row];
          updatedRow[curAnswerCol - 1] = [-1, ""];
          return updatedRow;
        }
        return row;
      }),
    );

    setCurAnswerCol((curCol) => curCol - 1);
  };

  // 用ref來記住唯一的timeout ID，當有新的alarm出現時會先清掉舊的timeout 再換成新的ID 確保每次alarm最多維持2秒
  const timeoutRef = useRef<number | null>(null);

  const showAlarm = (content: string) => {
    // Clear any existing timeout to reset the timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new alarm content and display it
    setAlarmContent(content);
    setDisplayAlarm(true);

    // Set a new timeout to hide the alarm after 2 seconds
    timeoutRef.current = setTimeout(() => {
      setDisplayAlarm(false);
    }, 2000);
  };

  const handleEnterPress = () => {
    const row = answerAreaRef.current?.children[curAnswerRow];
    if (!row) return; // 如果出bug沒選到該列
    const letters = row.children;
    if (!letters) return; // 如果出bug沒選到該列裡面的每個字母(children div)
    console.log(letters);

    if (curAnswerCol != 5) {
      // not enough letters
      showAlarm("Not enough letters");
      row.classList.add("shaking");

      // Remove the 'shake' class after the animation is complete
      setTimeout(() => {
        row.classList.remove("shaking");
      }, 600); // Adjust the duration as needed

      return;
    }
    const result = evaluate(letters); // evaluate the answer

    if (result.length == 0) {
      // 空array
      // 沒這個字
      showAlarm("Not in word list");
      row.classList.add("shaking");

      // Remove the 'shake' class after the animation is complete
      setTimeout(() => {
        row.classList.remove("shaking");
      }, 600); // Adjust the duration as needed
      return;
    }
    // run animaation
    setIsRunning(true);
    for (let [letterIndex, letter] of Array.from(letters).entries()) {
      const backDiv = letter.childNodes[1] as HTMLElement;
      backDiv.classList.add(
        result[letterIndex] == 0
          ? "picked"
          : result[letterIndex] == 1
            ? "attempted"
            : "correct",
      );
      setTimeout(() => {
        letter.classList.add("flip");
      }, letterIndex * 400);
    }

    // set the state for keyboard and answerArea
    // let [a, b] of Array.entries() => enumerate in Python
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        console.log(answerArea[curAnswerRow][i][0]);
        const letterIndex = answerArea[curAnswerRow][i][0];
        setKeyState((prevState) =>
          prevState.map((key, index) => {
            if (index == letterIndex) {
              const newKey = {
                ...key,
                state:
                  result[i] == 0
                    ? "picked"
                    : result[i] == 1
                      ? "attempted"
                      : "correct",
              };
              return newKey;
            } else {
              return key;
            }
          }),
        );
        // update answerArea
        setAnswerArea((prevArea) =>
          prevArea.map((row, index) => {
            if (index === curAnswerRow) {
              const newRow = row.map((pair, pairIndex) => {
                if (pairIndex == i) {
                  const newPair: [number, string] = [
                    pair[0],
                    result[i] == 0
                      ? "picked"
                      : result[i] == 1
                        ? "attempted"
                        : "correct",
                  ];
                  console.log(newPair);
                  return newPair;
                } else {
                  return pair;
                }
              });
              return newRow;
            } else {
              return row;
            }
          }),
        );
      }

      // 把數字加起來看看是否等於10 是的話就全對
      if (result.reduce((num, cur) => num + cur, 0) == 10) {
        setIsGameOver(true);
        // run winning animation
        for (let [letterIndex, letter] of Array.from(letters).entries()) {
          setTimeout(() => {
            letter.classList.add("bounce");
          }, letterIndex * 300);
        }
        setTimeout(() => {
          setNumOfCurrentStreak((curStreak) => {
            setNumOfMaxStreak((maxStreak) =>
              Math.max(maxStreak, curStreak + 1),
            );
            return curStreak + 1;
          });
          setNumOfWinGames((winGames) => winGames + 1);
          setNumOfPlayedGames((playedGames) => playedGames + 1);
          setLatestWinRow(curAnswerRow);
          setWinRecordOfRows((rows) =>
            rows.map((row, rowIndex) => {
              if (rowIndex == curAnswerRow) {
                return row + 1;
              } else {
                return row;
              }
            }),
          );
          setDisplayPanel(true);
        }, 1800);
      } else if (curAnswerRow == 5) {
        // 6次機會用完都沒答對
        setIsGameOver(true);
        setNumOfCurrentStreak(0);
        setNumOfPlayedGames((playedGames) => playedGames + 1);
        setLatestWinRow(-1);
        setDisplayPanel(true);
      } else {
        setCurAnswerRow((curRow) => curRow + 1);
        setCurAnswerCol(0);
        setIsRunning(false);
      }
    }, 2000);
  };

  const evaluate = (letters: HTMLCollection): number[] => {
    // 0代表該字母沒出現 1代表位置錯誤 2代表猜對
    // 回傳空array代表沒這個單字
    // 確認單字存在
    const resultArray: number[] = [];
    const word = Array.from(letters)
      .map((letter) => letter.childNodes[0].textContent?.toLowerCase())
      .join("");
    console.log(word);
    if (
      !(
        allowedGuessWordlistRef.current.includes(word) ||
        guessWordlistRef.current.includes(word)
      )
    ) {
      return resultArray;
    }

    for (let i = 0; i < 5; i++) {
      if (answer.includes(word.charAt(i))) {
        if (answer.charAt(i) === word.charAt(i)) {
          resultArray.push(2);
        } else {
          resultArray.push(1);
        }
      } else {
        resultArray.push(0);
      }
    }

    return resultArray;
  };

  const handleKeyClick = (key: string) => {
    if (isRunning || isGameOver) return;
    if (/^[A-Z]$/.test(key)) {
      handleAlphabetKeyPress(key);
    } else if (key === "Enter") {
      handleEnterPress();
    } else if (key === "BackSpace") {
      handleBackspacePress();
    }
  };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isRunning || isGameOver) return;
      const key = event.key.toUpperCase();

      if (/^[A-Z]$/.test(key)) {
        handleAlphabetKeyPress(key);
      } else if (event.key === "Enter") {
        handleEnterPress();
      } else if (event.key === "Backspace") {
        handleBackspacePress();
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    isGameOver,
    isRunning,
    handleAlphabetKeyPress,
    handleBackspacePress,
    handleEnterPress,
  ]);

  return (
    <div className="relative grid h-screen w-screen grid-rows-11 bg-[#fff]">
      <Panel
        display={displayPanel}
        closePanelFunction={() => setDisplayPanel(false)}
        data={{
          numOfPlayedGames: numOfPlayedGames,
          numOfWinGames: numOfWinGames,
          numOfCurrentStreak: numOfCurrentStreak,
          numOfMaxStreak: numOfMaxStreak,
          latestWinRow: latestWinRow,
          winRecordOfRows: winRecordOfRows,
        }}
      />
      <div className="absolute bottom-2 right-8 hidden flex-col items-center justify-center gap-0 xs:flex">
        <span>網頁時間</span>
        <span className="font-bold">{currentDate}</span>
      </div>
      <div className="relative row-span-1 flex w-screen items-center border-b border-[#ddd] bg-[#fff] p-0">
        <a href="/" className="relative">
          <h1 className="phone:text-[2rem] ml-2 cursor-pointer text-[1.5rem] font-bold text-[#000]">
            Wordle Clone
          </h1>
          <TbMeterCube
            color="#538D4E"
            size={"2rem"}
            className="phone:right-[-12%] phone:bottom-0 absolute bottom-[-5%] right-[-16%]"
          />
        </a>
        <label
          htmlFor="displayPanelBtn"
          className="ml-auto mr-[25%] cursor-pointer"
        >
          <PiRankingDuotone size={"2rem"} />
        </label>
        <button
          id="displayPanelBtn"
          className="hidden"
          onClick={() => setDisplayPanel(true)}
        ></button>
        <label>
          <a
            href="https://www.nytimes.com/games/wordle/index.html"
            target="_blank"
            id="wordle-link"
            className="absolute right-8 inline-block justify-self-end text-[1rem] hover:underline"
          >
            Wordle
            <FiExternalLink className="absolute bottom-0 right-[-0.8rem] text-[.9rem]" />
          </a>
        </label>
      </div>
      <div className="relative row-span-10 flex w-screen flex-col items-center">
        <Alarm content={alarmContent} display={displayAlarm} />
        <div
          className="grid h-[360px] w-[300px] grid-rows-6 gap-[5px] p-[10px]"
          ref={answerAreaRef}
        >
          {answerArea.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="row-span-1 grid w-[100%] grid-cols-5 gap-[5px]"
            >
              {row.map((valueStatePair, colIndex) => (
                <div
                  key={colIndex}
                  className={twMerge(
                    "inner col-span-1 border-2 border-[#ccc] text-[2rem] font-bold",
                    valueStatePair[0] != -1 &&
                      curAnswerRow == rowIndex &&
                      "pop border-[#000]",
                    rowIndex < curAnswerRow && "flip",
                  )}
                >
                  <div
                    className={twMerge(
                      "front flex items-center justify-center",
                      valueStatePair[0] != -1 && valueStatePair[1],
                    )}
                  >
                    {valueStatePair[0] !== -1
                      ? keyState[valueStatePair[0]].content
                      : ""}
                  </div>
                  <div
                    className={twMerge(
                      "back flex items-center justify-center",
                      valueStatePair[0] != -1 && valueStatePair[1],
                    )}
                  >
                    {valueStatePair[0] !== -1
                      ? keyState[valueStatePair[0]].content
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="grid h-[180px] w-[360px] grid-rows-3 gap-[8px] xxs:h-[198px] xxs:w-[484px]">
          {NumOfKeysAndOffset.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="row-span-1 grid gap-[6px]"
              style={{
                gridTemplateColumns: Array(row[0])
                  .fill("1fr")
                  .map((fr, index) =>
                    keyState[row[1] + index].isFunctionKey ? "1.5fr" : fr,
                  )
                  .join(" "),
                padding: rowIndex === 1 ? "0 5%" : "",
              }}
            >
              {Array.from({ length: row[0] }).map((_, colIndex) => {
                const key = keyState[row[1] + colIndex];
                return (
                  <div
                    key={row[1] + colIndex}
                    onClick={() =>
                      handleKeyClick(keyState[row[1] + colIndex].content)
                    }
                    className={twMerge(
                      `flex cursor-pointer items-center justify-center rounded-[4px] bg-[#D3D6DA] text-[1.2rem] font-bold ${key.state}`,
                      key.isFunctionKey && "text-[1rem]",
                    )}
                  >
                    {key.content === "BackSpace" ? (
                      <IoBackspaceOutline size={"1.5rem"} />
                    ) : (
                      key.content
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
