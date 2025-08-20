import { FreebetPlanner } from "@/components/freebet-planner"
import { RequireAuth } from "@/components/require-auth"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <RequireAuth>
        <FreebetPlanner />
      </RequireAuth>
    </main>
  )
}
