"use client";

import { cn } from "@/lib/utils";
import { motion, MotionProps } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TypingAnimationProps extends MotionProps {
	children: string;
	className?: string;
	duration?: number;
	delay?: number;
	as?: React.ElementType;
	startOnView?: boolean;
}

export function TypingAnimation({
	children,
	className,
	duration = 100,
	delay = 0,
	as: Component = "div",
	startOnView = false,
	...props
}: TypingAnimationProps) {
	const MotionComponent = motion.create(Component, {
		forwardMotionProps: true,
	});

	const [displayedText, setDisplayedText] = useState<string>("");
	const [started, setStarted] = useState(false);
	const elementRef = useRef<HTMLElement | null>(null);

	// trigger start
	useEffect(() => {
		if (!startOnView) {
			const tid = setTimeout(() => setStarted(true), delay);
			return () => clearTimeout(tid);
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setTimeout(() => setStarted(true), delay);
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);
		if (elementRef.current) observer.observe(elementRef.current);
		return () => observer.disconnect();
	}, [delay, startOnView]);

	// typing effect
	useEffect(() => {
		if (!started) return;
		let i = 0;
		const iv = setInterval(() => {
			if (i < children.length) {
				setDisplayedText(children.substring(0, i + 1));
				i++;
			} else {
				clearInterval(iv);
			}
		}, duration);
		return () => clearInterval(iv);
	}, [children, duration, started]);

	return (
		<MotionComponent
			ref={elementRef}
			className={cn(
				// responsive font sizing
				"text-base sm:text-lg md:text-xl lg:text-2xl xl:text-4xl",
				// keep bold, tracking
				"font-bold tracking-[-0.02em]",
				// responsive line-height
				"leading-snug lg:leading-tight",
				className
			)}
			{...props}
		>
			{displayedText}
		</MotionComponent>
	);
}
