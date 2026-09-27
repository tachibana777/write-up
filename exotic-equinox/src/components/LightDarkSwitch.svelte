<script lang="ts">
import { DARK_MODE, LIGHT_MODE } from "@constants/constants.ts";
import Icon from "@iconify/svelte";
import {
	getStoredTheme,
	setTheme,
} from "@utils/setting-utils.ts";
import { onMount } from "svelte";
import type { LIGHT_DARK_MODE } from "@/types/config.ts";

let mode: LIGHT_DARK_MODE = $state(DARK_MODE);

onMount(() => {
	const stored = getStoredTheme();
	mode = stored === LIGHT_MODE ? LIGHT_MODE : DARK_MODE;
	setTheme(mode);
});

function switchScheme(newMode: LIGHT_DARK_MODE) {
	if (mode === newMode) return;
	mode = newMode;
	setTheme(newMode, true);
}

function toggleScheme() {
	switchScheme(mode === DARK_MODE ? LIGHT_MODE : DARK_MODE);
}
</script>

<button
	aria-label="Light/Dark Mode"
	class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 flex items-center justify-center"
	id="scheme-switch"
	onclick={toggleScheme}
>
	<div class="absolute" class:opacity-0={mode !== LIGHT_MODE}>
		<Icon icon="material-symbols:wb-sunny-outline-rounded" class="text-[1.25rem]"></Icon>
	</div>
	<div class="absolute" class:opacity-0={mode !== DARK_MODE}>
		<Icon icon="material-symbols:dark-mode-outline-rounded" class="text-[1.25rem]"></Icon>
	</div>
</button>
