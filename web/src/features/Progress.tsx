import { useEffect, useRef, useState } from "react";
import { CountUp } from "../components/CountUp";
import { prefersReducedMotion } from "../lib/motion";
import { NavLink } from "react-router-dom";
import "./progress.css";
import {
  getLocalCheckIns,
  getLocalCustomization,
  getLocalHabitLogs,
  getLocalHabits,
  getLocalGoals,
  getLocalReadingSessions,
  clearHabitLog,
  goalProgress,
  logHabit,
  overallStreak,
  today,
} from "../lib/local-store";
import { useLocalRevision } from "../lib/use-local-revision";
import { getChallenges } from "./challenges/services/challenge.repository";
import {
  calculateChallengeProgress,
  defaultChallengeScoreCalculator,
} from "./challenges/services/challenge-progress.service";

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function Progress() {
  useLocalRevision();
  const [showHistory, setShowHistory] = useState(() =>
    window.matchMedia("(max-width: 700px)").matches,
  );
  const logs = getLocalHabitLogs();
  const habits = getLocalHabits().filter((habit) => habit.active);
  const goals = getLocalGoals().filter((goal) => goal.status === "active");
  const sessions = getLocalReadingSessions();
  const checkins = getLocalCheckIns();
  const hasProgressData =
    logs.length > 0 || sessions.length > 0 || checkins.length > 0;
  const challenge = getChallenges().find((item) => item.status === "ACTIVE");
  const now = new Date();
  const current = monthRange(now.getFullYear(), now.getMonth());
  const previous = monthRange(now.getFullYear(), now.getMonth() - 1);
  const streak = overallStreak(logs);
  const days = recentDays(14);
  const active = new Set(
    logs.filter((log) => log.status === "completed").map((log) => log.date),
  );
  const counts = new Map<string, number>();
  for (const log of logs)
    if (log.status === "completed")
      counts.set(log.date, (counts.get(log.date) ?? 0) + 1);
  const chart = days.map((date) => ({ date, amount: counts.get(date) ?? 0 }));
  const metrics = [
    {
      label: "Dias ativos",
      current: uniqueCompleted(logs, current),
      previous: uniqueCompleted(logs, previous),
    },
    {
      label: "Páginas lidas",
      current: pagesIn(sessions, current),
      previous: pagesIn(sessions, previous),
    },
    {
      label: "Check-ins",
      current: countIn(checkins, current),
      previous: countIn(checkins, previous),
    },
  ];
  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 700px)");
    const updateHistoryVisibility = (event: MediaQueryListEvent) =>
      setShowHistory(event.matches);
    mobileViewport.addEventListener("change", updateHistoryVisibility);
    return () =>
      mobileViewport.removeEventListener("change", updateHistoryVisibility);
  }, []);
  return (
    <>
      <header>
        <p className="eyebrow">VISÃO GERAL</p>
        <h1>Seu dia, no seu ritmo</h1>
        <p>Escolha uma ação pequena para avançar hoje.</p>
      </header>
      <section className="today-panel panel">
        <div className="today-heading">
          <div>
            <p className="eyebrow">HOJE</p>
            <h2>O que você quer concluir?</h2>
            <p>{habits.length ? `${habits.filter((habit) => logs.some((log) => log.habit_id === habit.id && log.date === today() && log.status === "completed")).length} de ${habits.length} hábitos concluídos` : "Comece com um hábito simples."}</p>
          </div>
          <NavLink className="button subtle" to="/habits">{habits.length ? "Gerenciar hábitos" : "Criar primeiro hábito"}</NavLink>
        </div>
        {habits.length > 0 && <div className="today-list">
          {habits.map((habit) => {
            const done = logs.some((log) => log.habit_id === habit.id && log.date === today() && log.status === "completed");
            return <div className="today-item" key={habit.id}>
              <span className={done ? "today-check done" : "today-check"} aria-hidden="true">{done ? "✓" : ""}</span>
              <strong>{habit.name}</strong>
              <button className={done ? "subtle" : ""} aria-label={done ? `Desfazer conclusão de ${habit.name}` : `Concluir ${habit.name}`} onClick={() => done ? clearHabitLog(habit.id, today()) : logHabit(habit.id, today(), "completed")}>{done ? "Desfazer" : "Concluir"}</button>
            </div>;
          })}
        </div>}
        {goals.length > 0 && <div className="today-goals">
          <span>Metas em andamento</span>
          {goals.slice(0, 2).map((goal) => <NavLink to="/goals" key={goal.id}>{goal.title} <strong>{Math.min(100, Math.round(goalProgress(goal) / goal.target_value * 100))}%</strong></NavLink>)}
        </div>}
      </section>
      {challenge && <CurrentCavern challenge={challenge} />}
      <FireJourney streak={streak} />
      <div className="progress-actions"><NavLink className="button subtle" to={challenge ? "/cavern" : habits.length ? "/checkins" : "/habits"}>{challenge ? "Continuar Caverna" : habits.length ? "Fazer check-in" : "Criar primeiro hábito"}</NavLink><NavLink className="button" to="/advisor">Conversar com a IA</NavLink></div>
      <section className="progress-details" aria-label="Histórico e estatísticas">
          <button
            className="progress-details-toggle"
            type="button"
            aria-expanded={showHistory}
            aria-controls="progress-history-content"
            onClick={() => setShowHistory((isOpen) => !isOpen)}
          >
            <span>
              <strong>{showHistory ? "Ocultar histórico e estatísticas" : "Ver histórico e estatísticas"}</strong>
              <small>Atividade, comparativo mensal e calendário</small>
            </span>
            <span className="progress-details-icon" aria-hidden="true">{showHistory ? "−" : "+"}</span>
          </button>
          {showHistory && hasProgressData && (
            <div className="progress-details-content" id="progress-history-content">
              <section className="visual-summary">
                <ActivityChart values={chart} />
              </section>
              <MonthlyComparison metrics={metrics} />
              <section className="calendar-section">
                <div>
                  <p className="eyebrow">CALENDÁRIO</p>
                  <h2>{monthLabel()}</h2>
                </div>
                <Calendar activeDates={active} />
              </section>
            </div>
          )}
          {showHistory && !hasProgressData && (
            <div className="progress-empty" id="progress-history-content">
              <strong>Seu progresso aparecerá aqui.</strong>
              <p>Conclua um hábito, registre uma leitura ou faça um check-in para iniciar os gráficos.</p>
              <NavLink className="button subtle" to="/habits">Criar primeiro hábito</NavLink>
            </div>
          )}
        </section>
    </>
  );
}

