import * as React from "react"
import { cn } from "../../lib/utils"

interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> { }

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "min-h-screen w-full relative font-sans antialiased flex flex-col overflow-x-hidden",
                className
            )}
            {...props}
        />
    )
)
Layout.displayName = "Layout"

const Main = React.forwardRef<HTMLDivElement, LayoutProps>(
    ({ className, ...props }, ref) => (
        <main
            ref={ref}
            className={cn("flex-1 container mx-auto px-4 py-8", className)}
            {...props}
        />
    )
)
Main.displayName = "Main"

export { Layout, Main }
