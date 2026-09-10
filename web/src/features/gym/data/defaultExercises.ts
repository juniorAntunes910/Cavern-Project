import type { Exercise, ExerciseEquipment, ExerciseMuscleGroup } from '../domain'

const groups: Array<[ExerciseMuscleGroup, ExerciseEquipment, string[]]> = [
  ['CHEST', 'BARBELL', ['Supino reto com barra', 'Supino inclinado com barra', 'Supino declinado com barra']], ['CHEST', 'DUMBBELL', ['Supino reto com halteres', 'Supino inclinado com halteres', 'Crucifixo reto', 'Crucifixo inclinado']], ['CHEST', 'MACHINE', ['Peck Deck', 'Chest Press']], ['CHEST', 'CABLE', ['Crossover', 'Crossover alto', 'Crossover baixo']], ['CHEST', 'BODYWEIGHT', ['Flexão de braço']],
  ['BACK', 'CABLE', ['Puxada frontal', 'Puxada pegada aberta', 'Puxada pegada fechada', 'Puxada neutra', 'Remada baixa', 'Pulldown', 'Pullover na polia']], ['BACK', 'BODYWEIGHT', ['Barra fixa']], ['BACK', 'BARBELL', ['Remada curvada com barra', 'Remada cavalinho']], ['BACK', 'DUMBBELL', ['Remada unilateral com halter']], ['BACK', 'MACHINE', ['Remada máquina']],
  ['SHOULDERS', 'BARBELL', ['Desenvolvimento com barra', 'Remada alta']], ['SHOULDERS', 'DUMBBELL', ['Desenvolvimento com halteres', 'Elevação lateral', 'Elevação frontal', 'Arnold Press', 'Crucifixo inverso']], ['SHOULDERS', 'MACHINE', ['Desenvolvimento máquina']], ['SHOULDERS', 'CABLE', ['Elevação lateral na polia', 'Face Pull']],
  ['BICEPS', 'BARBELL', ['Rosca direta com barra', 'Rosca Scott', 'Rosca inversa']], ['BICEPS', 'CABLE', ['Rosca direta na polia', 'Rosca Bayesian']], ['BICEPS', 'DUMBBELL', ['Rosca alternada', 'Rosca martelo', 'Rosca concentrada', 'Rosca inclinada']],
  ['TRICEPS', 'CABLE', ['Tríceps pulley', 'Tríceps corda', 'Tríceps francês', 'Tríceps unilateral']], ['TRICEPS', 'BARBELL', ['Tríceps testa', 'Supino fechado']], ['TRICEPS', 'BODYWEIGHT', ['Mergulho', 'Paralela']], ['TRICEPS', 'MACHINE', ['Tríceps máquina']],
  ['LEGS', 'BARBELL', ['Agachamento livre', 'Stiff', 'Levantamento terra romeno', 'Afundo', 'Passada', 'Agachamento búlgaro']], ['LEGS', 'MACHINE', ['Agachamento Smith', 'Agachamento Hack', 'Leg Press 45', 'Leg Press horizontal', 'Cadeira extensora', 'Mesa flexora', 'Cadeira flexora', 'Adutora', 'Abdutora']],
  ['GLUTES', 'BARBELL', ['Elevação pélvica', 'Hip Thrust', 'Afundo', 'Agachamento sumô']], ['GLUTES', 'MACHINE', ['Glúteo máquina']], ['GLUTES', 'CABLE', ['Coice na polia']], ['GLUTES', 'OTHER', ['Abdução de quadril']],
  ['CALVES', 'MACHINE', ['Panturrilha em pé', 'Panturrilha sentado', 'Panturrilha no leg press']], ['CALVES', 'BODYWEIGHT', ['Panturrilha unilateral']],
  ['CORE', 'BODYWEIGHT', ['Abdominal tradicional', 'Prancha', 'Prancha lateral', 'Elevação de pernas', 'Elevação de pernas na barra', 'Abdominal bicicleta', 'Russian Twist']], ['CORE', 'MACHINE', ['Abdominal máquina']], ['CORE', 'CABLE', ['Abdominal na polia']],
  ['CARDIO', 'CARDIO_MACHINE', ['Esteira', 'Bicicleta', 'Elíptico', 'Escada', 'Remo', 'Corrida', 'Caminhada']],
]
const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export const defaultExercises: Exercise[] = groups.flatMap(([muscleGroup, equipment, names]) => names.map(name => ({ id: `default-${slug(name)}`, name, muscleGroup, equipment, isCustom: false })))