function CurrentCavern({
  challenge,
}: {
  challenge: ReturnType<typeof getChallenges>[number];
}) {
  const progress = calculateChallengeProgress(challenge);
  const score = defaultChallengeScoreCalculator.calculate(challenge, progress);
  return (
    <section className="panel current-cavern-home">
      <div>
        <p className="eyebrow">CAVERNA ATUAL</p>
        <h2>{challenge.name}</h2>
        <p>
          Dia {progress.currentDay} / {challenge.durationDays} · Hoje:{" "}
          {progress.today.filter((rule) => rule.completed).length} /{" "}
          {progress.today.length} regras
        </p>
        <div className="progress-track">
          <i style={{ width: `${progress.overall}%` }} />
        </div>
      </div>
      <div>
        <strong>{progress.overall}%</strong>
        <small>Cavern Score {score}</small>
        <NavLink className="button" to="/cavern">
          Continuar
        </NavLink>
      </div>
    </section>
  );
}

function FireJourney({ streak }: { streak: number }) {
  const loadout = getLocalCustomization();
  const thresholds = [0, 1, 7, 14, 28];
  const labels = [
    "Sua próxima chama",
    "Primeira chama",
    "Brasa firme",
    "Fogueira forte",
    "Chama lendária",
  ];
  const level = thresholds.reduce(
    (current, threshold, index) => (streak >= threshold ? index : current),
    0,
  );
  const remaining = (thresholds[level + 1] ?? streak) - streak;
  const message =
    level === 0
      ? "Conclua um hábito hoje para acender a fogueira. Cada recomeço conta."
      : level === 4
        ? "28 dias ou mais de constância. Continue cuidando da sua chama."
        : "Mais " +
          remaining +
          (remaining === 1 ? " dia para " : " dias para ") +
          labels[level + 1].toLowerCase() +
          ".";
  return (
    <section className={"fire-journey level-" + level}>
      <div className="fire-copy">
        <p className="eyebrow">SUA FOGUEIRA</p>
        <h2>{labels[level]}</h2>
        <p>{message}</p>
        <div className="fire-milestones">
          {thresholds.slice(1).map((value) => (
            <span className={streak >= value ? "reached" : ""} key={value}>
              {value}d
            </span>
          ))}
        </div>
      </div>
      <div className="camp-scene">
        <StreakScene level={level} loadout={loadout} />
      </div>
      <strong className="fire-count">
        <CountUp value={streak} />
        <small>{streak === 1 ? "dia seguido" : "dias seguidos"}</small>
      </strong>
    </section>
  );
}

