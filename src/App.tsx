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
import { KeyType } from "./Types/type";
// 要先安裝 "npm install vite-plugin-raw --save-dev" 再把路徑最後加上"?raw" 完成本地assets file import
import guessWordlist from "./assets/wordle-La.txt?raw";
import allowedGuessWordlist from "./assets/wordle-Ta.txt?raw";
import Alarm from "./Componenets/Alarm.tsx";
import useLocalStorage from "./Hooks/useLocalStorage.tsx";

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

  const [currentDate, setCurrentDate] = useLocalStorage<string>(
    "currentDate",
    "",
  );

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (today != currentDate) {
      // update the date and answer
      setCurrentDate(today);
      setAnswer(() => {
        const index = Math.floor(new Date().getTime() / (24 * 60 * 60 * 1000));
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

  const [display, setDisplay] = useState(false);

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
    setDisplay(true);

    // Set a new timeout to hide the alarm after 2 seconds
    timeoutRef.current = setTimeout(() => {
      setDisplay(false);
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

      setCurAnswerRow((curRow) => {
        if (curRow == 5) {
          setIsGameOver(true); // 若6次機會用完遊戲就結束
        }
        return curRow + 1;
      });
      setCurAnswerCol(0);
      setIsRunning(false);
      // 把數字加起來看看是否等於10 是的話就全對
      if (result.reduce((num, cur) => num + cur, 0) == 10) {
        setIsGameOver(true);
        // run winning animation
        for (let [letterIndex, letter] of Array.from(letters).entries()) {
          setTimeout(() => {
            letter.classList.add("bounce");
          }, letterIndex * 300);
        }
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
    <div className="grid h-screen w-screen grid-rows-11 bg-[#fff]">
      <div className="xs:flex absolute bottom-2 right-8 hidden flex-col items-center justify-center gap-0">
        <span>網頁時間</span>
        <span className="font-bold">{currentDate}</span>
      </div>
      <div className="relative row-span-1 flex w-screen items-center border-b border-[#ddd] bg-[#fff] p-0">
        <a href="/">
          <h1 className="ml-2 cursor-pointer text-[2rem] font-bold text-[#000]">
            Wordle Clone
          </h1>
        </a>
        <label>
          <a
            href="https://www.nytimes.com/games/wordle/index.html"
            target="_blank"
            id="wordle-link"
            className="absolute right-8 inline-block justify-self-end text-[1rem] hover:underline"
          >
            Wordle
            <FiExternalLink className="absolute bottom-0 right-[-.8rem] text-[.9rem]" />
          </a>
        </label>
      </div>
      <div className="relative row-span-10 flex w-screen flex-col items-center">
        <Alarm content={alarmContent} display={display} />
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
        <div className="xxs:w-[484px] xxs:h-[198px] grid h-[180px] w-[360px] grid-rows-3 gap-[8px]">
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
