export default function VideoBackground({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      className="fixed inset-0 w-full h-full object-cover z-0"
    />
  );
}
