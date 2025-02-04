import Navbar from "@/components/navbar/Navbar";
import GoldenText from "@/ui/GoldenText";

export default function Home() {
  return (
    <div className="dark:bg-gray-700 h-screen overflow-y-hidden  bg-white">
      <Navbar />
      <div className="uppercase w-full text-center h-full mt-32">
        <GoldenText text="Gajanand Finance" />
      </div>
    </div>
  );
}
