import './gym/gym-progress.css'
import { Select } from '../components/Select'
import { useMemo, useState } from "react";
import { createId } from "../lib/id";
import { today } from "../lib/local-store";
import { useLocalRevision } from "../lib/use-local-revision";
import { NumberStepper } from "../components/NumberStepper";
import type {
  Exercise,
  ExerciseMuscleGroup,
  WorkoutPlan,
  WorkoutSession,
  WorkoutSessionExercise,
} from "./gym/domain";
import {
  completeWorkout,
  createExercise,
  createWorkoutPlan,
  clearAttendance,
  getAttendance,
  getBodyWeight,
  getCompletedWorkoutCount,
  getExercises,
  getPreviousExerciseSets,
  getWeekStart,
  getWorkoutPlans,
  getWorkoutSessions,
  markAttendance,
  muscleLabels,
  saveBodyWeight,
  saveWorkoutPlan,
  saveWorkoutSession,
  sessionVolume,
  startWorkout,
} from "./gym/services/gym.service";

type Tab = "TODAY" | "PLANS" | "HISTORY" | "PROGRESS" | "ACTIVE";
const groups = Object.keys(muscleLabels) as ExerciseMuscleGroup[];
const date = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

export function Gym() {
  useLocalRevision();
  const [tab, setTab] = useState<Tab>("TODAY");
  const [session, setSession] = useState<WorkoutSession | null>(
    () =>
      getWorkoutSessions().find((item) => item.status === "IN_PROGRESS") ??
      null,
  );
  const plans = getWorkoutPlans();
  const finished = getWorkoutSessions().filter(
    (item) => item.status === "COMPLETED",
  );
  const attendance = getAttendance().find((item) => item.date === today());
  const week = getCompletedWorkoutCount(getWeekStart(), today());
  const begin = (plan?: WorkoutPlan) => {
    setSession(startWorkout(plan));
    setTab("ACTIVE");
  };
  return (
    <>
      <header>
        <p className="eyebrow">MOVIMENTO</p>
        <h1>Academia</h1>
        <p>Registre o treino em poucos toques.</p>
      </header>
      <nav className="gym-tabs">
        {(
          [
            ["TODAY", "Hoje"],
            ["PLANS", "Treinos"],
            ["HISTORY", "Histórico"],
            ["PROGRESS", "Progresso"],
          ] as const
        ).map(([id, text]) => (
          <button
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            key={id}
          >
            {text}
          </button>
        ))}
      </nav>
      {tab === "TODAY" && (
        <section className="stack">
          <article className="panel gym-attendance">
            <p className="eyebrow">HOJE · {date(today()).toUpperCase()}</p>
            <h2>Você treinou hoje?</h2>
            <div className="button-row">
              <button
                className={attendance?.status === "WENT" ? "selected" : "subtle"}
                aria-pressed={attendance?.status === "WENT"}
                onClick={() => attendance?.status === "WENT" ? clearAttendance(today()) : markAttendance(today(), "WENT")}
              >
                Fui à academia
              </button>
              <button
                className={
                  attendance?.status === "DID_NOT_GO"
                    ? "selected subtle"
                    : "subtle"
                }
                aria-pressed={attendance?.status === "DID_NOT_GO"}
                onClick={() => attendance?.status === "DID_NOT_GO" ? clearAttendance(today()) : markAttendance(today(), "DID_NOT_GO")}
              >
                Não fui
              </button>
            </div>
          </article>
          <article className="panel workout-card">
            <div>
              <p className="eyebrow">TREINO SUGERIDO</p>
              <h2>{plans[0]?.exercises.length ? plans[0].name : "Crie seu primeiro treino"}</h2>
              <p>{week} treinos concluídos nesta semana</p>
            </div>
            <button
              onClick={() => (plans[0]?.exercises.length ? begin(plans[0]) : setTab("PLANS"))}
            >
              {plans[0]?.exercises.length ? "Iniciar treino" : "Montar treino"}
            </button>
          </article>
        </section>
      )}
      {tab === "PLANS" && <Plans onBegin={begin} />}
      {tab === "ACTIVE" && session && (
        <Workout
          session={session}
          onSession={setSession}
          onFinish={() => {
            completeWorkout(session);
            setSession(null);
            setTab("HISTORY");
          }}
        />
      )}
      {tab === "HISTORY" && <History sessions={finished} />}
      {tab === "PROGRESS" && <Progress sessions={finished} />}
    </>
  );
}

