import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code
	document.documentElement.setAttribute(
		"data-theme",
		expressiveCodeConfig.theme,
	);
}

export function setTheme(theme: LIGHT_DARK_MODE, withTransition = false): void {
	localStorage.setItem("theme", theme);

	if (
		!withTransition ||
		typeof document === "undefined" ||
		!("startViewTransition" in document) ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		applyThemeToDocument(theme);
		return;
	}

	// @ts-ignore
	const transition = document.startViewTransition(() => {
		applyThemeToDocument(theme);
	});

	transition.ready.then(() => {
		document.documentElement.animate(
			{
				clipPath: [
					"polygon(-100% -100%, 95% -100%, -100% 95%)",
					"polygon(-100% -100%, 305% -100%, -100% 305%)",
				],
			},
			{
				duration: 550,
				easing: "cubic-bezier(0.4, 0, 0.2, 1)",
				pseudoElement: "::view-transition-new(root)",
			},
		);
	});
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}
