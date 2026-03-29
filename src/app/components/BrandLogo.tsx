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
            ? "relative top-[2px] w-52 h-auto max-h-[46px] object-contain [clip-path:inset(2%_0_2%_0)]"
            : "relative top-[2px] w-[340px] h-auto max-h-[56px] object-contain [clip-path:inset(2%_0_2%_0)] sm:w-[390px] sm:max-h-[64px]"
        }
      />
    </Link>
  );
}