export function StreakScene({
  level,
  loadout,
}: {
  level: number;
  loadout: ReturnType<typeof getLocalCustomization>;
}) {
  const scale = [0, 0.6, 0.8, 1, 1.15][level];
  const sceneRef = useRef<SVGSVGElement>(null);
  const isBat = loadout.mascot_id === "bat";
  useEffect(() => {
    // Os olhos do mascote acompanham o ponteiro dentro do rosto (limites em unidades do SVG), sem re-renderizar.
    if (prefersReducedMotion()) return;
    const [maxX, maxY] = isBat ? [5, 4] : [10, 6];
    let frame = 0;
    const look = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = sceneRef.current;
        if (!svg) return;
        const box = svg.getBoundingClientRect();
        const dx = event.clientX - (box.left + (90 * box.width) / 300);
        const dy = event.clientY - (box.top + (106 * box.height) / 200);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 90);
        svg.style.setProperty("--ex", String((dx / distance) * reach * maxX));
        svg.style.setProperty("--ey", String((dy / distance) * reach * maxY));
      });
    };
    window.addEventListener("pointermove", look, { passive: true });
    return () => { window.removeEventListener("pointermove", look); cancelAnimationFrame(frame); };
  }, [isBat]);
  const fire = (
    {
      "fire-blue": ["#3b9dff", "#b5e7ff"],
      "fire-purple": ["#a16cff", "#ead9ff"],
      "fire-green": ["#29b878", "#b8ffd0"],
      "fire-rose": ["#ee69a8", "#ffd2e8"],
      "fire-sun": ["#ffc247", "#fff4a2"],
    } as Record<string, [string, string]>
  )[loadout.fire_skin_id] ?? ["#f58d38", "#ffdc79"];
  const mascotColor = loadout.mascot_id === 'bot-copper' ? '#d98d5b' : loadout.mascot_id === 'bot-moss' ? '#7aab77' : '#9c7de8';
  const mascotShadow = loadout.mascot_id === 'bot-copper' ? '#94603e' : loadout.mascot_id === 'bot-moss' ? '#4d7852' : '#69529f';
  return (
    <svg
      ref={sceneRef}
      className="streak-scene"
      viewBox="0 0 300 200"
      role="img"
      aria-label={
        level === 0
          ? "Mascote Cavern pronto para acender a fogueira"
          : "Mascote Cavern ao lado da sua fogueira acesa"
      }
    >
      <ellipse cx="150" cy="179" rx="130" ry="10" fill="#000" opacity=".12" />
      {loadout.mascot_id === "bat" ? (
        <g className="scene-mascot scene-bat"><g transform="translate(37 61)">
          <path
            d="M52 45Q19 8 0 35Q13 44 6 63Q29 61 43 77Q55 61 78 63Q71 44 85 35Q66 8 33 45Z"
            fill="#6b558a"
          />
          <circle cx="43" cy="45" r="23" fill="#27212e" />
          {loadout.head_item_id === "cap" && (
            <>
              <path d="M20 29Q43 4 66 29Z" fill="#2d7ec7" />
              <path d="M45 27Q68 27 77 35Q57 33 43 31Z" fill="#23649e" />
            </>
          )}
          <circle className="scene-eye" cx="35" cy="42" r="3" fill="#ffcf73" />
          <circle className="scene-eye" cx="51" cy="42" r="3" fill="#ffcf73" />
          {loadout.accessory_item_id === "glasses" && (
            <>
              <circle
                cx="35"
                cy="42"
                r="7"
                fill="none"
                stroke="#7fc7e8"
                strokeWidth="2"
              />
              <circle
                cx="51"
                cy="42"
                r="7"
                fill="none"
                stroke="#7fc7e8"
                strokeWidth="2"
              />
              <path d="M42 42H44" stroke="#7fc7e8" strokeWidth="2" />
            </>
          )}
        </g></g>
      ) : (
        <g className="scene-mascot">
          {loadout.body_item_id === 'cloak' && <path d="M54 75Q35 89 26 161Q89 194 154 160Q143 92 123 74Z" fill="#633e92" stroke="#af83dc" strokeWidth="3" />}
          <path
            d="M39 159Q20 119 48 76Q62 48 89 39Q117 49 136 81Q159 121 135 159Z"
            fill={mascotColor}
            stroke={mascotShadow}
            strokeWidth="3"
          />
          <path
            d="M52 133V107Q52 67 89 62Q127 67 127 107V133Q92 153 52 133Z"
            fill="#20202c"
          />
          <ellipse className="scene-eye" cx="75" cy="106" rx="6" ry="8" fill="#ffcf73" />
          <ellipse className="scene-eye" cx="106" cy="106" rx="6" ry="8" fill="#ffcf73" />
          <path
            d={level === 0 ? "M84 127H97" : "M83 122Q90 132 98 122"}
            fill="none"
            stroke="#ffcf73"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M48 139Q30 147 36 162M132 139Q148 141 155 128"
            fill="none"
            stroke={mascotColor}
            strokeWidth="14"
            strokeLinecap="round"
          />
          <ellipse cx="67" cy="172" rx="22" ry="10" fill={mascotShadow} />
          <ellipse cx="116" cy="172" rx="22" ry="10" fill={mascotShadow} />
          {loadout.body_item_id === 'scarf' && <path d="M52 139Q90 156 130 137L126 151Q91 169 54 151Z" fill="#c94e65" stroke="#ff9cae" strokeWidth="2" />}
          {loadout.head_item_id === "cap" && (
            <>
              <path d="M53 83Q89 48 125 83Z" fill="#2d7ec7" />
              <path d="M88 79Q119 77 137 91Q108 88 84 86Z" fill="#23649e" />
            </>
          )}
          {loadout.head_item_id === "miner-helmet" && (
            <path
              d="M52 89Q89 48 126 89Z"
              fill="#f3b84a"
              stroke="#9f7121"
              strokeWidth="3"
            />
          )}
          {loadout.head_item_id === 'beanie' && <path d="M51 85Q53 43 89 39Q124 43 128 85Z" fill="#39446e" stroke="#8296cf" strokeWidth="4" />}
          {loadout.head_item_id === 'crown' && <path d="M53 81L57 54L72 70L89 44L106 70L121 54L127 81Z" fill="#ffcc63" stroke="#a86622" strokeWidth="3" />}
          {loadout.accessory_item_id === "glasses" && (
            <>
              <circle
                cx="75"
                cy="106"
                r="11"
                fill="none"
                stroke="#7fc7e8"
                strokeWidth="3"
              />
              <circle
                cx="106"
                cy="106"
                r="11"
                fill="none"
                stroke="#7fc7e8"
                strokeWidth="3"
              />
              <path d="M86 106H95" stroke="#7fc7e8" strokeWidth="3" />
            </>
          )}
          {loadout.accessory_item_id === 'monocle' && <><circle cx="106" cy="106" r="12" fill="none" stroke="#e4c46e" strokeWidth="3" /><path d="M117 113Q124 125 121 139" fill="none" stroke="#e4c46e" strokeWidth="2" /></>}
          {loadout.accessory_item_id === 'star-glasses' && <><path d="M75 92L79 101L89 102L82 110L84 120L75 115L66 120L68 110L61 102L71 101Z M106 92L110 101L120 102L113 110L115 120L106 115L97 120L99 110L92 102L102 101Z" fill="none" stroke="#ffd371" strokeWidth="3" /></>}
        </g>
      )}
      {loadout.mascot_id === 'bat' && loadout.body_item_id === 'scarf' && <path d="M59 127Q81 143 105 127L101 140Q82 150 63 140Z" fill="#c94e65" stroke="#ff9cae" strokeWidth="2" />}
      {loadout.mascot_id === 'bat' && loadout.body_item_id === 'cloak' && <path d="M56 121Q82 140 108 121L118 151Q80 173 45 151Z" fill="#633e92" stroke="#af83dc" strokeWidth="2" />}
      {loadout.mascot_id === 'bat' && loadout.head_item_id === 'beanie' && <path d="M57 94Q59 63 81 61Q104 63 106 94Z" fill="#39446e" stroke="#8296cf" strokeWidth="3" />}
      {loadout.mascot_id === 'bat' && loadout.head_item_id === 'miner-helmet' && <path d="M57 94Q82 60 107 94Z" fill="#f3b84a" stroke="#9f7121" strokeWidth="3" />}
      {loadout.mascot_id === 'bat' && loadout.head_item_id === 'crown' && <path d="M59 90L61 72L72 82L82 64L93 82L103 72L106 90Z" fill="#ffcc63" stroke="#a86622" strokeWidth="2" />}
      {loadout.mascot_id === 'bat' && loadout.accessory_item_id === 'monocle' && <circle cx="88" cy="103" r="9" fill="none" stroke="#e4c46e" strokeWidth="2" />}
      {loadout.mascot_id === 'bat' && loadout.accessory_item_id === 'star-glasses' && <path d="M72 95L75 101L82 102L77 108L78 115L72 111L66 115L67 108L62 102L69 101Z M89 95L92 101L99 102L94 108L95 115L89 111L83 115L84 108L79 102L86 101Z" fill="none" stroke="#ffd371" strokeWidth="2" />}
      {level > 0 && (
        <ellipse
          className="scene-glow"
          cx="225"
          cy="165"
          rx="43"
          ry="17"
          fill="#ffb24a"
          opacity=".16"
        />
      )}
      <path
        d="M185 169L263 182M190 181L259 165"
        stroke="#88583b"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {level > 0 ? (
        <g
          className="scene-fire"
          transform={"translate(223 163) scale(" + scale + ")"}
        >
          <g className="scene-flame">
          <path
            d="M0 0C-39-4-32-40-15-55C-15-35-6-32-7-47C-8-65 7-83 12-94C14-61 46-43 28-13C22-2 11 3 0 0Z"
            fill={fire[0]}
          />
          <path
            className="scene-flame-core"
            d="M0-2C-15-14-9-30 3-48C3-33 20-26 14-12C12-5 5 0 0-2Z"
            fill={fire[1]}
          />
          </g>
          {[-12, 6, -3, 14, -8].map((x, index) => <circle className="scene-spark" key={index} cx={x} cy={-38 - index * 4} r={index % 2 ? 1.8 : 2.4} fill={fire[1]} />)}
        </g>
      ) : (
        <path
          className="scene-smoke"
          d="M221 144Q209 130 223 118M231 117Q242 101 231 91"
          stroke="#96949e"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity=".6"
        />
      )}
      {loadout.effect_item_id === 'sparks' && <g fill="#ffd371"><circle cx="204" cy="47" r="2"/><circle cx="257" cy="66" r="3"/><circle cx="186" cy="96" r="2"/><path d="M239 34l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>}
      {loadout.effect_item_id === 'fireflies' && <g fill="#a5ffb7"><circle cx="20" cy="62" r="3"/><circle cx="151" cy="45" r="2"/><circle cx="270" cy="82" r="3"/><circle cx="160" cy="121" r="2"/><circle cx="246" cy="36" r="2"/></g>}
    </svg>
  );
}

