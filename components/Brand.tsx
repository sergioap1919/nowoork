import Image from "next/image";

type BrandSize = "nav" | "sidebar" | "mobile" | "auth" | "hero" | "footer";

export function Brand({ size = "nav", priority = false }: { size?: BrandSize; priority?: boolean }) {
  return (
    <span className={`brand brand--${size}`} aria-label="Nowoork">
      <Image
        className="brandImage brandImageLight"
        src="/nowoork-logo-light.png"
        alt="Nowoork"
        width={762}
        height={589}
        priority={priority}
      />
      <Image
        className="brandImage brandImageDark"
        src="/nowoork-logo-dark.png"
        alt=""
        aria-hidden="true"
        width={762}
        height={590}
        priority={priority}
      />
    </span>
  );
}
