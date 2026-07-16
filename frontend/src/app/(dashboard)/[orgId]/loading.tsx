import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-stone-400">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-vermillion-500" />
      <p className="text-sm font-medium animate-pulse text-stone-500">Loading...</p>
    </div>
  );
}