function MonthlyComparison({
  metrics,
}: {
  metrics: { label: string; current: number; previous: number }[];
}) {
  return (
    <section className="monthly-progress">
      <div className="chart-title">
        <div>
          <p className="eyebrow">COMPARAÇÃO</p>
          <h2>Este mês x mês anterior</h2>
        </div>
        <span>evolução mensal</span>
      </div>
      <div className="monthly-bars">
        {metrics.map((item) => (
          <div className="monthly-metric" key={item.label}>
            <div className="monthly-values">
              <strong>{item.current}</strong>
              <span>vs {item.previous}</span>
            </div>
            <div
              className="bar-pair"
              title={`${item.label}: ${item.current} este mês, ${item.previous} mês anterior`}
            >
              <i
                style={{
                  height: `${(item.current / Math.max(1, item.current, item.previous)) * 100}%`,
                }}
              />
              <b
                style={{
                  height: `${(item.previous / Math.max(1, item.current, item.previous)) * 100}%`,
                }}
              />
            </div>
            <small>{item.label}</small>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-current" /> Este mês
        </span>
        <span>
          <i className="legend-previous" /> Mês anterior
        </span>
      </div>
    </section>
  );
}
function ActivityChart({
  values,
}: {
  values: { date: string; amount: number }[];
}) {
  const max = Math.max(1, ...values.map((item) => item.amount));
  const width = 620;
  const gap = 10;
  const barWidth = (width - gap * (values.length + 1)) / values.length;
  return (
    <article className="activity-chart">
      <div className="chart-title">
        <div>
          <p className="eyebrow">ATIVIDADE</p>
          <h2>Últimos 14 dias</h2>
        </div>
        <span>hábitos concluídos</span>
      </div>
      <div className="activity-chart-scroll" role="region" aria-label="Navegação horizontal do gráfico" tabIndex={0}>
        <svg
          role="img"
          aria-label="Gráfico de hábitos concluídos nos últimos catorze dias"
          viewBox={`0 0 ${width} 210`}
        >
          <line x1="0" x2={width} y1="170" y2="170" className="chart-axis" />
          {values.map((item, index) => {
            const h = (item.amount / max) * 132;
            const x = gap + index * (barWidth + gap);
            return (
              <g key={item.date}>
                <rect
                  className="chart-bar"
                  x={x}
                  y={170 - h}
                  width={barWidth}
                  height={h}
                  rx="4"
                >
                  <title>{item.amount} hábito(s) em {item.date}</title>
                </rect>
                <text x={x + barWidth / 2} y="194" textAnchor="middle">
                  {shortDay(item.date)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </article>
  );
}
function Calendar({ activeDates }: { activeDates: Set<string> }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + days }, (_, i) =>
    i < offset ? null : i - offset + 1,
  );
  return (
    <article className="calendar">
      <div className="calendar-weekdays">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (!day) return <i key={`empty-${i}`} />;
          const key = localDate(now.getFullYear(), now.getMonth(), day);
          const done = activeDates.has(key);
          return (
            <div
              className={`calendar-day ${done ? "done" : ""} ${key === today() ? "today" : ""}`}
              key={key}
            >
              <span>{day}</span>
              {done && <b>•</b>}
            </div>
          );
        })}
      </div>
      <div className="calendar-legend">
        <span>
          <i className="legend-active" /> Atividade concluída
        </span>
        <span>
          <i className="legend-today" /> Hoje
        </span>
      </div>
    </article>
  );
}
function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1, 12);
  const end = new Date(year, month + 1, 0, 12);
  return {
    start: localDate(start.getFullYear(), start.getMonth(), 1),
    end: localDate(end.getFullYear(), end.getMonth(), end.getDate()),
  };
}
function uniqueCompleted(
  logs: ReturnType<typeof getLocalHabitLogs>,
  range: { start: string; end: string },
) {
  return new Set(
    logs
      .filter(
        (log) =>
          log.status === "completed" &&
          log.date >= range.start &&
          log.date <= range.end,
      )
      .map((log) => log.date),
  ).size;
}
function pagesIn(
  sessions: ReturnType<typeof getLocalReadingSessions>,
  range: { start: string; end: string },
) {
  return sessions
    .filter(
      (item) =>
        new Date(item.started_at).toLocaleDateString("en-CA") >= range.start &&
        new Date(item.started_at).toLocaleDateString("en-CA") <= range.end,
    )
    .reduce((sum, item) => sum + item.pages_read, 0);
}
function countIn(
  items: ReturnType<typeof getLocalCheckIns>,
  range: { start: string; end: string },
) {
  return items.filter(
    (item) => item.date >= range.start && item.date <= range.end,
  ).length;
}
function recentDays(count: number) {
  const result: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    result.push(localDate(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return result;
}
function localDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12).toLocaleDateString("en-CA");
}
function shortDay(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "narrow" }).format(
    new Date(`${date}T12:00:00`),
  );
}
function monthLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}
