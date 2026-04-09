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
            ? "relative top-[2px] w-60 h-auto max-h-[54px] object-contain [clip-path:inset(2%_0_2%_0)]"
            : "relative top-[2px] w-[300px] h-auto max-h-[72px] object-contain [clip-path:inset(2%_0_2%_0)] sm:w-[360px] sm:max-h-[82px]"
        }
      />
    </Link>
  );
}
