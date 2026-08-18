import { useEffect, useState } from "react";

/** モバイルではキービジュアルの構図を組み替えるため、幅を見る（SSRではfalse） */
export function useNarrow(query = "(max-width: 560px)") {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return narrow;
}
