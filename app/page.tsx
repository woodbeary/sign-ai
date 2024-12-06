import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HandTracker } from "@/components/hand-tracking/hand-tracker"

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl font-bold">Sign AI</CardTitle>
            <CardDescription className="text-xl mt-2">
              Practice sign language with AI-powered hand tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Welcome to Sign AI, an interactive platform designed to help you learn and practice sign language alphabet. 
              Using advanced hand tracking technology and AI, we provide real-time feedback on your hand signs, 
              making learning both fun and effective.
            </p>
            <p className="text-muted-foreground">
              Get started by allowing camera access and following the on-screen instructions. 
              Practice at your own pace and improve your signing skills!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice Area</CardTitle>
            <CardDescription>
              Position your hand in front of the camera and make signs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HandTracker />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
