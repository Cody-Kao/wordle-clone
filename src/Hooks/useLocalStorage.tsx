import { useEffect, useState } from "react";

// generic custom hook
export default function useLocalStorage<T>(
  key: string,
  initValue: T | (() => T),
): [T, (value: T | ((newValue: T) => T)) => void] {
  // first get the stored value with key or just initialize it
  const [value, setValue] = useState(() => {
    const storedValue = localStorage.getItem(key);
    if (storedValue != null) {
      return JSON.parse(storedValue);
    }

    if (initValue instanceof Function) {
      return initValue();
    } else {
      return initValue;
    }
  });
  // write back to localstorage once we change the value
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value]);

  return [value, setValue];
}
