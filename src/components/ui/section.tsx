import React from 'react';
import { cn } from "../../lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    id?: string;
    className?: string;
    background?: string; // Optional background image URL
    overlay?: boolean;   // Optional overlay for better text contrast
}

const Section: React.FC<SectionProps> = ({
    children,
    id,
    className,
    background,
    overlay = false,
    ...props
}) => {
    return (
        <section
            id={id}
            className={cn(
                "relative w-full py-24 md:py-32 overflow-hidden", // Increased vertical padding for modern feel
                className
            )}
            style={background ? {
                backgroundImage: `url(${background})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed' // Modern parallax feel for all sections if bg is present
            } : undefined}
            {...props}
        >
            {/* Optional Overlay */}
            {overlay && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            )}

            {/* Content Container - Locked with full border for visual limits */}
            <div className="relative mx-auto w-full max-w-[1280px] px-4 md:px-8 z-10 border-2 border-red-600 bg-red-500/5">
                {children}
            </div>
        </section>
    );
};

export default Section;
