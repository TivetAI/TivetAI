/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./src/**/components/**/*.{ts,tsx}",
		"./src/layouts/**/*.{ts,tsx}",
		"./src/forms/**/*.{ts,tsx}",
		"./src/lib/**/*.{ts,tsx}",
		"./src/**/hooks/**/*.{ts,tsx}",
		"./src/**/forms/**/*.{ts,tsx}",
		"./src/**/layouts/**/*.{ts,tsx}",
		"./src/**/views/**/*.{ts,tsx}",
		"./src/**/routes/**/*.{ts,tsx}",
		"../../../node_modules/@tivet-gg/components/**/*.{ts,tsx}",
	],
	presets: [require("@tivet-gg/components/tailwind-base")],
};
