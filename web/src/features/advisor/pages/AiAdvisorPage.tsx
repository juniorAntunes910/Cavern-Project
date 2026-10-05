import { AiAdvisorChat } from '../components/AiAdvisorChat'
import { AiWeeklyReview } from '../components/AiWeeklyReview'

export function AiAdvisorPage() {
  return <>
    <header>
      <p className="eyebrow">CAVERN ADVISOR</p>
      <h1>Assistente IA</h1>
      <p>Converse sobre sua rotina, seus objetivos e como você está se sentindo. Você escolhe quais dados locais podem ser analisados.</p>
    </header>
    <AiWeeklyReview />
    <AiAdvisorChat />
  </>
}
