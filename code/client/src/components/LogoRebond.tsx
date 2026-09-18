import { useTheme } from "@/hooks/use-theme";
import { LogoWhite } from "@/components/MarketingNavbar";
import logoColore from "@assets/rebond-logo-h96.webp";

/**
 * Le logo Rebond, dans la version qui reste lisible sur le fond en place.
 *
 * Le mot « Rebond » du logo couleur est vert foncé : il disparaît sur un fond
 * sombre. On bascule donc sur la version blanche dès que le thème est sombre.
 */
export default function LogoRebond({ height = 32 }: { height?: number }) {
  const { theme } = useTheme();

  if (theme === "dark") return <LogoWhite height={height} />;

  return (
    <img
      src={logoColore}
      alt="Rebond"
      decoding="async"
      style={{ height, width: Math.round(height * (219 / 36.685)), objectFit: "contain", display: "block" }}
    />
  );
}
