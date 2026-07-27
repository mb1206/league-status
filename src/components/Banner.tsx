import type { ReactNode } from "react";
import type { DivisionStanding, SeasonStatus, Standing } from "../domain/types";

interface BannerProps {
  icon: string;
  logoUrl?: string;
  teamName: string;
  hasPlayoffs?: boolean;
  division?: DivisionStanding;
  currentTeamId?: string;
  seasonStatus: SeasonStatus;
  standing: Standing;
  links?: ReactNode; // rendered inline just after the season status
}

function endDateText(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function Banner({
  icon,
  logoUrl,
  teamName,
  hasPlayoffs = false,
  division,
  currentTeamId,
  seasonStatus,
  standing,
  links,
}: BannerProps) {
  const standingText = standing.summary ?? "";
  const endLabel = hasPlayoffs ? "Playoffs start" : "Season ends";
  return (
    <div className="banner" data-phase={seasonStatus.phase}>
      <span className="banner-team">
        {logoUrl ? (
          <img className="banner-logo" src={logoUrl} alt="" aria-hidden width={24} height={24} />
        ) : (
          <span aria-hidden>{icon}</span>
        )}{" "}
        {teamName}
      </span>
      <span className="banner-status">
        {seasonStatus.label}
        {seasonStatus.progress && (
          <span className="banner-progress" tabIndex={0}>
            {" · "}
            <span className="banner-progress-value">{seasonStatus.progress.percent}%</span>
            <span className="season-tooltip" role="tooltip">
              {seasonStatus.progress.played} of {seasonStatus.progress.total} games · {endLabel}{" "}
              {endDateText(seasonStatus.progress.endDate)}
            </span>
          </span>
        )}
      </span>
      {links}
      <span className="banner-standing">
        {standingText &&
          (division ? (
            <span className="division-hover" tabIndex={0}>
              {standingText}
              <span className="division-popover" role="tooltip">
                {division.entries.map((e, i) => (
                  <span
                    key={e.teamId}
                    className={`division-row${e.teamId === currentTeamId ? " current" : ""}`}
                  >
                    <span className="division-rank">{i + 1}</span>
                    {e.logoUrl && (
                      <img src={e.logoUrl} alt="" aria-hidden width={16} height={16} />
                    )}
                    <span className="division-team">{e.name}</span>
                    <span className="division-record">{e.record}</span>
                  </span>
                ))}
              </span>
            </span>
          ) : (
            standingText
          ))}
        {standingText && standing.overall ? " · " : ""}
        {standing.overall}
      </span>
    </div>
  );
}
