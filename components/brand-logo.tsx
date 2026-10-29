import Image from "next/image";

export function BrandLogo({
  priority = false,
  height = 40,
}: {
  priority?: boolean;
  height?: number;
}) {
  const width = Math.round(height * 3);

  return (
    <Image
      src="/kyamain.png"
      alt="KYA, Know Your Agent"
      width={width}
      height={height}
      priority={priority}
    />
  );
}
