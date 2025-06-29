import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Formats a 24-hour time string to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "14:30")
 * @returns string - Time in 12-hour format (e.g., "2:30 PM")
 */
export function formatTime12Hour(time24: string): string {
	const [hours, minutes] = time24.split(':');
	const hour24 = parseInt(hours, 10);
	const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
	const period = hour24 >= 12 ? 'PM' : 'AM';
	return `${hour12}:${minutes} ${period}`;
}

/**
 * Validates an email address format
 * @param email - The email address to validate
 * @returns boolean - True if the email format is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}
