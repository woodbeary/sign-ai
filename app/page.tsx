'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HandTrackerWrapper } from "@/components/hand-tracking/client-wrapper"

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-full md:max-w-4xl mx-auto space-y-4 md:space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 md:space-y-4">
            <CardTitle className="text-2xl md:text-4xl font-bold text-center md:text-left">Sign AI</CardTitle>
            <CardDescription className="text-lg md:text-xl mt-1 md:mt-2">
              Practice sign language with AI-powered hand tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <p className="text-sm md:text-base">
              Welcome to Sign AI, an interactive platform designed to help you learn and practice sign language alphabet. 
              Using advanced hand tracking technology and AI, we provide real-time feedback on your hand signs, 
              making learning both fun and effective.
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Get started by allowing camera access and following the on-screen instructions. 
              Practice at your own pace and improve your signing skills!
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Practice Area</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Position your hand in front of the camera and make signs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HandTrackerWrapper />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
