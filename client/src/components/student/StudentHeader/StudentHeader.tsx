import "./StudentHeader.css";

type StudentHeaderProps = {
  name: string;
  code: string;
  title?: string;
  connected?: boolean;
};

export default function StudentHeader({
  name,
  code,
  title,
  connected = true,
}: StudentHeaderProps) {
  return (
    <header className="student-header">
      <div className="student-header__brand">
        <div className="student-header__pulse-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div>
          <strong className="student-header__logo">
            Class Pulse
          </strong>

          {title && (
            <span className="student-header__class-title" dir="auto">
              {title}
            </span>
          )}
        </div>
      </div>

      <div className="student-header__identity">
        <div className="student-header__student">
          <span className="student-header__student-name" dir="auto">
            {name}
          </span>

          <span className="student-header__code">
            #{code}
          </span>
        </div>

        <span
          className={`student-header__connection ${
            connected
              ? "student-header__connection--online"
              : "student-header__connection--offline"
          }`}
          title={connected ? "Connected" : "Disconnected"}
          aria-label={connected ? "Connected" : "Disconnected"}
        />
      </div>
    </header>
  );
}