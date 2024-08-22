export default function Alarm({
  content,
  display,
}: {
  content: string;
  display: boolean;
}) {
  return (
    <div
      className={`${display ? "block" : "hidden"} absolute top-2 z-10 h-[45px] rounded-[4px] bg-[#000] px-[15px] py-[13px] text-center text-[.8rem] font-bold text-[#fff]`}
    >
      {content}
    </div>
  );
}
