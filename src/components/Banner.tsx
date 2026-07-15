import type { SeasonStatus, Standing } from "../domain/types";

interface BannerProps {
  icon: string;
  logoUrl?: string;
  leagueName: string;
  teamName: string;
  seasonStatus: SeasonStatus;
  standing: Standing;
}

export function Banner({
  icon,
  logoUrl,
  leagueName,
  teamName,
  seasonStatus,
  standing,
}: BannerProps) {
  const standingText = standing.summary ?? "";
  return (
    <div className="banner" data-phase={seasonStatus.phase}>
      <span className="banner-team">
        {logoUrl ? (
          <img className="banner-logo" src={logoUrl} alt="" aria-hidden width={24} height={24} />
        ) : (
          <span aria-hidden>{icon}</span>
        )}{" "}
        {teamName}
        <span className="banner-league"> · {leagueName}</span>
      </span>
      <span className="banner-status">{seasonStatus.label}</span>
      <span className="banner-standing">
        {[standingText, standing.overall].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}
