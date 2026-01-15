export function IconCloud({ images }: { images?: string[] }) {
    return (
        <div className="flex flex-wrap justify-center gap-4 p-10">
            {images?.map((img, i) => (
                <div key={i} className="h-16 w-16 rounded-xl bg-white/10 p-2 backdrop-blur-sm transition-transform hover:scale-110">
                    <img src={img} alt="" className="h-full w-full object-contain" />
                </div>
            ))}
            {!images && (
                <div className="text-white/50">IconCloud Placeholder (Requires react-icon-cloud)</div>
            )}
        </div>
    );
}