function Plans({ onBegin }: { onBegin: (plan: WorkoutPlan) => void }) {
  useLocalRevision();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const plans = getWorkoutPlans();
  const create = () => {
    if (name.trim()) {
      setPlan(createWorkoutPlan(name.trim()));
      setName("");
    }
  };
  return (
    <section className="stack">
      <article className="panel">
        <p className="eyebrow">MEUS TREINOS</p>
        <div className="inline-form gym-input-row">
          <input
            aria-label="Nome do treino"
            value={name}
            placeholder="Ex.: Push A"
            onChange={(event) => setName(event.target.value)}
          />
          <button onClick={create}>Novo treino</button>
        </div>
      </article>
      {plan && <PlanEditor plan={plan} close={() => setPlan(null)} />}
      {plans.map((item) => (
        <article className="panel workout-card" key={item.id}>
          <div>
            <p className="eyebrow">{item.exercises.length} exercícios</p>
            <h2>{item.name}</h2>
            <p>
              {item.exercises
                .map(
                  (entry) =>
                    getExercises().find(
                      (exercise) => exercise.id === entry.exerciseId,
                    )?.name,
                )
                .filter(Boolean)
                .join(" · ") || "Adicione exercícios"}
            </p>
          </div>
          <div className="button-row">
            <button className="subtle" onClick={() => setPlan(item)}>
              Editar
            </button>
            <button disabled={item.exercises.length === 0} onClick={() => onBegin(item)}>Iniciar</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function PlanEditor({ plan, close }: { plan: WorkoutPlan; close: () => void }) {
  const [value, setValue] = useState(plan);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<ExerciseMuscleGroup | "ALL">("ALL");
  const [custom, setCustom] = useState("");
  const exercises = getExercises();
  const options = exercises.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      (group === "ALL" || item.muscleGroup === group),
  );
  const add = (exercise: Exercise) =>
    !value.exercises.some((item) => item.exerciseId === exercise.id) &&
    setValue((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: createId(),
          exerciseId: exercise.id,
          order: current.exercises.length + 1,
          defaultSets: 3,
          repsMin: 8,
          repsMax: 12,
        },
      ],
    }));
  const save = () => {
    saveWorkoutPlan({ ...value, updatedAt: new Date().toISOString() });
    close();
  };
  return (
    <article className="panel gym-editor">
      <p className="eyebrow">MONTAR TREINO</p>
      <label>
        Nome
        <input
          value={value.name}
          onChange={(event) => setValue({ ...value, name: event.target.value })}
        />
      </label>
      <h2>Exercícios do treino</h2>
      <div className="plan-cards">
        {value.exercises.map((entry, index) => (
          <article className="exercise-card" key={entry.id}>
            <strong>
              {index + 1}.{" "}
              {exercises.find((item) => item.id === entry.exerciseId)?.name}
            </strong>
            <label>
              Séries
              <input
                inputMode="numeric"
                type="number"
                min="1"
                value={entry.defaultSets}
                onChange={(event) =>
                  setValue({
                    ...value,
                    exercises: value.exercises.map((item) =>
                      item.id === entry.id
                        ? { ...item, defaultSets: Number(event.target.value) }
                        : item,
                    ),
                  })
                }
              />
            </label>
            <button
              className="subtle"
              onClick={() =>
                setValue({
                  ...value,
                  exercises: value.exercises.filter(
                    (item) => item.id !== entry.id,
                  ),
                })
              }
            >
              Remover
            </button>
          </article>
        ))}
      </div>
      <h3>Adicionar exercício</h3>
      <input
        value={search}
        placeholder="Buscar supino, puxada..."
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select
        value={group}
        onChange={(event) =>
          setGroup(event.target.value as ExerciseMuscleGroup | "ALL")
        }
      >
        <option value="ALL">Todos os grupos</option>
        {groups.map((item) => (
          <option value={item} key={item}>
            {muscleLabels[item]}
          </option>
        ))}
      </Select>
      <div className="exercise-picker">
        {options.slice(0, 12).map((item) => (
          <button className="subtle" onClick={() => add(item)} key={item.id}>
            + {item.name}
            <small>{muscleLabels[item.muscleGroup]}</small>
          </button>
        ))}
      </div>
      <div className="inline-form">
        <input
          value={custom}
          placeholder="Exercício não encontrado"
          onChange={(event) => setCustom(event.target.value)}
        />
        <button
          className="subtle"
          onClick={() => {
            if (custom.trim()) {
              add(
                createExercise({
                  name: custom.trim(),
                  muscleGroup: "OTHER",
                  equipment: "OTHER",
                }),
              );
              setCustom("");
            }
          }}
        >
          Criar
        </button>
      </div>
      <div className="button-row">
        <button className="subtle" onClick={close}>
          Cancelar
        </button>
        <button onClick={save}>Salvar treino</button>
      </div>
    </article>
  );
}

function Workout({
  session,
  onSession,
  onFinish,
}: {
  session: WorkoutSession;
  onSession: (value: WorkoutSession) => void;
  onFinish: () => void;
}) {
  const exercises = getExercises();
  const update = (value: WorkoutSession) => {
    saveWorkoutSession(value);
    onSession(value);
  };
  const addSet = (exerciseId: string) =>
    update({
      ...session,
      exercises: session.exercises.map((item) =>
        item.id === exerciseId
          ? {
              ...item,
              sets: [
                ...item.sets,
                {
                  id: createId(),
                  setNumber: item.sets.length + 1,
                  weightKg: 0,
                  reps: 0,
                  completed: false,
                },
              ],
            }
          : item,
      ),
    });
  const set = (
    exerciseId: string,
    setId: string,
    values: Partial<WorkoutSessionExercise["sets"][number]>,
  ) =>
    update({
      ...session,
      exercises: session.exercises.map((item) =>
        item.id === exerciseId
          ? {
              ...item,
              sets: item.sets.map((row) =>
                row.id === setId ? { ...row, ...values } : row,
              ),
            }
          : item,
      ),
    });
  return (
    <section className="stack workout-screen">
      <article className="panel workout-header">
        <p className="eyebrow">TREINO EM ANDAMENTO</p>
        <h1>{session.workoutName}</h1>
        <strong>{sessionVolume(session).toLocaleString("pt-BR")} kg</strong>
        <span>volume concluído</span>
      </article>
      {session.exercises.map((item) => (
        <ExerciseCard
          key={item.id}
          item={item}
          exercise={exercises.find((entry) => entry.id === item.exerciseId)}
          previous={getPreviousExerciseSets(item.exerciseId, session.id)}
          update={set}
          add={() => addSet(item.id)}
        />
      ))}
      {session.exercises.length === 0 && (
        <div className="empty">
          Este treino não tem exercícios. Edite a rotina antes de iniciar.
        </div>
      )}
      <button className="finish-workout" disabled={session.exercises.length === 0} onClick={onFinish}>
        Finalizar treino
      </button>
    </section>
  );
}

function ExerciseCard({
  item,
  exercise,
  previous,
  update,
  add,
}: {
  item: WorkoutSessionExercise;
  exercise?: Exercise;
  previous: ReturnType<typeof getPreviousExerciseSets>;
  update: (
    exerciseId: string,
    setId: string,
    values: Record<string, number | boolean>,
  ) => void;
  add: () => void;
}) {
  return (
    <article className="exercise-card active-exercise">
      <div>
        <p className="eyebrow">EXERCÍCIO</p>
        <h2>{exercise?.name ?? "Exercício"}</h2>
        {previous.length > 0 && (
          <p className="last-set">
            Última vez:{" "}
            {previous
              .map((set) => `${set.weightKg}kg × ${set.reps}`)
              .join(" · ")}
          </p>
        )}
      </div>
      {item.sets.map((row) => (
        <div className="set-control-card" key={row.id}>
          <strong>Série {row.setNumber}</strong>
          <NumberStepper
            label="Carga"
            suffix=" kg"
            value={row.weightKg}
            step={2.5}
            onChange={(weightKg) => update(item.id, row.id, { weightKg })}
          />
          <NumberStepper
            label="Repetições"
            value={row.reps}
            min={0}
            onChange={(reps) => update(item.id, row.id, { reps })}
          />
          <button
            className={row.completed ? "set-done" : "set-check"}
            onClick={() =>
              update(item.id, row.id, { completed: !row.completed })
            }
          >
            {row.completed ? "✓" : "○"}
          </button>
        </div>
      ))}
      <button className="add-set" onClick={add}>
        + Adicionar série
      </button>
    </article>
  );
}

function History({ sessions }: { sessions: WorkoutSession[] }) {
  const exercises = getExercises();
  return (
    <section className="stack">
      <p className="eyebrow">HISTÓRICO</p>
      {sessions.length === 0 ? (
        <div className="empty">Conclua um treino para vê-lo aqui.</div>
      ) : (
        sessions.map((session) => (
          <article className="panel" key={session.id}>
            <p className="eyebrow">{date(session.startedAt)}</p>
            <h2>{session.workoutName}</h2>
            <p>
              {
                session.exercises
                  .flatMap((item) => item.sets)
                  .filter((set) => set.completed).length
              }{" "}
              séries · {sessionVolume(session).toLocaleString("pt-BR")} kg
            </p>
            {session.exercises.map((item) => (
              <p className="muted" key={item.id}>
                <strong>
                  {
                    exercises.find((entry) => entry.id === item.exerciseId)
                      ?.name
                  }
                </strong>{" "}
                ·{" "}
                {item.sets
                  .filter((set) => set.completed)
                  .map((set) => `${set.weightKg}kg × ${set.reps}`)
                  .join(" · ")}
              </p>
            ))}
          </article>
        ))
      )}
    </section>
  );
}

function Progress({ sessions }: { sessions: WorkoutSession[] }) {
  useLocalRevision();
  const [weight, setWeight] = useState("");
  const [weightDate, setWeightDate] = useState(today());
  const [group, setGroup] = useState<ExerciseMuscleGroup | "ALL">("ALL");
  const [exerciseId, setExerciseId] = useState("");
  const weights = getBodyWeight().slice().reverse();
  const recordedIds = new Set(
    sessions.flatMap((session) =>
      session.exercises.map((item) => item.exerciseId),
    ),
  );
  const exercises = getExercises().filter(
    (item) =>
      recordedIds.has(item.id) &&
      (group === "ALL" || item.muscleGroup === group),
  );
  const exercisePoints = useMemo(
    () =>
      sessions
        .slice()
        .reverse()
        .flatMap((session) =>
          session.exercises
            .filter((item) => item.exerciseId === exerciseId)
            .map((item) => ({
              label: date(session.startedAt),
              value: Math.max(
                ...item.sets
                  .filter((set) => set.completed)
                  .map((set) => set.weightKg),
                0,
              ),
            })),
        ),
    [sessions, exerciseId],
  );
  const save = () => {
    const value = Number(weight.replace(",", "."));
    if (value > 0) {
      saveBodyWeight(weightDate, value);
      setWeight("");
    }
  };
  const existing = weights.find((item) => item.date === weightDate);
  return (
    <section className="stack">
      <article className="panel">
        <p className="eyebrow">PESO CORPORAL DIÁRIO</p>
        <h2>
          {weights.at(-1) ? `${weights.at(-1)?.weightKg.toLocaleString("pt-BR")} kg` : "Sem registro"}
        </h2>
        <div className="inline-form gym-input-row">
          <input
            aria-label="Data do peso"
            type="date"
            max={today()}
            value={weightDate}
            onChange={(event) => event.target.value && setWeightDate(event.target.value)}
          />
          <input
            aria-label="Peso em kg"
            inputMode="decimal"
            type="number"
            step="0.1"
            value={weight}
            placeholder={existing ? existing.weightKg.toLocaleString("pt-BR") : "72,4"}
            onChange={(event) => setWeight(event.target.value)}
          />
          <button onClick={save}>{existing ? "Atualizar peso" : "Registrar peso"}</button>
        </div>
        <LineChart
          title="Evolução do peso"
          points={weights.map((item) => ({
            label: date(item.date),
            value: item.weightKg,
          }))}
          suffix=" kg"
        />
      </article>
      <article className="panel">
        <p className="eyebrow">EVOLUÇÃO DOS TREINOS</p>
        <p className="muted">
          Escolha um grupo e acompanhe somente exercícios que você já registrou.
        </p>
        <div className="progress-filters">
          {(["ALL", ...groups] as const).map((item) => (
            <button
              key={item}
              className={group === item ? "selected" : "subtle"}
              onClick={() => {
                setGroup(item);
                setExerciseId("");
              }}
            >
              {item === "ALL" ? "Todos" : muscleLabels[item]}
            </button>
          ))}
        </div>
        <Select
          className="gym-exercise-select"
          aria-label="Exercício registrado"
          disabled={exercises.length === 0}
          value={exerciseId}
          onChange={(event) => setExerciseId(event.target.value)}
        >
          <option value="">{exercises.length ? "Escolha um exercício registrado" : "Nenhum exercício registrado neste filtro"}</option>
          {exercises.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <LineChart
          title={
            exerciseId ? "Maior carga por treino" : "Selecione um exercício"
          }
          points={exercisePoints}
          suffix=" kg"
        />
      </article>
    </section>
  );
}

function LineChart({
  title,
  points,
  suffix,
}: {
  title: string;
  points: Array<{ label: string; value: number }>;
  suffix: string;
}) {
  const format = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + suffix;
  if (points.length < 2)
    return (
      <div className="gym-chart gym-chart-empty">
        <div className="gym-chart-head">
          <strong>{title}</strong>
        </div>
        <div className="gym-chart-placeholder">
          <span aria-hidden="true">{points.length === 1 ? "📈" : "✦"}</span>
          <p>
            {points.length === 1
              ? `Primeiro registro: ${format(points[0].value)}. Registre mais um para desenhar a evolução.`
              : "Ainda não há registros neste filtro."}
          </p>
        </div>
      </div>
    );
  const values = points.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const x = (index: number) => (index / (points.length - 1)) * 100;
  const y = (value: number) => 12 + (1 - (value - min) / range) * 76;
  const line = points.map((point, index) => `${index ? "L" : "M"} ${x(index)} ${y(point.value)}`).join(" ");
  const area = `${line} L 100 100 L 0 100 Z`;
  const last = points[points.length - 1];
  const delta = last.value - points[0].value;
  const gradientId = `gym-fill-${title.replace(/\W+/g, "-")}`;
  return (
    <div className="gym-chart">
      <div className="gym-chart-head">
        <div>
          <strong>{title}</strong>
          <small>{points.length} registros</small>
        </div>
        <span className="gym-chart-value">{format(last.value)}</span>
      </div>
      <div className="gym-chart-plot" role="img" aria-label={`${title}: de ${format(points[0].value)} para ${format(last.value)}`}>
        <div className="gym-chart-axis" aria-hidden="true">
          <small>{format(max)}</small>
          <small>{format(min)}</small>
        </div>
        <div className="gym-chart-area">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--purple)" stopOpacity=".38" />
                <stop offset="100%" stopColor="var(--purple)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[12, 50, 88].map((line) => (
              <path key={line} d={`M0 ${line}H100`} className="grid-line" />
            ))}
            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} className="line" />
          </svg>
          {points.map((point, index) => (
            <i
              key={`${point.label}-${index}`}
              className={index === points.length - 1 ? "dot last" : "dot"}
              style={{ left: `${x(index)}%`, top: `${y(point.value)}%` }}
              title={`${point.label}: ${format(point.value)}`}
            />
          ))}
        </div>
      </div>
      <div className="chart-labels">
        <small>{points[0].label}</small>
        <small>{last.label}</small>
      </div>
      <dl className="gym-chart-stats">
        <div><dt>Maior</dt><dd>{format(max)}</dd></div>
        <div><dt>Menor</dt><dd>{format(min)}</dd></div>
        <div className={delta > 0 ? "up" : delta < 0 ? "down" : ""}><dt>Variação</dt><dd>{delta > 0 ? "+" : ""}{format(delta)}</dd></div>
      </dl>
    </div>
  );
}
