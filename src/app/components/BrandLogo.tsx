import { Link } from "react-router";
import tawlaImage from "../../assets/tawla.png";
import tawlaDarkImage from "../../assets/tawla2.png";

interface BrandLogoProps {
  dark?: boolean;
  showTagline?: boolean;
  compact?: boolean;
}

export function BrandLogo({ dark = false, compact = false }: BrandLogoProps) {
  const activeLogo = dark ? tawlaDarkImage : tawlaImage;

  return (
    <Link to="/" className="flex items-center">
      <img
        src={activeLogo}
        alt="Journal Immobilier"
        className={
          compact
            ? "relative top-[2px] h-auto w-40 max-h-[42px] object-contain [clip-path:inset(2%_0_2%_0)] sm:w-52 sm:max-h-[50px] lg:w-60 lg:max-h-[54px]"
            : "relative top-[2px] h-auto w-[190px] max-h-[52px] object-contain [clip-path:inset(2%_0_2%_0)] sm:w-[260px] sm:max-h-[66px] lg:w-[360px] lg:max-h-[82px]"
        }
      />
    </Link>
  );
}
