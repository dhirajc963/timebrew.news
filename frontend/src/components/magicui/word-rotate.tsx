"use client";

import { AnimatePresence, motion, MotionProps } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface WordRotateProps {
	words: string[];
	duration?: number;
	motionProps?: MotionProps;
	className?: string;
	/**
	 * When true, renders as an inline element without the container div
	 * @default false
	 */
	inline?: boolean;
}

export function WordRotate({
	words,
	duration = 2500,
	motionProps = {
		initial: { opacity: 0, y: -50 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: 50 },
		transition: { duration: 0.25, ease: "easeOut" },
	},
	className,
	inline = false,
}: WordRotateProps) {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setIndex((prevIndex) => (prevIndex + 1) % words.length);
		}, duration);

		// Clean up interval on unmount
		return () => clearInterval(interval);
	}, [words, duration]);

	// If inline mode is enabled, render without the container div
	if (inline) {
		return (
			<AnimatePresence mode="wait">
				<motion.span
					key={words[index]}
					className={cn("inline-block", className)}
					{...motionProps}
				>
					{words[index]}
				</motion.span>
			</AnimatePresence>
		);
	}

	// Otherwise, use the original container div for block-level styling
	return (
		<div className="overflow-hidden py-2">
			<AnimatePresence mode="wait">
				<motion.h1
					key={words[index]}
					className={cn(className)}
					{...motionProps}
				>
					{words[index]}
				</motion.h1>
			</AnimatePresence>
		</div>
	);
}
